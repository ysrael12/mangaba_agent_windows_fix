"""Valida o registrador compartilhado de eventos de rate-limit.

Cobre a feature do banner de rate-limit (gateway + PNCP → /api/status).
Hermético: o conftest isola MANGABA_HOME num tempdir por teste, então o
arquivo JSONL não toca o ~/.mangaba real.
"""
from __future__ import annotations

from mangaba_cli import rate_limit_log as rl


def test_record_e_recent_roundtrip():
    rl.record("modelo", "falha do provider")
    rl.record("pncp", "HTTP 429")
    eventos = rl.recent(minutes=15)
    fontes = {e["source"] for e in eventos}
    assert {"modelo", "pncp"} <= fontes
    assert all("ts" in e for e in eventos)


def test_summary_agrega_por_fonte():
    rl.record("modelo", "x")
    rl.record("modelo", "y")
    rl.record("pncp", "z")
    s = rl.summary(minutes=15)
    assert s["active"] is True
    assert s["count"] >= 3
    assert s["by_source"].get("modelo", 0) >= 2
    assert s["last"]["source"] == "pncp"


def test_summary_vazio_quando_sem_eventos():
    s = rl.summary(minutes=15)
    assert s["active"] is False
    assert s["count"] == 0
    assert s["last"] is None


def test_janela_temporal_exclui_eventos_antigos():
    # grava com timestamp no passado (fora da janela)
    rl.record("modelo", "antigo", ts=1.0)
    recentes = rl.recent(minutes=15)
    assert all(e["detail"] != "antigo" for e in recentes)


def test_record_nunca_levanta_excecao(monkeypatch):
    # mesmo com falha de I/O, record é best-effort (não pode derrubar o gateway)
    def boom(*a, **k):
        raise OSError("disco cheio")

    monkeypatch.setattr(rl.Path, "mkdir", boom, raising=False)
    rl.record("modelo", "deveria engolir o erro")  # não deve levantar
