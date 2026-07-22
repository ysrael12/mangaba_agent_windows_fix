# SPEC: Suporte a OCR no RAG (`mangaba_rag`)

> **Escopo:** o mecanismo de RAG do projeto (`plugins/memory/mangaba_rag/`)
> hoje não reconhece imagens — nem enviadas diretamente, nem embutidas em
> PDFs escaneados. Este documento planeja a adição de extração de texto via
> OCR para esses dois casos, reaproveitando os padrões de soft-dependency
> já usados em `tools/vision_tools.py`.

---

## Estado Atual (confirmado no código)

- O RAG é **TF-IDF puro em memória**, sem vector DB (`plugins/memory/mangaba_rag/__init__.py`,
  comentário nas linhas 8-11: design deliberadamente leve, sem chromadb/torch/
  sentence-transformers). Índice persistido como JSON em
  `$MANGABA_HOME/rag/mangaba_ia_br.json`.
- Upload de documentos: `POST /api/rag/upload` em `mangaba_cli/web_server.py`
  (~linha 1978-2027). Extensões aceitas hoje: `_RAG_UPLOAD_EXTS = {".txt", ".md", ".pdf"}`,
  limite de 10 MB (`_RAG_MAX_UPLOAD_BYTES`).
- PDF é extraído via PyMuPDF (`extract_pdf_text`, `plugins/memory/mangaba_rag/__init__.py:308-322`).
  Quando o PDF não tem texto extraível (escaneado / só imagens), a função
  **levanta `ValueError` explícito**:
  ```python
  raise ValueError(
      "Não foi possível extrair texto do PDF. "
      "O arquivo pode conter apenas imagens ou estar escaneado."
  )
  ```
  Coberto pelo teste `test_empty_pdf_raises` em
  `tests/plugins/memory/test_mangaba_rag.py:158-169`.
- Extensões de imagem (`.png/.jpg/...`) são **rejeitadas com HTTP 400** antes
  de qualquer processamento — nunca chegam a ser lidas.
- Já existe um pipeline de visão **desacoplado do RAG**: `tools/vision_tools.py`
  (`vision_analyze_tool`) baixa uma imagem, redimensiona com Pillow (soft
  dependency, com cap de decodificação `_MAX_DECODE_PIXELS = 40_000_000` contra
  decompression bombs) e chama um LLM multimodal via
  `agent/auxiliary_client.py` para *descrever* a imagem — não extrai texto
  literal, e não grava nada no índice RAG.
- `PyMuPDF==1.25.4` é a única lib de parsing de documento no `pyproject.toml`.
  Pillow é soft-dependency (não obrigatória). Não há nenhuma lib de OCR
  (pytesseract/easyocr/etc.) no projeto hoje.

---

## Objetivo

Permitir que o RAG extraia texto útil de:
1. **Imagens enviadas diretamente** (`.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`)
   via `/api/rag/upload`.
2. **PDFs escaneados** (páginas que são só imagem, sem camada de texto) —
   hoje falham com o `ValueError` acima; devem cair num fallback de OCR
   página a página em vez de rejeitar o arquivo inteiro.

Sem quebrar a filosofia do módulo (leve, dependências opcionais, degradação
graciosa quando a dependência não está instalada).

---

## Decisão: motor de OCR

| Opção | Peso | Qualidade PT-BR | Requer binário externo | Custo por chamada |
|---|---|---|---|---|
| `pytesseract` (wrapper do Tesseract) | leve (lib Python fina) | boa com `tesseract-ocr-por` instalado | **sim** — binário `tesseract` do sistema | grátis, local, CPU |
| `easyocr` | pesado (traz PyTorch) | boa | não (modelo baixado on-demand) | grátis, local, CPU/GPU, mas contraria a filosofia "sem torch" do RAG |
| Reusar `vision_analyze_tool` (LLM multimodal) | zero deps novas | ótima, entende layout/contexto | não | **pago**, 1 chamada de API por imagem/página, mais lento |
| Serviço cloud OCR (Google Vision, Azure) | zero deps novas | ótima | não | pago, requer credenciais extra, nova integração externa |

