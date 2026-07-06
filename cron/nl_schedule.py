"""Conversor de linguagem natural (PT-BR) para o formato aceito por
``parse_schedule()`` (ver ``cron/jobs.py``): cron 5-campos, ``"every
<duração>"``, timestamp ISO ou duração simples.

Determinístico via regex — sem chamada a LLM — para ser rápido e previsível
no wizard de criação de agente (Slide 8 · Heartbeat dinâmico). Quando a frase
não é reconhecida, levanta ``ValueError`` com uma mensagem amigável; a UI cai
para edição manual da expressão cron nesse caso.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Optional, Tuple

_WEEKDAYS = {
    "domingo": 0,
    "segunda": 1,
    "terca": 2,
    "quarta": 3,
    "quinta": 4,
    "sexta": 5,
    "sabado": 6,
}

_UNIT_PREFIX_TO_SUFFIX = {"minu": "m", "hora": "h", "dia": "d"}


def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text)


def _unit_suffix(unit_word: str) -> str:
    unit_word = unit_word.rstrip("s")
    for prefix, suffix in _UNIT_PREFIX_TO_SUFFIX.items():
        if unit_word.startswith(prefix):
            return suffix
    raise ValueError(f"Unidade de tempo não reconhecida: '{unit_word}'.")


def _extract_time(text: str) -> Tuple[int, int]:
    """Extrai (hora, minuto) de frases como 'às 9h', 'às 14:30', 'às 9 horas'."""
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*h(?:oras?)?\b", text)
    if not m:
        m = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
    if not m:
        raise ValueError("Não encontrei um horário (ex.: 'às 9h', 'às 14:30').")
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Horário inválido: {hour}:{minute:02d}.")
    return hour, minute


def parse_natural_schedule(raw_text: str, *, now: Optional[datetime] = None) -> str:
    """Converte uma frase em PT-BR para o formato de ``parse_schedule()``.

    Levanta ``ValueError`` (mensagem amigável) quando não reconhece o padrão.
    """
    text = _normalize(raw_text)
    now = now or datetime.now()

    # "a cada 30 minutos" / "a cada 2 horas" / "a cada 1 dia" → recorrente
    m = re.search(r"\ba cada (\d+)\s*(minutos?|horas?|dias?)", text)
    if m:
        return f"every {m.group(1)}{_unit_suffix(m.group(2))}"

    # "daqui a 30 minutos" / "daqui a 2 horas" → único, relativo a agora
    m = re.search(r"\bdaqui a (\d+)\s*(minutos?|horas?)", text)
    if m:
        return f"{m.group(1)}{_unit_suffix(m.group(2))}"

    # dia da semana específico + horário → cron com day-of-week
    # ("toda segunda-feira", "todas as sextas", "todo domingo" — concordância
    # de gênero é livre aqui, aceitamos qualquer combinação plausível).
    for name, dow in _WEEKDAYS.items():
        if re.search(
            rf"\btod[ao]s?\b(?:\s+(?:o|a|os|as))?\s+{name}s?(?:-feira)?s?\b", text
        ):
            hour, minute = _extract_time(text)
            return f"{minute} {hour} * * {dow}"

    # "todo dia" / "todos os dias" / "diariamente" + horário → cron diário
    if re.search(r"\btodo(?:s)? (?:os )?dias?\b", text) or "diariamente" in text:
        hour, minute = _extract_time(text)
        return f"{minute} {hour} * * *"

    # "amanhã às 10h" → timestamp único no dia seguinte
    if "amanha" in text:
        hour, minute = _extract_time(text)
        target = (now + timedelta(days=1)).replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )
        return target.isoformat()

    # "hoje às 10h" → timestamp único hoje (ou amanhã, se o horário já passou)
    if "hoje" in text:
        hour, minute = _extract_time(text)
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        return target.isoformat()

    raise ValueError(
        "Não entendi essa frase. Tente algo como 'todo dia às 9h', "
        "'toda segunda-feira às 14h', 'a cada 30 minutos' ou 'amanhã às 10h'."
    )
