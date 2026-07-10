"""Mangaba RAG — camada de conhecimento sobre o conteúdo de mangaba.ia.br.

Provider de memória *context-only* (não expõe ferramentas). Antes de cada
turno, recupera os trechos mais relevantes da base de conhecimento construída
a partir do site oficial e injeta como contexto. Funciona em todos os canais
(chat do dashboard, Telegram, Discord) sem mudanças no agente.

Design deliberadamente leve — sem chromadb/torch/sentence-transformers:
  • Ingestão: httpx + html.parser (stdlib) → texto limpo → chunks.
  • Recuperação: TF-IDF + cosseno em memória (numpy). Offline, baixa latência.

A base fica em ``$MANGABA_HOME/rag/mangaba_ia_br.json`` e é (re)construída por
:func:`reindex` — exposta via ``mangaba rag reindex`` e na aba de Memória do
dashboard.
"""

from __future__ import annotations

import json
import logging
import math
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from agent.memory_provider import MemoryProvider

logger = logging.getLogger(__name__)

# Configuração da ingestão -------------------------------------------------
SOURCE_BASE = "https://www.mangaba.ia.br"
SOURCE_LABEL = "mangaba.ia.br"
INDEX_FILENAME = "mangaba_ia_br.json"
CHUNK_CHARS = 700          # tamanho-alvo de cada trecho
CHUNK_OVERLAP = 120        # sobreposição entre trechos
MAX_PAGES = 25             # teto de páginas a rastrear
TOP_K = 4                  # trechos injetados por turno
MIN_SCORE = 0.04           # similaridade mínima para injetar

# Stopwords PT/EN para o TF-IDF (curta, suficiente para um site institucional).
_STOP = set(
    "a o e de da do das dos para por com sem que se na no nas nos um uma uns "
    "umas as os ao aos à às em é são ser foi era como mais menos muito mas ou "
    "the of and to in for on is are be was with you your we our this that it "
    "as at by from or an".split()
)

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def _rag_dir() -> Path:
    from mangaba_agent.mangaba_constants import get_mangaba_home

    d = get_mangaba_home() / "rag"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _index_path() -> Path:
    return _rag_dir() / INDEX_FILENAME


def _load_index_raw() -> Dict[str, Any]:
    """Lê o índice salvo em disco sem popular o provider. `{}` se não existir."""
    path = _index_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


# ── Extração de HTML ───────────────────────────────────────────────────────
class _TextExtractor(HTMLParser):
    """Extrai texto visível e links, ignorando script/style/svg."""

    _SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.parts: List[str] = []
        self.links: List[str] = []
        self.title: str = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag in self._SKIP:
            self._skip_depth += 1
        if tag == "title":
            self._in_title = True
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.links.append(v)

    def handle_endtag(self, tag: str) -> None:
        if tag in self._SKIP and self._skip_depth:
            self._skip_depth -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
            return
        if self._skip_depth:
            return
        d = data.strip()
        if d:
            self.parts.append(d)
        elif data and data != "":
            # espaço entre letras de títulos animados (Framer) — preserva o
            # limite de palavra para o merge de fragmentos.
            self.parts.append(" ")


def _merge_split_letters(parts: List[str]) -> List[str]:
    """Framer renderiza títulos animados letra-a-letra. Junta sequências de
    fragmentos de 1 caractere em palavras/frases coerentes."""
    out: List[str] = []
    buf: List[str] = []
    for p in parts:
        if len(p) == 1:  # caractere isolado (inclui o espaço entre letras)
            buf.append(p)
            continue
        if buf:
            joined = "".join(buf).strip()
            if joined:
                out.append(joined)
            buf = []
        out.append(p)
    if buf:
        joined = "".join(buf).strip()
        if joined:
            out.append(joined)
    return out


def _clean_text(parts: List[str]) -> str:
    parts = _merge_split_letters(parts)
    # Framer renderiza cada bloco várias vezes (2x + variantes responsivas).
    # Deduplica linhas globalmente por uma chave normalizada.
    deduped: List[str] = []
    seen: set = set()
    for p in parts:
        key = re.sub(r"\W+", "", p.lower())
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)
    text = "\n".join(deduped)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _fetch(url: str) -> Optional[str]:
    import httpx

    try:
        r = httpx.get(
            url,
            follow_redirects=True,
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (MangabaRAG/1.0)"},
        )
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", "text/html"):
            return r.text
    except Exception as e:  # pragma: no cover - rede
        logger.debug("RAG fetch falhou em %s: %s", url, e)
    return None


