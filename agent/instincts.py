"""Instincts — lightweight, confidence-scored behavioral memory.

Inspired by ECC's "Continuous Learning v2 / instincts": a layer below skills.
A *skill* is a full guided procedure the agent must choose to invoke. An
*instinct* is a one-line "when X, do Y" rule that is **auto-injected** into
the system prompt every session, so even a weak local model benefits without
having to decide to look anything up.

Why this matters here: Mangaba's existing learning loop relies on the model
calling ``skill_manage`` to capture what worked — a ~4B local model rarely
does that. Instincts are captured *deterministically* (``/instinct add`` or a
natural-language "lembre disso:" trigger) and reinforced on repetition, so the
agent gets smarter regardless of model strength.

Storage: ``MANGABA_HOME/instincts.jsonl`` — one JSON object per line,
dependency-free (stdlib only) so it works on any install.

Lifecycle:
  - add        → new instinct at base confidence, or reinforce an existing
                 near-duplicate (confidence += 0.15, uses += 1).
  - reinforce  → called when an instinct is used/confirmed; bumps confidence.
  - decay      → optional; not auto-applied (kept simple/predictable).
  - promote    → high-confidence + frequently-used instincts are candidates
                 for becoming real skills (surfaced, not auto-converted).

Only instincts at/above ``INJECT_MIN_CONFIDENCE`` are injected, top-N by
confidence, to keep the prompt small.
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

BASE_CONFIDENCE = 0.40
PROVISIONAL_CONFIDENCE = 0.30  # auto-extracted, unconfirmed → below injection threshold
REINFORCE_STEP = 0.15
MAX_CONFIDENCE = 1.0
INJECT_MIN_CONFIDENCE = 0.40
INJECT_TOP_N = 8            # modelo fraco: injeta mais (precisa de mais lembretes)
INJECT_TOP_N_CAPABLE = 4   # modelo forte: injeta só os mais fortes (generaliza melhor)
PROMOTE_CONFIDENCE = 0.85
PROMOTE_MIN_USES = 4


def _store_path() -> Path:
    from mangaba_agent.mangaba_constants import get_mangaba_home
    return get_mangaba_home() / "instincts.jsonl"


@dataclass
class Instinct:
    id: str
    trigger: str
    guidance: str
    confidence: float = BASE_CONFIDENCE
    uses: int = 1
    created_at: float = 0.0
    updated_at: float = 0.0
    source: str = "manual"

    def to_line(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: dict) -> "Instinct":
        return cls(
            id=str(d.get("id", "")),
            trigger=str(d.get("trigger", "")).strip(),
            guidance=str(d.get("guidance", "")).strip(),
            confidence=float(d.get("confidence", BASE_CONFIDENCE)),
            uses=int(d.get("uses", 1)),
            created_at=float(d.get("created_at", 0.0)),
            updated_at=float(d.get("updated_at", 0.0)),
            source=str(d.get("source", "manual")),
        )


def _normalize(text: str) -> str:
    """Lowercased, punctuation-stripped form for near-duplicate matching."""
    return re.sub(r"[^a-z0-9çãõáéíóúâêô ]", "", text.lower()).strip()


def load_instincts() -> List[Instinct]:
    path = _store_path()
    if not path.exists():
        return []
    out: List[Instinct] = []
    for line in path.read_text(errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(Instinct.from_dict(json.loads(line)))
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    return out


def _save_all(instincts: List[Instinct]) -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".jsonl.tmp")
    tmp.write_text("\n".join(i.to_line() for i in instincts) + ("\n" if instincts else ""))
    tmp.replace(path)


def _gen_id(existing: List[Instinct], now: float) -> str:
    # Deterministic, time-based, collision-checked (no random — keeps tests/
    # resume stable and avoids Date.now-style nondeterminism concerns).
    base = int(now * 1000)
    taken = {i.id for i in existing}
    n = base
    while f"i{n % 1_000_000:06d}" in taken:
        n += 1
    return f"i{n % 1_000_000:06d}"


def find_duplicate(instincts: List[Instinct], trigger: str, guidance: str) -> Optional[Instinct]:
    nt, ng = _normalize(trigger), _normalize(guidance)
    for i in instincts:
        if _normalize(i.trigger) == nt and _normalize(i.guidance) == ng:
            return i
        # Same trigger, similar guidance → treat as duplicate to reinforce.
        if nt and _normalize(i.trigger) == nt:
            return i
    return None


def add_instinct(trigger: str, guidance: str, source: str = "manual",
                 now: Optional[float] = None,
                 confidence: float = BASE_CONFIDENCE) -> Instinct:
    """Add a new instinct, or reinforce an existing near-duplicate.

    *confidence* is the starting confidence for a brand-new instinct. Use
    ``PROVISIONAL_CONFIDENCE`` for auto-extracted (unconfirmed) ones so they
    stay below the injection threshold until reinforced.
    """
    trigger = (trigger or "").strip()
    guidance = (guidance or "").strip()
    if not trigger or not guidance:
        raise ValueError("trigger e guidance são obrigatórios")
    now = time.time() if now is None else now
    instincts = load_instincts()
    dup = find_duplicate(instincts, trigger, guidance)
    if dup is not None:
        dup.confidence = min(MAX_CONFIDENCE, dup.confidence + REINFORCE_STEP)
        dup.uses += 1
        dup.updated_at = now
        # Adopt the newer guidance phrasing if it changed.
        if _normalize(dup.guidance) != _normalize(guidance):
            dup.guidance = guidance
        _save_all(instincts)
        return dup
    inst = Instinct(
        id=_gen_id(instincts, now),
        trigger=trigger, guidance=guidance,
        confidence=max(0.0, min(MAX_CONFIDENCE, confidence)), uses=1,
        created_at=now, updated_at=now, source=source,
    )
    instincts.append(inst)
    _save_all(instincts)
    return inst


def reinforce(instinct_id: str, now: Optional[float] = None) -> Optional[Instinct]:
    now = time.time() if now is None else now
    instincts = load_instincts()
    for i in instincts:
        if i.id == instinct_id:
            i.confidence = min(MAX_CONFIDENCE, i.confidence + REINFORCE_STEP)
            i.uses += 1
            i.updated_at = now
            _save_all(instincts)
            return i
    return None


def forget(instinct_id: str) -> bool:
    instincts = load_instincts()
    kept = [i for i in instincts if i.id != instinct_id]
    if len(kept) == len(instincts):
        return False
    _save_all(kept)
    return True


def top_instincts(n: int = INJECT_TOP_N, min_confidence: float = INJECT_MIN_CONFIDENCE) -> List[Instinct]:
    items = [i for i in load_instincts() if i.confidence >= min_confidence]
    items.sort(key=lambda i: (i.confidence, i.uses), reverse=True)
    return items[:n]


def promotion_candidates() -> List[Instinct]:
    """Instincts strong enough to consider turning into a real skill."""
    return [i for i in load_instincts()
            if i.confidence >= PROMOTE_CONFIDENCE and i.uses >= PROMOTE_MIN_USES]


def _resolve_active_model() -> str:
    """Best-effort: the configured default model (no gateway dependency)."""
    try:
        from mangaba_cli.config import load_config
        mc = (load_config() or {}).get("model", {})
        if isinstance(mc, str):
            return mc
        if isinstance(mc, dict):
            return mc.get("default") or mc.get("model") or ""
    except Exception:
        pass
    return ""


def _inject_n_for_model(model: Optional[str]) -> int:
    """How many instincts to inject given the active model's capability."""
    name = model if model is not None else _resolve_active_model()
    try:
        from agent.model_capability import is_capable_model
        return INJECT_TOP_N_CAPABLE if is_capable_model(name) else INJECT_TOP_N
    except Exception:
        return INJECT_TOP_N


