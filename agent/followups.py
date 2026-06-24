"""Follow-ups proativos — o "heartbeat" do Mangaba.

Diferencial de produto: o agente **inicia** a conversa, não só responde. No
contexto WhatsApp-business isso é recuperação de venda: o cliente gerou um PIX e
não pagou em 2h → o agente lembra sozinho; o cliente sumiu no meio do pedido →
follow-up amigável.

Determinístico e independente do modelo: é um agendamento simples. O agente (ou o
usuário) registra um follow-up com um horário e uma mensagem; o gateway, num tick
periódico, entrega os que venceram. Sem LLM no caminho crítico.

Store: ``MANGABA_HOME/followups.jsonl`` (stdlib, sem dependências).
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

STATUS_PENDING = "pending"
STATUS_SENT = "sent"
STATUS_CANCELLED = "cancelled"


def _store_path() -> Path:
    from mangaba_constants import get_mangaba_home
    return get_mangaba_home() / "followups.jsonl"


@dataclass
class FollowUp:
    id: str
    platform: str
    chat_id: str
    message: str
    due_at: float
    status: str = STATUS_PENDING
    thread_id: Optional[str] = None
    created_at: float = 0.0
    context: str = ""

    def to_line(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: dict) -> "FollowUp":
        return cls(
            id=str(d.get("id", "")),
            platform=str(d.get("platform", "")),
            chat_id=str(d.get("chat_id", "")),
            message=str(d.get("message", "")),
            due_at=float(d.get("due_at", 0.0)),
            status=str(d.get("status", STATUS_PENDING)),
            thread_id=d.get("thread_id"),
            created_at=float(d.get("created_at", 0.0)),
            context=str(d.get("context", "")),
        )


def load_followups() -> List[FollowUp]:
    path = _store_path()
    if not path.exists():
        return []
    out: List[FollowUp] = []
    for line in path.read_text(errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(FollowUp.from_dict(json.loads(line)))
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    return out


def _save_all(items: List[FollowUp]) -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".jsonl.tmp")
    tmp.write_text("\n".join(i.to_line() for i in items) + ("\n" if items else ""))
    tmp.replace(path)


def _gen_id(existing: List[FollowUp], now: float) -> str:
    base = int(now * 1000)
    taken = {i.id for i in existing}
    n = base
    while f"f{n % 1_000_000:06d}" in taken:
        n += 1
    return f"f{n % 1_000_000:06d}"


def add_followup(
    *,
    platform: str,
    chat_id: str,
    message: str,
    delay_seconds: float,
    thread_id: Optional[str] = None,
    context: str = "",
    now: Optional[float] = None,
) -> FollowUp:
    """Agenda um follow-up para daqui a ``delay_seconds``."""
    platform = (platform or "").strip()
    chat_id = (chat_id or "").strip()
    message = (message or "").strip()
    if not platform or not chat_id or not message:
        raise ValueError("platform, chat_id e message são obrigatórios")
    if delay_seconds < 0:
        raise ValueError("delay_seconds não pode ser negativo")
    now = time.time() if now is None else now
    items = load_followups()
    fu = FollowUp(
        id=_gen_id(items, now),
        platform=platform, chat_id=chat_id, message=message,
        due_at=now + delay_seconds, status=STATUS_PENDING,
        thread_id=thread_id, created_at=now, context=context,
    )
    items.append(fu)
    _save_all(items)
    return fu


def due_followups(now: Optional[float] = None) -> List[FollowUp]:
    """Follow-ups pendentes cujo horário já chegou."""
    now = time.time() if now is None else now
    return [f for f in load_followups()
            if f.status == STATUS_PENDING and f.due_at <= now]


def mark_sent(followup_id: str, now: Optional[float] = None) -> bool:
    now = time.time() if now is None else now
    items = load_followups()
    changed = False
    for f in items:
        if f.id == followup_id and f.status == STATUS_PENDING:
            f.status = STATUS_SENT
            changed = True
    if changed:
        _save_all(items)
    return changed


def cancel(followup_id: str) -> bool:
    items = load_followups()
    changed = False
    for f in items:
        if f.id == followup_id and f.status == STATUS_PENDING:
            f.status = STATUS_CANCELLED
            changed = True
    if changed:
        _save_all(items)
    return changed


def list_open() -> List[FollowUp]:
    """Follow-ups ainda pendentes, ordenados pelo horário."""
    items = [f for f in load_followups() if f.status == STATUS_PENDING]
    items.sort(key=lambda f: f.due_at)
    return items


# --------------------------------------------------------------------------
# Parser de duração em linguagem natural: "2h", "30min", "1 dia", "45m".
# --------------------------------------------------------------------------
import re as _re

_DURATION_RE = _re.compile(
    r"(?i)(\d+(?:[.,]\d+)?)\s*(segundos?|seg|minutos?|min|horas?|hr|dias?|[smhd])"
)
_UNIT_SECONDS = {
    "s": 1, "seg": 1, "segundo": 1, "segundos": 1,
    "m": 60, "min": 60, "minuto": 60, "minutos": 60,
    "h": 3600, "hr": 3600, "hora": 3600, "horas": 3600,
    "d": 86400, "dia": 86400, "dias": 86400,
}


def parse_duration(text: str) -> Optional[float]:
    """Converte '2h', '30 min', '1 dia' em segundos. None se não casar."""
    if not text:
        return None
    total = 0.0
    found = False
    for value, unit in _DURATION_RE.findall(text):
        unit = unit.lower().rstrip("s") if unit.lower() not in _UNIT_SECONDS else unit.lower()
        secs = _UNIT_SECONDS.get(unit) or _UNIT_SECONDS.get(unit + "s")
        if secs is None:
            continue
        total += float(value.replace(",", ".")) * secs
        found = True
    return total if found else None
