"""Registro de clientes da API e chaves de acesso (multi-tenant).

Base da camada "provedor de IA" (white-label): cada **cliente** consome a API
OpenAI-compatível (``/v1/chat/completions``) com sua própria **chave**, seu
**modelo**, sua **persona** e seu **teto de uso** — isolado dos demais.

Armazenamento: SQLite em ``$MANGABA_HOME/api_clients.db``.

Segurança:
  • A chave em texto puro (``mk_live_…``) é mostrada **uma única vez** na
    criação. Guardamos apenas o ``sha256`` — não dá para recuperá-la depois.
  • Revogar uma chave a invalida imediatamente.

Para isolamento real por processo (profiles dedicados) ver Fase 3 — aqui o
isolamento é por overrides aplicados na criação do agente + escopo de sessão.
"""

from __future__ import annotations

import hashlib
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOCK = threading.Lock()
_KEY_PREFIX = "mk_live_"

# Planos: definem limites padrão. O cliente pode sobrescrever (rpm /
# daily_token_limit > 0 vencem o padrão do plano). daily 0 = ilimitado.
PLANS: Dict[str, Dict[str, int]] = {
    "free":       {"rpm": 10,  "daily_token_limit": 100_000},
    "pro":        {"rpm": 60,  "daily_token_limit": 2_000_000},
    "enterprise": {"rpm": 600, "daily_token_limit": 0},
    "custom":     {"rpm": 0,   "daily_token_limit": 0},
}


def effective_limits(client: Dict[str, Any]) -> Dict[str, int]:
    """Resolve os limites efetivos (rpm, teto diário) a partir do plano +
    overrides do cliente."""
    plan = PLANS.get(str(client.get("plan") or "free"), PLANS["free"])
    rpm = int(client.get("rpm") or 0) or plan["rpm"]
    daily = int(client.get("daily_token_limit") or 0) or plan["daily_token_limit"]
    return {"rpm": rpm, "daily_token_limit": daily}