def render_block(model: Optional[str] = None) -> str:
    """Compact prompt block of the strongest instincts, or '' if none.

    Model-aware: a capable model (Claude/GPT/…) gets fewer instincts injected
    (it generalizes better); a weak local model (gemma default) gets the full
    set. ``model`` is resolved from config when not given.
    """
    items = top_instincts(n=_inject_n_for_model(model))
    if not items:
        return ""
    lines = ["# Instintos aprendidos",
             "Padrões que funcionaram antes. Aplique quando o gatilho ocorrer:"]
    for i in items:
        lines.append(f"- Quando {i.trigger} → {i.guidance}")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# Natural-language capture — deterministic, model-independent.
# Recognizes phrases like:
#   "lembre disso: quando o cliente pedir X, faça Y"
#   "aprenda: ao gerar PDF, sempre use pdfplumber"
#   "instinto: quando falhar download, tente novamente com curl"
# --------------------------------------------------------------------------
_CAPTURE_PREFIX = re.compile(
    r"^\s*(?:lembre(?:\s+disso)?|aprenda|memorize|instinto|guarde\s+isso)\s*[:\-]\s*(.+)$",
    re.IGNORECASE | re.DOTALL,
)
_WHEN_THEN = re.compile(
    r"^\s*(?:quando|ao|se)\s+(?P<trigger>.+?)[,;]\s*(?:ent[aã]o\s+|fa[çc]a\s+|sempre\s+|use\s+)?(?P<guidance>.+)$",
    re.IGNORECASE | re.DOTALL,
)


def parse_capture(text: str) -> Optional[tuple]:
    """Parse a natural-language capture phrase into (trigger, guidance).

    Returns None if the text isn't a capture instruction.
    """
    if not text:
        return None
    m = _CAPTURE_PREFIX.match(text.strip())
    if not m:
        return None
    body = m.group(1).strip()
    wt = _WHEN_THEN.match(body)
    if wt:
        return (wt.group("trigger").strip(), wt.group("guidance").strip())
    # No explicit when/then — store the whole phrase as a general guidance.
    return ("a situação for relevante", body)
