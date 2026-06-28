"""Registro compartilhado de eventos de rate-limit / falha de provider.

Vários processos escrevem aqui (gateway, MCPs como subprocesso, web server),
então o transporte é um arquivo JSONL append-only em MANGABA_HOME. O dashboard
lê os eventos recentes via /api/status e exibe um banner no topo.

Fontes típicas:
  - "modelo"     → provider do LLM (HuggingFace router) falhou / 429
  - "pncp"       → API pública do PNCP retornou HTTP 429
  - "transparencia" → Portal da Transparência limitou requisições
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List


def _path() -> Path:
    home = os.environ.get("MANGABA_HOME") or str(Path.home() / ".mangaba")
    return Path(home) / "rate_limit_events.jsonl"


def record(source: str, detail: str = "", ts: float | None = None) -> None:
    """Anexa um evento de rate-limit. Nunca levanta exceção (best-effort)."""
    try:
        p = _path()
        p.parent.mkdir(parents=True, exist_ok=True)
        evt = {"ts": float(ts if ts is not None else time.time()),
               "source": source, "detail": (detail or "")[:200]}
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(evt, ensure_ascii=False) + "\n")
        # mantém o arquivo limitado (~500 últimas linhas)
        try:
            linhas = p.read_text(encoding="utf-8").splitlines()
            if len(linhas) > 500:
                p.write_text("\n".join(linhas[-500:]) + "\n", encoding="utf-8")
        except Exception:
            pass
    except Exception:
        pass


def recent(minutes: float = 15) -> List[Dict[str, Any]]:
    """Eventos dos últimos `minutes` minutos (mais novos por último)."""
    try:
        p = _path()
        if not p.exists():
            return []
        cutoff = time.time() - minutes * 60.0
        out: List[Dict[str, Any]] = []
        for line in p.read_text(encoding="utf-8").splitlines()[-300:]:
            try:
                e = json.loads(line)
                if float(e.get("ts", 0)) >= cutoff:
                    out.append(e)
            except Exception:
                continue
        return out
    except Exception:
        return []


def summary(minutes: float = 15) -> Dict[str, Any]:
    """Resumo p/ o dashboard: contagem por fonte + evento mais recente."""
    evs = recent(minutes)
    por_fonte: Dict[str, int] = {}
    for e in evs:
        s = e.get("source", "?")
        por_fonte[s] = por_fonte.get(s, 0) + 1
    return {
        "active": bool(evs),
        "count": len(evs),
        "by_source": por_fonte,
        "last": evs[-1] if evs else None,
        "window_minutes": minutes,
    }