def _crawl() -> List[Dict[str, str]]:
    """Rastreia o site e retorna [{url, title, text}]."""
    base_host = urlparse(SOURCE_BASE).netloc
    to_visit = [SOURCE_BASE, SOURCE_BASE + "/", SOURCE_BASE + "/blog"]
    visited: set = set()
    pages: List[Dict[str, str]] = []

    while to_visit and len(pages) < MAX_PAGES:
        url = to_visit.pop(0).split("#")[0].split("?")[0].rstrip("/") or SOURCE_BASE
        if url in visited:
            continue
        visited.add(url)
        html = _fetch(url)
        if not html:
            continue
        ex = _TextExtractor()
        try:
            ex.feed(html)
        except Exception:
            continue
        text = _clean_text(ex.parts)
        if len(text) >= 80:
            pages.append({"url": url, "title": (ex.title or SOURCE_LABEL).strip(), "text": text})
        for href in ex.links:
            u = urljoin(url, href).split("#")[0].split("?")[0].rstrip("/")
            if urlparse(u).netloc == base_host and u not in visited and u not in to_visit:
                to_visit.append(u)
    return pages


def _chunk(text: str) -> List[str]:
    text = text.strip()
    if len(text) <= CHUNK_CHARS:
        return [text] if text else []
    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + CHUNK_CHARS, n)
        # tenta cortar em quebra de linha/espaço próximo do fim
        if end < n:
            window = text.rfind("\n", start, end)
            if window <= start:
                window = text.rfind(" ", start, end)
            if window > start:
                end = window
        chunks.append(text[start:end].strip())
        if end >= n:
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return [c for c in chunks if c]


def _tokenize(text: str) -> List[str]:
    return [
        t
        for t in _TOKEN_RE.findall(text.lower())
        if len(t) > 1 and t not in _STOP
    ]


# ── Ingestão / construção do índice ────────────────────────────────────────
def _build_index(chunks: List[Dict[str, Any]], pages: int) -> Dict[str, Any]:
    """Constrói o índice TF-IDF a partir de uma lista de chunks {url,title,text}.

    Compartilhado entre o crawler (`reindex`) e o upload de documentos
    (`ingest_upload`) — os dois populam a mesma base, só a origem dos chunks
    (`source: "crawl" | "upload"`) muda.
    """
    docs_tokens = [_tokenize(c["text"]) for c in chunks]
    df: Dict[str, int] = {}
    for toks in docs_tokens:
        for t in set(toks):
            df[t] = df.get(t, 0) + 1
    n_docs = max(len(chunks), 1)
    idf = {t: math.log((1 + n_docs) / (1 + dfi)) + 1.0 for t, dfi in df.items()}

    for c, toks in zip(chunks, docs_tokens):
        tf: Dict[str, float] = {}
        for t in toks:
            tf[t] = tf.get(t, 0.0) + 1.0
        vec = {t: (1.0 + math.log(f)) * idf.get(t, 0.0) for t, f in tf.items()}
        norm = math.sqrt(sum(w * w for w in vec.values())) or 1.0
        c["vec"] = {t: w / norm for t, w in vec.items()}

    return {
        "source": SOURCE_BASE,
        "label": SOURCE_LABEL,
        "built_at": int(time.time()),
        "pages": pages,
        "chunks": chunks,
        "idf": idf,
    }


def reindex() -> Dict[str, Any]:
    """(Re)constrói a base a partir do site. Preserva uploads já indexados."""
    pages = _crawl()
    raw_chunks: List[Dict[str, str]] = []
    for pg in pages:
        for c in _chunk(pg["text"]):
            raw_chunks.append({"url": pg["url"], "title": pg["title"], "text": c, "source": "crawl"})

    # remove chunks duplicados (mesmo texto)
    seen: set = set()
    chunks: List[Dict[str, str]] = []
    for c in raw_chunks:
        key = c["text"][:200]
        if key in seen:
            continue
        seen.add(key)
        chunks.append(c)

    # O crawler só re-rastreia o site — documentos enviados pelo usuário
    # (`source: "upload"`) sobrevivem ao reindex.
    upload_chunks = [c for c in (_load_index_raw().get("chunks") or []) if c.get("source") == "upload"]

    index = _build_index(chunks + upload_chunks, len(pages))
    path = _index_path()
    path.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    logger.info(
        "RAG mangaba.ia.br reindexado: %d páginas, %d chunks (+%d de uploads)",
        len(pages), len(chunks), len(upload_chunks),
    )
    return {"pages": len(pages), "chunks": len(chunks) + len(upload_chunks), "path": str(path)}