def _db_path() -> Path:
    from mangaba_agent.mangaba_constants import get_mangaba_home

    home = get_mangaba_home()
    home.mkdir(parents=True, exist_ok=True)
    return home / "api_clients.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_db_path()))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            email       TEXT DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'active',   -- active | suspended
            model       TEXT DEFAULT '',                  -- override de modelo (opcional)
            persona     TEXT DEFAULT '',                  -- prompt de persona (opcional)
            rag_enabled INTEGER NOT NULL DEFAULT 1,
            daily_token_limit INTEGER NOT NULL DEFAULT 0, -- 0 = sem limite
            plan        TEXT NOT NULL DEFAULT 'free',     -- free | pro | enterprise | custom
            rpm         INTEGER NOT NULL DEFAULT 0,       -- requests/min (0 = padrão do plano)
            profile     TEXT DEFAULT '',                  -- profile dedicado (Fase 3)
            api_port    INTEGER NOT NULL DEFAULT 0,       -- porta do api_server dedicado
            created_at  INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS api_keys (
            id          TEXT PRIMARY KEY,
            client_id   TEXT NOT NULL,
            key_hash    TEXT NOT NULL UNIQUE,
            last4       TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'active',   -- active | revoked
            created_at  INTEGER NOT NULL,
            last_used_at INTEGER,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_keys_hash ON api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_keys_client ON api_keys(client_id);
        """
    )
    # Migração: adiciona colunas novas em bancos já existentes.
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(clients)").fetchall()}
    for name, ddl in (
        ("plan", "plan TEXT NOT NULL DEFAULT 'free'"),
        ("rpm", "rpm INTEGER NOT NULL DEFAULT 0"),
        ("profile", "profile TEXT DEFAULT ''"),
        ("api_port", "api_port INTEGER NOT NULL DEFAULT 0"),
        ("autostart", "autostart INTEGER NOT NULL DEFAULT 0"),
    ):
        if name not in cols:
            conn.execute(f"ALTER TABLE clients ADD COLUMN {ddl}")
    conn.commit()


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def _client_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["rag_enabled"] = bool(d.get("rag_enabled", 1))
    d["autostart"] = bool(d.get("autostart", 0))
    return d


# ── Clientes ────────────────────────────────────────────────────────────────
def create_client(
    name: str,
    *,
    email: str = "",
    model: str = "",
    persona: str = "",
    rag_enabled: bool = True,
    daily_token_limit: int = 0,
    plan: str = "free",
    rpm: int = 0,
) -> Dict[str, Any]:
    cid = _gen_id("cli")
    now = int(time.time())
    if plan not in PLANS:
        plan = "free"
    with _LOCK, _connect() as conn:
        _init(conn)
        conn.execute(
            "INSERT INTO clients (id, name, email, status, model, persona, "
            "rag_enabled, daily_token_limit, plan, rpm, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (cid, name.strip(), email.strip(), "active", model.strip(),
             persona.strip(), 1 if rag_enabled else 0, max(0, int(daily_token_limit or 0)),
             plan, max(0, int(rpm or 0)), now),
        )
        conn.commit()
    return get_client(cid)


def list_clients() -> List[Dict[str, Any]]:
    with _LOCK, _connect() as conn:
        _init(conn)
        rows = conn.execute("SELECT * FROM clients ORDER BY created_at DESC").fetchall()
        clients = [_client_row(r) for r in rows]
        for c in clients:
            kc = conn.execute(
                "SELECT COUNT(*) AS n FROM api_keys WHERE client_id=? AND status='active'",
                (c["id"],),
            ).fetchone()
            c["active_keys"] = int(kc["n"]) if kc else 0
    return clients


def get_client(client_id: str) -> Optional[Dict[str, Any]]:
    with _LOCK, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
        return _client_row(row) if row else None


def update_client(client_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
    allowed = {"name", "email", "status", "model", "persona", "rag_enabled",
               "daily_token_limit", "plan", "rpm", "profile", "api_port", "autostart"}
    sets, vals = [], []
    for k, v in fields.items():
        if k not in allowed:
            continue
        if k in ("rag_enabled", "autostart"):
            v = 1 if v else 0
        elif k in ("daily_token_limit", "rpm", "api_port"):
            v = max(0, int(v or 0))
        elif k == "plan":
            v = v if v in PLANS else "free"
        elif k == "status":
            v = "suspended" if str(v) == "suspended" else "active"
        sets.append(f"{k}=?")
        vals.append(v)
    if not sets:
        return get_client(client_id)
    vals.append(client_id)
    with _LOCK, _connect() as conn:
        _init(conn)
        conn.execute(f"UPDATE clients SET {', '.join(sets)} WHERE id=?", vals)
        conn.commit()
    return get_client(client_id)


def delete_client(client_id: str) -> bool:
    with _LOCK, _connect() as conn:
        _init(conn)
        conn.execute("DELETE FROM api_keys WHERE client_id=?", (client_id,))
        cur = conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
        conn.commit()
        return cur.rowcount > 0


# ── Chaves ──────────────────────────────────────────────────────────────────
def create_key(client_id: str) -> Optional[Dict[str, Any]]:
    """Cria uma chave para o cliente. Retorna o token EM TEXTO PURO uma vez."""
    if not get_client(client_id):
        return None
    token = _KEY_PREFIX + secrets.token_urlsafe(32)
    kid = _gen_id("key")
    now = int(time.time())
    with _LOCK, _connect() as conn:
        _init(conn)
        conn.execute(
            "INSERT INTO api_keys (id, client_id, key_hash, last4, status, created_at) "
            "VALUES (?,?,?,?,?,?)",
            (kid, client_id, _hash(token), token[-4:], "active", now),
        )
        conn.commit()
    return {"id": kid, "client_id": client_id, "key": token, "last4": token[-4:], "created_at": now}


def list_keys(client_id: str) -> List[Dict[str, Any]]:
    with _LOCK, _connect() as conn:
        _init(conn)
        rows = conn.execute(
            "SELECT id, client_id, last4, status, created_at, last_used_at "
            "FROM api_keys WHERE client_id=? ORDER BY created_at DESC",
            (client_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def revoke_key(key_id: str) -> bool:
    with _LOCK, _connect() as conn:
        _init(conn)
        cur = conn.execute("UPDATE api_keys SET status='revoked' WHERE id=?", (key_id,))
        conn.commit()
        return cur.rowcount > 0


def verify_key(token: str) -> Optional[Dict[str, Any]]:
    """Valida uma chave ``mk_live_…``. Retorna o cliente (ativo) ou None.

    Atualiza ``last_used_at`` de forma best-effort. Não levanta exceção.
    """
    if not token or not token.startswith(_KEY_PREFIX):
        return None
    h = _hash(token)
    try:
        with _LOCK, _connect() as conn:
            _init(conn)
            row = conn.execute(
                "SELECT client_id FROM api_keys WHERE key_hash=? AND status='active'", (h,)
            ).fetchone()
            if not row:
                return None
            client = conn.execute(
                "SELECT * FROM clients WHERE id=? AND status='active'", (row["client_id"],)
            ).fetchone()
            if not client:
                return None
            conn.execute(
                "UPDATE api_keys SET last_used_at=? WHERE key_hash=?", (int(time.time()), h)
            )
            conn.commit()
            return _client_row(client)
    except Exception:
        return None


def has_any_clients() -> bool:
    try:
        with _LOCK, _connect() as conn:
            _init(conn)
            r = conn.execute("SELECT COUNT(*) AS n FROM clients").fetchone()
            return bool(r and r["n"])
    except Exception:
        return False