**Decisão:** `pytesseract` como motor **primário** (consistente com a
filosofia "sem chromadb/torch" documentada no próprio módulo), com Pillow
como pré-requisito (já é soft-dep no projeto). Ambos tratados como
**soft dependencies opcionais**, no mesmo padrão de `tools/vision_tools.py`:
se `pytesseract` ou o binário `tesseract` do sistema não estiverem
disponíveis, o upload/reindex não quebra — cai num erro claro pedindo a
instalação, e (se configurado) tenta o **fallback via `vision_analyze_tool`**
(LLM multimodal) em vez de falhar, já que esse pipeline já existe e é pago
apenas sob demanda.

`easyocr` e serviços cloud ficam fora de escopo (peso/custo/nova integração
não justificados pelo caso de uso).

---

## Arquitetura da Solução

```
Upload (.png/.jpg/...)  ──┐
                           ├─► extract_image_text(bytes) ─► texto ─► ingest_upload(..., source="upload")
PDF escaneado (fallback) ──┘        │
                                     ├─ tenta pytesseract (local, grátis)
                                     └─ se indisponível E ocr_fallback_llm=true:
                                            tenta vision_analyze_tool (LLM, pago)
```

### Novo módulo: `plugins/memory/mangaba_rag/ocr.py`

Isola a lógica de OCR do `__init__.py` (que já tem 554 linhas), seguindo o
padrão de `extract_pdf_text` mas com fallback:

```python
def extract_image_text(content: bytes, *, filename: str = "") -> str:
    """Extrai texto de uma imagem via OCR (pytesseract) com fallback opcional
    para descrição via LLM multimodal quando o Tesseract não está disponível.

    Levanta OcrUnavailableError se nenhum motor puder processar a imagem.
    """
```

Responsabilidades:
- Decodificar a imagem com Pillow, aplicando o mesmo cap de
  `_MAX_DECODE_PIXELS` usado em `vision_tools.py` (reusar a constante, não
  duplicar — extrair para um util compartilhado, ex.
  `tools/image_limits.py`, se ainda não existir algo equivalente).
- Rodar `pytesseract.image_to_string(img, lang="por+eng")` (idioma
  configurável, ver seção Config).