def extract_pdf_text(content: bytes) -> str:
    """Extrai texto de um PDF binário usando PyMuPDF."""
    import fitz  # PyMuPDF
    doc = fitz.open(stream=content, filetype="pdf")
    texts: list[str] = []
    for page in doc:
        texts.append(page.get_text())
    doc.close()
    result = "\n".join(texts).strip()
    if not result:
        raise ValueError(
            "Não foi possível extrair texto do PDF. "
            "O arquivo pode conter apenas imagens ou estar escaneado."
        )
    return result[:MAX_UPLOAD_CHARS]


MAX_UPLOAD_CHARS = 400_000  # teto de segurança por arquivo enviado


def ingest_upload(filename: str, text: str) -> Dict[str, Any]:
    """Indexa um documento enviado pelo usuário (.txt/.md) na base RAG.

    Reaproveita o mesmo pipeline de chunking + TF-IDF do crawler. Reenviar o
    mesmo nome de arquivo substitui a versão anterior (não duplica).
    """
    text = text.strip()[:MAX_UPLOAD_CHARS]
    if not text:
        raise ValueError("Arquivo vazio ou sem texto extraível.")

    url = f"upload://{filename}"
    new_chunks = [
        {"url": url, "title": filename, "text": c, "source": "upload"}
        for c in _chunk(text)
    ]
    if not new_chunks:
        raise ValueError("Não foi possível extrair trechos do arquivo.")

    existing = _load_index_raw()
    prior_chunks = [c for c in (existing.get("chunks") or []) if c.get("url") != url]
    all_chunks = prior_chunks + new_chunks

    index = _build_index(all_chunks, int(existing.get("pages") or 0))
    _index_path().write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    logger.info("RAG upload indexado: %s (%d chunks)", filename, len(new_chunks))
    return {"filename": filename, "chunks": len(new_chunks), "total_chunks": len(all_chunks)}


def list_uploaded_files() -> List[Dict[str, Any]]:
    """Lista os documentos enviados pelo usuário já indexados (nome + nº de chunks)."""
    by_file: Dict[str, int] = {}
    for c in _load_index_raw().get("chunks") or []:
        if c.get("source") != "upload":
            continue
        name = c.get("title") or c.get("url", "")
        by_file[name] = by_file.get(name, 0) + 1
    return [{"name": name, "chunks": n} for name, n in sorted(by_file.items())]


def remove_uploaded_file(filename: str) -> bool:
    """Remove um documento enviado da base RAG. `False` se não encontrado."""
    url = f"upload://{filename}"
    existing = _load_index_raw()
    chunks = existing.get("chunks") or []
    remaining = [c for c in chunks if c.get("url") != url]
    if len(remaining) == len(chunks):
        return False
    index = _build_index(remaining, int(existing.get("pages") or 0))
    _index_path().write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    return True


