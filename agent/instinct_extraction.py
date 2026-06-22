"""Auto-extraction of instincts from a finished session (ECC-style).

Closes the learning loop: at session end (or on demand), an auxiliary model
reads the conversation and proposes a few short "when X → do Y" rules. These
are stored as **provisional** instincts (confidence below the injection
threshold) so a weak auxiliary model can't pollute the prompt — a provisional
instinct only becomes active once it's confirmed (`/instinct` reinforces it)
or extracted again in a later session.

Robustness:
  - Pure stdlib JSON parsing of the model's reply; tolerant to code fences and
    surrounding prose.
  - Hard caps: at most ``MAX_PER_SESSION`` instincts, short strings only.
  - Never raises into the caller — extraction is best-effort enrichment.
  - The LLM call is injected (``llm_fn``) so it's fully unit-testable without a
    live provider.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Callable, List, Optional

from agent.instincts import PROVISIONAL_CONFIDENCE, add_instinct

logger = logging.getLogger(__name__)

MAX_PER_SESSION = 3
MIN_TURNS = 4            # don't bother extracting from trivial chats
MAX_TRIGGER_LEN = 120
MAX_GUIDANCE_LEN = 200

_EXTRACTION_SYSTEM = (
    "Você analisa uma conversa entre um usuário e um agente e extrai no máximo "
    f"{MAX_PER_SESSION} 'instintos' reutilizáveis: regras curtas no formato "
    "'quando <gatilho> então <ação>' que ajudariam o agente a agir melhor numa "
    "PRÓXIMA conversa parecida.\n"
    "Regras:\n"
    "- Só extraia padrões GERAIS e reutilizáveis (preferência do usuário, jeito "
    "que funcionou, armadilha a evitar). NÃO extraia fatos pontuais desta tarefa.\n"
    "- Se nada for reutilizável, devolva uma lista vazia.\n"
    "- Responda APENAS com JSON válido: uma lista de objetos "
    '{"trigger": "...", "guidance": "..."}. Sem texto fora do JSON.'
)


def _format_transcript(messages: List[dict], max_chars: int = 8000) -> str:
    """Render chat messages into a compact transcript for the extractor."""
    lines: List[str] = []
    for m in messages:
        role = m.get("role", "")
        if role not in ("user", "assistant"):
            continue
        content = m.get("content", "")
        if isinstance(content, list):  # multimodal → keep text parts only
            content = " ".join(
                p.get("text", "") for p in content
                if isinstance(p, dict) and p.get("type") == "text"
            )
        content = str(content).strip()
        if not content:
            continue
        who = "Usuário" if role == "user" else "Agente"
        lines.append(f"{who}: {content}")
    text = "\n".join(lines)
    if len(text) > max_chars:  # keep the tail — most recent context matters most
        text = "…\n" + text[-max_chars:]
    return text


def _parse_instincts_json(reply: str) -> List[dict]:
    """Extract a JSON list of {trigger, guidance} from a model reply."""
    if not reply:
        return []
    # Strip code fences if present.
    fenced = re.search(r"```(?:json)?\s*(.+?)```", reply, re.DOTALL)
    candidate = fenced.group(1) if fenced else reply
    # Grab the first [...] block.
    bracket = re.search(r"\[.*\]", candidate, re.DOTALL)
    if bracket:
        candidate = bracket.group(0)
    try:
        data = json.loads(candidate)
    except (json.JSONDecodeError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    out: List[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        trig = str(item.get("trigger", "")).strip()
        guid = str(item.get("guidance", "")).strip()
        if not trig or not guid:
            continue
        if len(trig) > MAX_TRIGGER_LEN or len(guid) > MAX_GUIDANCE_LEN:
            trig, guid = trig[:MAX_TRIGGER_LEN], guid[:MAX_GUIDANCE_LEN]
        out.append({"trigger": trig, "guidance": guid})
        if len(out) >= MAX_PER_SESSION:
            break
    return out


def _default_llm(transcript: str, task: str) -> str:
    """Call the configured auxiliary model. Returns the reply text or ''."""
    from agent.auxiliary_client import call_llm
    resp = call_llm(
        task=task,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": f"Conversa:\n{transcript}\n\nExtraia os instintos (JSON)."},
        ],
        temperature=0.2,
        max_tokens=500,
    )
    try:
        return resp.choices[0].message.content or ""
    except (AttributeError, IndexError):
        return ""


def extract_and_store(
    messages: List[dict],
    *,
    source: str = "auto",
    task: str = "compression",
    llm_fn: Optional[Callable[[str, str], str]] = None,
) -> List[dict]:
    """Extract instincts from a session and store them as provisional.

    Returns the list of stored {trigger, guidance, id} dicts (possibly empty).
    Never raises — failures are logged and yield an empty list.
    """
    try:
        turns = [m for m in messages if m.get("role") in ("user", "assistant")]
        if len(turns) < MIN_TURNS:
            return []
        transcript = _format_transcript(turns)
        if not transcript.strip():
            return []
        fn = llm_fn or _default_llm
        reply = fn(transcript, task)
        proposed = _parse_instincts_json(reply)
        stored: List[dict] = []
        for p in proposed:
            try:
                inst = add_instinct(
                    p["trigger"], p["guidance"],
                    source=source, confidence=PROVISIONAL_CONFIDENCE,
                )
                stored.append({"id": inst.id, "trigger": inst.trigger,
                               "guidance": inst.guidance, "confidence": inst.confidence})
            except ValueError:
                continue
        if stored:
            logger.info("instinct extraction: stored %d provisional instinct(s)", len(stored))
        return stored
    except Exception as exc:  # noqa: BLE001 — best-effort enrichment
        logger.debug("instinct extraction failed: %s", exc)
        return []
