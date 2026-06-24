"""Decompositor determinístico de pedidos complexos — sem depender do modelo.

O gargalo do Mangaba em modelo local fraco é orquestração: o gemma não quebra um
pedido de vários passos em um plano confiável. Este módulo faz isso de forma
**determinística** (separadores, enumerações e verbos imperativos pt-BR), classifica
a complexidade de cada passo e sugere a skill/ferramenta — tudo sem LLM.

Dois usos:
  1. `/tarefa <pedido>` no canal → mostra o plano numerado e pede confirmação.
  2. Pré-injeção: quando chega um pedido complexo, o plano pronto é injetado no
     prompt do agente como um checklist, então o modelo só EXECUTA (não planeja).

Isso espelha o princípio de toda a base: mecanismos determinísticos cobrem o que
o modelo fraco não faz.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

# Verbos imperativos comuns (radical) que indicam uma ação/etapa.
_ACTION_STEMS = [
    "pesquis", "busc", "busq", "procur", "ger", "cri", "faç", "faz", "envi",
    "mand", "agend", "resum", "analis", "calcul", "baix", "list", "mont",
    "cobr", "emit", "organiz", "traduz", "escrev", "redij", "compar",
    "verific", "consult", "atualiz", "salv", "export", "import", "process",
    "revis", "triag", "encontr", "extrai", "extra", "leia", "abr", "instal",
    "escolh", "apag", "delet", "remov", "decid", "separ", "copi", "renome",
    "junt", "marc", "confirm", "responr", "respond", "avis", "lembr",
]

# Conectores que podem sobrar no INÍCIO de uma cláusula após a quebra.
_LEADING_CONNECTOR = re.compile(
    r"(?i)^\s*(?:e\s+depois|depois(?:\s+disso)?|ent[ãa]o|em\s+seguida|"
    r"por\s+(?:fim|[úu]ltimo)|ap[óo]s\s+isso|e\s+tamb[ée]m|tamb[ée]m|"
    r"a[íi]|da[íi]|e)\s+"
)

# Mapa palavra-chave → skill conhecida (sugestão determinística).
_SKILL_HINTS = [
    (re.compile(r"(?i)\bpix\b|cobran|pagamento|copia.?e.?cola"), "pix-cobranca"),
    (re.compile(r"(?i)nota\s*fiscal|nfe?\b|nfs-?e|nfc-?e|cnpj|cpf"), "nota-fiscal"),
    (re.compile(r"(?i)cat[aá]logo|produto|pre[çc]o|estoque"), "catalogo-produtos"),
    (re.compile(r"(?i)atend|cliente|venda|pedido"), "atendimento-completo"),
    (re.compile(r"(?i)follow.?up|lembr|cobrar de novo|retornar pro cliente"), "followup-cliente"),
    (re.compile(r"(?i)resum|sumari|tldr"), "resumo-estruturado"),
    (re.compile(r"(?i)\bpdf\b|documento|docx|planilha|xlsx|csv"), "resumo-estruturado"),
    (re.compile(r"(?i)revis|antes de (mandar|enviar)|conferir resposta"), "revisor-de-resposta"),
    (re.compile(r"(?i)lgpd|privacidade|dados pessoais"), "lgpd-atendimento"),
    (re.compile(r"(?i)triag|rote|classific|qual caminho"), "triagem-e-roteamento"),
]

# Separadores fortes que quase sempre marcam fronteira entre etapas.
_STRONG_SPLIT = re.compile(
    r"(?i)(?:\s*;\s*|\n+|"
    r"\s+e\s+depois\s+|\s+depois\s+(?:disso\s+)?|\s+ent[ãa]o\s+|"
    r"\s+em\s+seguida\s+|\s+por\s+(?:fim|último)\s+|\s+ap[óo]s\s+isso\s+|"
    r"\s+e\s+tamb[ée]m\s+|\s+,?\s*tamb[ée]m\s+)"
)

# Marcadores de lista numerada/bullet no começo de uma cláusula.
_LIST_MARKER = re.compile(r"^\s*(?:\d+[\.\)]|[-*•])\s+")


@dataclass
class Step:
    n: int
    text: str
    complexity: str = "baixa"   # baixa | media | alta
    skill: Optional[str] = None


def _has_action(clause: str) -> bool:
    low = clause.lower()
    return any(stem in low for stem in _ACTION_STEMS)


def _starts_with_action(segment: str) -> bool:
    """True se o trecho começa com um verbo de ação (até as 2 primeiras palavras).

    Cobre "gere ...", e também "me mande ..." / "me envie ..." (pronome + verbo).
    """
    toks = re.findall(r"[a-zà-ú]+", segment.lower())[:2]
    return any(any(stem in tok for stem in _ACTION_STEMS) for tok in toks)


def _split_on_action_commas(clause: str) -> List[str]:
    """Quebra "a, gere b, me mande c" em etapas, mas NÃO quebra vírgulas que
    não introduzem uma nova ação (ex.: "o cliente, que é importante")."""
    segments = [s.strip() for s in clause.split(",") if s.strip()]
    if len(segments) <= 1:
        return [clause.strip()]
    out: List[str] = [segments[0]]
    for seg in segments[1:]:
        if _starts_with_action(seg):
            out.append(seg)
        else:
            out[-1] = out[-1] + ", " + seg
    return out


def _suggest_skill(clause: str) -> Optional[str]:
    for pat, skill in _SKILL_HINTS:
        if pat.search(clause):
            return skill
    return None


def _classify(clause: str) -> str:
    low = clause.lower()
    verbs = sum(1 for stem in _ACTION_STEMS if stem in low)
    has_tool = _suggest_skill(clause) is not None or bool(
        re.search(r"(?i)\b(pdf|csv|planilha|web|site|email|e-mail|api|arquivo)\b", clause)
    )
    if verbs >= 2:
        return "alta"
    if has_tool or verbs == 1 and len(clause) > 60:
        return "media"
    return "baixa"


def _split_clauses(text: str) -> List[str]:
    """Quebra o pedido em cláusulas candidatas a etapa."""
    # 1) Quebra por linhas/listas primeiro.
    raw_lines: List[str] = []
    for line in text.splitlines():
        line = _LIST_MARKER.sub("", line.strip())
        if line:
            raw_lines.append(line)
    if not raw_lines:
        raw_lines = [text.strip()]

    # 2) Em cada linha, quebra por separadores fortes, depois por vírgulas que
    #    introduzem uma nova ação.
    clauses: List[str] = []
    for line in raw_lines:
        parts = [p.strip(" .;") for p in _STRONG_SPLIT.split(line) if p and p.strip(" .;")]
        for part in (parts or [line]):
            clauses.extend(_split_on_action_commas(part))

    # 3) Se ficou tudo numa cláusula só mas há vários verbos ligados por " e ",
    #    tenta uma quebra conservadora por " e " entre trechos com ação.
    if len(clauses) == 1 and _has_action(clauses[0]):
        candidate = re.split(r"(?i)\s+e\s+", clauses[0])
        if len(candidate) > 1 and sum(1 for c in candidate if _has_action(c)) >= 2:
            clauses = [c.strip(" ,.;") for c in candidate if c.strip(" ,.;")]

    # 4) Remove conectores que sobraram no início de cada cláusula.
    cleaned = []
    for c in clauses:
        c = _LEADING_CONNECTOR.sub("", c).strip(" ,.;")
        if c:
            cleaned.append(c)
    return cleaned


def decompose(text: str) -> List[Step]:
    """Quebra um pedido em etapas ordenadas (determinístico)."""
    if not text or not text.strip():
        return []
    clauses = _split_clauses(text)
    # Quando o usuário enumerou/encadeou explicitamente (2+ cláusulas), mantém
    # TODAS — não filtramos por verbo (lista de radicais nunca é completa e
    # derrubaria etapas legítimas). Uma cláusula só = pedido de 1 passo.
    steps: List[Step] = []
    for i, c in enumerate(clauses, 1):
        steps.append(Step(n=i, text=c, complexity=_classify(c), skill=_suggest_skill(c)))
    return steps


def is_complex(text: str) -> bool:
    """True se o pedido tem 2+ etapas acionáveis (vale a pena planejar)."""
    steps = decompose(text)
    if len(steps) >= 2:
        return True
    # 1 etapa mas de alta complexidade também conta.
    return len(steps) == 1 and steps[0].complexity == "alta"


def render_plan(steps: List[Step]) -> str:
    """Plano numerado amigável para mostrar no canal."""
    if not steps:
        return ""
    emoji = {"baixa": "🟢", "media": "🟡", "alta": "🔴"}
    lines = ["📋 *Plano* (entrego o resultado de cada etapa no chat):"]
    for s in steps:
        tail = f" · _{s.skill}_" if s.skill else ""
        lines.append(f"{s.n}. {emoji.get(s.complexity, '•')} {s.text}{tail}")
    return "\n".join(lines)


def render_agent_scaffold(steps: List[Step]) -> str:
    """Bloco injetado no prompt do agente: um checklist pronto para executar.

    Faz o modelo fraco EXECUTAR um plano pronto em vez de inventar um.
    """
    if len(steps) < 2:
        return ""
    lines = [
        "# Plano da tarefa (já decomposto — siga este checklist)",
        "O pedido do usuário foi quebrado nestas etapas. Crie um item de `todo` "
        "para cada uma, execute UMA de cada vez, e entregue o resultado de cada "
        "etapa no chat antes de ir para a próxima. Antes de qualquer ação "
        "destrutiva (apagar, enviar a terceiros, gastar dinheiro), confirme.",
    ]
    for s in steps:
        hint = f"  (sugestão: use a skill `{s.skill}`)" if s.skill else ""
        lines.append(f"{s.n}. {s.text}{hint}")
    return "\n".join(lines)