# ── Provider ───────────────────────────────────────────────────────────────
class MangabaRAGProvider(MemoryProvider):
    """Injeta conhecimento de mangaba.ia.br em cada turno (context-only)."""

    def __init__(self) -> None:
        self._index: Optional[Dict[str, Any]] = None
        self._loaded = False

    @property
    def name(self) -> str:
        return "mangaba_rag"

    def is_available(self) -> bool:
        # Disponível assim que houver um índice construído em disco.
        return _index_path().exists()

    def initialize(self, session_id: str, **kwargs) -> None:
        self._load()

    def _load(self) -> None:
        self._loaded = True
        try:
            p = _index_path()
            if p.exists():
                self._index = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning("RAG: falha ao carregar índice: %s", e)
            self._index = None

    def _content_kinds(self) -> tuple[bool, bool]:
        """Return (has_crawl, has_upload) — which chunk sources are present."""
        chunks = (self._index or {}).get("chunks") or []
        has_crawl = any(c.get("source", "crawl") == "crawl" for c in chunks)
        has_upload = any(c.get("source") == "upload" for c in chunks)
        return has_crawl, has_upload

    def system_prompt_block(self) -> str:
        if not self._loaded:
            self._load()
        if not self._index or not self._index.get("chunks"):
            return ""
        has_crawl, has_upload = self._content_kinds()

        # Content-aware framing — the base once only held the mangaba.ia.br
        # crawl, but users can also upload their own documents (RAG uploads).
        # Hardcoding "mangaba.ia.br / produtos, framework e serviços" here
        # regardless of what's actually indexed mislabels user-uploaded
        # knowledge (e.g. a résumé or a compilers course PDF) as being about
        # the Mangaba company, which can bias the model's answers.
        if has_upload and not has_crawl:
            return (
                "## Base de conhecimento\n"
                "Você tem acesso a documentos enviados pelo usuário. Quando trechos "
                "relevantes forem fornecidos no contexto (bloco 'Conhecimento "
                "(trechos relevantes)'), use-os como fonte de verdade sobre o "
                "assunto desses documentos. Não invente informações que não "
                "estejam nesses trechos."
            )
        if has_upload and has_crawl:
            return (
                "## Base de conhecimento\n"
                "Você tem acesso ao conteúdo oficial de mangaba.ia.br e a "
                "documentos enviados pelo usuário. Quando trechos relevantes "
                "forem fornecidos no contexto (bloco 'Conhecimento (trechos "
                "relevantes)'), use-os como fonte de verdade — cada trecho indica "
                "sua origem. Não invente informações que não estejam nesses "
                "trechos."
            )
        return (
            "## Base de conhecimento Mangaba\n"
            "Você tem acesso ao conteúdo oficial de mangaba.ia.br. Quando trechos "
            "relevantes forem fornecidos no contexto (bloco 'Conhecimento "
            "(trechos relevantes)'), use-os como fonte de verdade sobre a "
            "Mangaba, seus produtos, framework e serviços. Não invente "
            "informações sobre a empresa que não estejam nesses trechos."
        )

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        if not self._loaded:
            self._load()
        if not self._index or not query or not query.strip():
            return ""
        results = self._search(query, TOP_K)
        if not results:
            return ""
        lines = ["Conhecimento (trechos relevantes):"]
        for score, c in results:
            src = c.get("url", SOURCE_BASE)
            lines.append(f"\n[{src}]\n{c['text'].strip()}")
        return "\n".join(lines)

    def _search(self, query: str, k: int) -> List[Tuple[float, Dict[str, Any]]]:
        idx = self._index or {}
        chunks = idx.get("chunks") or []
        idf = idx.get("idf") or {}
        q_tokens = _tokenize(query)
        if not q_tokens:
            return []
        tf: Dict[str, float] = {}
        for t in q_tokens:
            tf[t] = tf.get(t, 0.0) + 1.0
        qvec = {t: (1.0 + math.log(f)) * idf.get(t, 0.0) for t, f in tf.items()}
        norm = math.sqrt(sum(w * w for w in qvec.values())) or 1.0
        qvec = {t: w / norm for t, w in qvec.items()}

        scored: List[Tuple[float, Dict[str, Any]]] = []
        for c in chunks:
            cvec = c.get("vec") or {}
            # produto escalar sobre o menor dos vetores
            if len(qvec) <= len(cvec):
                dot = sum(w * cvec.get(t, 0.0) for t, w in qvec.items())
            else:
                dot = sum(w * qvec.get(t, 0.0) for t, w in cvec.items())
            if dot >= MIN_SCORE:
                scored.append((dot, c))
        scored.sort(key=lambda x: x[0], reverse=True)

        # Dedup de resultados: descarta trechos que se sobrepõem fortemente
        # a um já escolhido (efeito do overlap entre chunks).
        selected: List[Tuple[float, Dict[str, Any]]] = []
        chosen_sets: List[set] = []
        for score, c in scored:
            cset = set((c.get("vec") or {}).keys())
            if not cset:
                continue
            dup = False
            for prev in chosen_sets:
                inter = len(cset & prev)
                if inter / max(min(len(cset), len(prev)), 1) > 0.7:
                    dup = True
                    break
            if dup:
                continue
            selected.append((score, c))
            chosen_sets.append(cset)
            if len(selected) >= k:
                break
        return selected

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return []  # context-only

    def shutdown(self) -> None:
        self._index = None


def register(ctx) -> None:
    """Registra o provider de RAG da Mangaba no sistema de plugins."""
    ctx.register_memory_provider(MangabaRAGProvider())
