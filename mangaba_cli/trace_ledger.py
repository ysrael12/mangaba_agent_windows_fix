"""Observabilidade por turno — registra um *trace* de cada conversa e uma nota
de qualidade (eval) opcional.

Tendência 2026: tratar observabilidade + avaliação como parte do desenho do
agente (traces por passo, evals no tráfego real). Aqui registramos, por turno:
métricas mecânicas (latência, tokens, tool calls, status) sempre, e uma nota de
qualidade 1–5 via LLM-juiz quando habilitado (config ``observability.eval``).

Armazenamento: SQLite em ``$MANGABA_HOME/traces.db`` (permite atualizar a nota
de forma assíncrona após registrar o trace).
"""

from __future__ import annotations

import logging
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)
_LOCK = threading.Lock()


def _db_path() -> Path:
    from mangaba_agent.mangaba_constants import get_mangaba_home

    home = get_mangaba_home()
    home.mkdir(parents=True, exist_ok=True)
    return home / "traces.db"


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_db_path()))
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS traces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            platform TEXT, model TEXT, provider TEXT, tenant TEXT,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            latency_ms INTEGER DEFAULT 0,
            tool_calls INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ok',         -- ok | partial | failed
            user_preview TEXT, reply_preview TEXT,
            score INTEGER,                    -- 1..5 (eval), NULL = não avaliado
            score_reason TEXT
        )
        """
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_traces_ts ON traces(ts)")
    return c


def record_trace(
    *,
    platform: str = "",
    model: str = "",
    provider: str = "",
    tenant: str = "",
    input_tokens: int = 0,
    output_tokens: int = 0,
    latency_ms: int = 0,
    tool_calls: int = 0,
    status: str = "ok",
    user_preview: str = "",
    reply_preview: str = "",
) -> Optional[int]:
    """Insere um trace e retorna seu id (para atualizar a nota depois)."""
    try:
        with _LOCK, _conn() as c:
            cur = c.execute(
                "INSERT INTO traces (ts, platform, model, provider, tenant, "
                "input_tokens, output_tokens, latency_ms, tool_calls, status, "
                "user_preview, reply_preview) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (int(time.time()), platform, model, provider, tenant,
                 int(input_tokens or 0), int(output_tokens or 0), int(latency_ms or 0),
                 int(tool_calls or 0), status, (user_preview or "")[:200],
                 (reply_preview or "")[:240]),
            )
            c.commit()
            return cur.lastrowid
    except Exception as e:  # noqa: BLE001
        logger.debug("record_trace falhou: %s", e)
        return None


def set_score(trace_id: int, score: int, reason: str = "") -> None:
    try:
        with _LOCK, _conn() as c:
            c.execute("UPDATE traces SET score=?, score_reason=? WHERE id=?",
                      (int(score), reason[:200], trace_id))
            c.commit()
    except Exception as e:  # noqa: BLE001
        logger.debug("set_score falhou: %s", e)


def recent(limit: int = 100) -> List[Dict[str, Any]]:
    try:
        with _LOCK, _conn() as c:
            rows = c.execute(
                "SELECT * FROM traces ORDER BY id DESC LIMIT ?", (int(limit),)
            ).fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []


def stats(hours: int = 24) -> Dict[str, Any]:
    """Resumo das últimas *hours* horas."""
    since = int(time.time()) - hours * 3600
    try:
        with _LOCK, _conn() as c:
            r = c.execute(
                "SELECT COUNT(*) n, "
                "SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END) ok, "
                "AVG(latency_ms) lat, SUM(input_tokens+output_tokens) toks, "
                "AVG(score) avg_score, COUNT(score) scored "
                "FROM traces WHERE ts>=?",
                (since,),
            ).fetchone()
            n = r["n"] or 0
            return {
                "turns": n,
                "success_rate": round((r["ok"] or 0) / n * 100, 1) if n else 0.0,
                "avg_latency_ms": int(r["lat"] or 0),
                "total_tokens": int(r["toks"] or 0),
                "avg_score": round(r["avg_score"], 2) if r["avg_score"] is not None else None,
                "scored": r["scored"] or 0,
                "hours": hours,
            }
    except Exception:
        return {"turns": 0, "success_rate": 0.0, "avg_latency_ms": 0,
                "total_tokens": 0, "avg_score": None, "scored": 0, "hours": hours}


# ── Eval (LLM-juiz) ─────────────────────────────────────────────────────────
def eval_enabled() -> bool:
    try:
        from mangaba_cli.config import load_config

        return bool((load_config().get("observability") or {}).get("eval"))
    except Exception:
        return False


def judge_quality(user_msg: str, reply: str) -> Optional[Dict[str, Any]]:
    """Pede ao modelo configurado uma nota 1–5 de qualidade da resposta.

    Chamada curta e barata; roda em background. Retorna {score, reason} ou None.
    """
    if not reply:
        return None
    try:
        from mangaba_cli.config import load_config
        from openai import OpenAI

        m = (load_config().get("model") or {})
        base = m.get("base_url") or None
        key = m.get("api_key") or "x"
        model = m.get("default") or m.get("name") or ""
        client = OpenAI(base_url=base, api_key=key)
        prompt = (
            "Avalie a resposta do assistente de 1 a 5 (5=excelente, 1=ruim) quanto a "
            "utilidade, relevância e clareza. Responda APENAS no formato 'N: motivo curto'.\n\n"
            f"Usuário: {user_msg[:500]}\n\nAssistente: {reply[:800]}"
        )
        r = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0,
        )
        text = (r.choices[0].message.content or "").strip()
        score = next((int(ch) for ch in text if ch.isdigit() and 1 <= int(ch) <= 5), None)
        if score is None:
            return None
        reason = text.split(":", 1)[1].strip() if ":" in text else ""
        return {"score": score, "reason": reason}
    except Exception as e:  # noqa: BLE001
        logger.debug("judge_quality falhou: %s", e)
        return None