- Se `pytesseract`/binário Tesseract ausente (`pytesseract.TesseractNotFoundError`
  ou `ImportError`):
  - Se `MANGABA_RAG_OCR_FALLBACK_LLM=true` (ver Config): delega para
    `vision_analyze_tool` pedindo explicitamente "transcreva todo o texto
    visível nesta imagem, literalmente, sem comentários" — trata o retorno
    como o texto extraído.
  - Caso contrário: levanta erro claro e acionável (ex.: "OCR indisponível:
    instale Tesseract (`apt install tesseract-ocr tesseract-ocr-por` /
    `choco install tesseract`) ou habilite `MANGABA_RAG_OCR_FALLBACK_LLM`.").
- Trunca resultado em `MAX_UPLOAD_CHARS` (reusar constante existente).
- Se o texto extraído for vazio/curto demais (< ~10 chars úteis após strip),
  levanta `ValueError` com mensagem equivalente à de `extract_pdf_text`
  ("imagem sem texto legível") — mesmo contrato de erro que o PDF já tem,
  para o frontend tratar igual.

### Extensão de `extract_pdf_text` para fallback OCR por página

Hoje `extract_pdf_text` (linha 308-322) falha inteiro se `result` vier vazio.
Nova versão:

```python
def extract_pdf_text(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    texts = []
    for page in doc:
        page_text = page.get_text().strip()
        if not page_text and _ocr_enabled():
            pix = page.get_pixmap(dpi=200)  # renderiza página como imagem
            page_text = _safe_ocr(pix.tobytes("png"))  # não propaga erro de página individual
        texts.append(page_text)
    doc.close()
    result = "\n".join(t for t in texts if t).strip()
    if not result:
        raise ValueError(...)  # mensagem atual, sem mudança
    return result[:MAX_UPLOAD_CHARS]
```

Notas de design:
- OCR por página só roda em páginas **sem** texto nativo — PDFs mistos
  (algumas páginas nativas, outras escaneadas) ficam eficientes.
- `_ocr_enabled()` checa uma flag de config (ver abaixo) — por padrão OCR de
  PDF fica **desligado** (rasterizar todas as páginas sem texto pode ser
  lento em PDFs grandes); precisa ser opt-in explícito.
- Falha de OCR numa página individual não deve derrubar o upload inteiro —
  loga um warning e segue com página vazia; só falha no fim se **nenhuma**
  página produziu texto (mesmo comportamento atual).

### `web_server.py`: extensões aceitas

```python
_RAG_UPLOAD_EXTS = {".txt", ".md", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
```

Dispatch (hoje `.pdf → extract_pdf_text`, resto → decode utf-8 direto, em
`web_server.py:2007-2018`) ganha um terceiro ramo:

```python
elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}:
    text = ocr.extract_image_text(raw, filename=filename)
```

Erros de `OcrUnavailableError`/`ValueError` devem virar HTTP 400 com a
mensagem, igual ao tratamento atual de PDF sem texto (checar como o handler
atual já mapeia `ValueError` de `extract_pdf_text` para resposta HTTP e
replicar).

### Metadados do chunk

Adicionar um campo `via_ocr: bool` nos chunks originados de OCR (imagem
direta ou fallback de página de PDF), para o frontend poder sinalizar
"texto extraído por OCR, pode conter erros de reconhecimento" — a qualidade de
OCR é inferior a texto nativo, vale ser transparente na UI de busca/citação.
Não quebra o schema existente (campo novo opcional, `_build_index`/`_search`
não precisam mudar — é só metadado extra copiado do chunk de entrada).

---

## Configuração Nova

Seguir o padrão de env vars já usado no projeto
(`MANGABA_MAX_IMAGE_PIXELS`, `MANGABA_VISION_DOWNLOAD_TIMEOUT`):

| Variável | Default | Descrição |
|---|---|---|
| `MANGABA_RAG_OCR_LANG` | `"por+eng"` | Idiomas do Tesseract (precisa dos traineddata instalados) |
| `MANGABA_RAG_OCR_PDF_ENABLED` | `false` | Habilita fallback de OCR por página em PDF escaneado (opt-in, custo de performance) |
| `MANGABA_RAG_OCR_FALLBACK_LLM` | `false` | Se Tesseract ausente, tenta `vision_analyze_tool` (custo de API) em vez de falhar |
| `MANGABA_RAG_OCR_MAX_PAGES` | `50` | Teto de páginas rasterizadas por PDF, evita custo O(n) em documentos gigantes |

---

## Dependências

- `pyproject.toml`: adicionar `pytesseract` como dependência **opcional**
  (extra, ex. `[project.optional-dependencies] ocr = ["pytesseract", "Pillow"]`),
  não como dependência obrigatória — mesma filosofia de Pillow hoje.
- Documentar no README/instalador que o binário `tesseract` precisa ser
  instalado separadamente pelo SO (não é pip-installable):
  - Windows: `choco install tesseract` ou instalador oficial UB-Mannheim.
  - Linux: `apt install tesseract-ocr tesseract-ocr-por`.
  - macOS: `brew install tesseract tesseract-lang`.
- Isso é relevante para o instalador Windows planejado em `SPEC_INSTALLER.md`
  — se o OCR virar feature "always on" no futuro, o instalador Inno Setup
  precisaria empacotar o Tesseract portátil (mesmo padrão de decisão do
  Node.js documentado lá). **Fora de escopo aqui**: nesta primeira fase OCR
  é opt-in/degradação graciosa, não requisito de instalação.

---

## Testes

Seguir o padrão de `tests/plugins/memory/test_mangaba_rag.py`
(fixture `isolate_mangaba_home`, `pytest.importorskip` para deps opcionais):

- `TestExtractImageText` (novo, mesmo arquivo ou `test_ocr.py` ao lado):
  - `pytest.importorskip("pytesseract")` no topo da classe.
  - Imagem sintética com texto renderizado (gerar via Pillow `ImageDraw` em
    memória, sem depender de asset externo) → confirma texto extraído.
  - Imagem em branco/ruído → levanta `ValueError` ("sem texto legível").
  - Mock de `pytesseract.TesseractNotFoundError` → confirma mensagem
    acionável quando `MANGABA_RAG_OCR_FALLBACK_LLM=false`.
  - Mock do fallback LLM quando `MANGABA_RAG_OCR_FALLBACK_LLM=true` e
    Tesseract ausente → confirma que `vision_analyze_tool` é chamado e seu
    retorno vira o texto do chunk.
- Estender `TestExtractPdfText`:
  - PDF com página só-imagem + `MANGABA_RAG_OCR_PDF_ENABLED=true` → confirma
    que o texto vem do OCR da página rasterizada.
  - Mesmo PDF com a flag `false` (default) → confirma que o comportamento
    atual (`ValueError`) é preservado — **não quebrar o teste existente
    `test_empty_pdf_raises`**.
- `tests/mangaba_cli/`: não há teste de integração HTTP do endpoint de
  upload hoje — se adicionar, criar `test_web_server_rag_upload.py` cobrindo
  o novo ramo `elif ext in {...}` com uma imagem de teste.

---

## Riscos e Limitações

- **Qualidade do OCR** varia com resolução/contraste da imagem — sem
  pré-processamento (binarização, deskew) nesta primeira fase; se a
  qualidade for insuficiente na prática, avaliar `opencv-python` para
  pré-processamento numa fase 2 (não incluído aqui para não inchar deps).
- **Tesseract não é pip-installable** — usuários sem o binário do sistema
  não têm OCR local até instalar manualmente ou habilitar o fallback LLM
  (que tem custo). Isso deve ficar claro na mensagem de erro e na doc.
- **Custo de tempo**: rasterizar páginas de PDF em 200 DPI e rodar OCR é
  ordens de magnitude mais lento que extração de texto nativo — por isso
  `MANGABA_RAG_OCR_PDF_ENABLED` é opt-in e `MANGABA_RAG_OCR_MAX_PAGES` limita
  o pior caso.
- **Decompression bomb**: já mitigado reusando o cap `_MAX_DECODE_PIXELS`
  de `tools/vision_tools.py` — precisa ser extraído para local compartilhado
  em vez de duplicado.
- **Custo de API** se `MANGABA_RAG_OCR_FALLBACK_LLM=true`: cada imagem sem
  Tesseract dispara uma chamada de LLM multimodal (mesmo custo de
  `vision_analyze_tool` hoje) — default `false` evita surpresa de custo.

---

## Fases de Implementação

1. **Fase 1 — imagem direta via upload**: `ocr.py` com `extract_image_text`
   (só pytesseract, sem fallback LLM ainda), nova extensão em
   `_RAG_UPLOAD_EXTS`, dispatch em `web_server.py`, testes.
2. **Fase 2 — fallback LLM** quando Tesseract ausente
   (`MANGABA_RAG_OCR_FALLBACK_LLM`), reusando `vision_analyze_tool`.
3. **Fase 3 — PDF escaneado** (`MANGABA_RAG_OCR_PDF_ENABLED`, OCR por
   página com `MANGABA_RAG_OCR_MAX_PAGES`).
4. **Fase 4 (opcional/futuro)** — pré-processamento de imagem para melhorar
   qualidade de OCR, e/ou empacotamento do Tesseract portátil no instalador
   Windows (`SPEC_INSTALLER.md`) se o recurso virar "always on".
