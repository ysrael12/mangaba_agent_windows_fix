"""Testes herméticos dos helpers do MCP politica-br (sem rede).

Cobre: normalização do nome do autor (Portal é case-sensitive), cálculo de
dígitos de CNPJ e a resolução fuzzy de nome (tolera typos do modelo).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

_MCP = Path(__file__).resolve().parents[1] / "scripts" / "mcp" / "politica_br.py"


@pytest.fixture()
def pol():
    spec = importlib.util.spec_from_file_location("politica_br_under_test", _MCP)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _Resp:
    def __init__(self, status, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else []

    def json(self):
        return self._payload


# ── normalização do nome (Portal exige MAIÚSCULAS) ───────────────────────────
def test_norm_autor_maiusculo_e_strip(pol):
    assert pol._norm_autor("  Arthur Lira ") == "ARTHUR LIRA"
    assert pol._norm_autor("") == ""


# ── dígitos verificadores de CNPJ ────────────────────────────────────────────
def test_calcular_cnpj_digitos(pol):
    # base conhecida (Banco do Brasil): 00.000.000/0001 → dígitos 91
    assert pol._calcular_cnpj("000000000001") == "00000000000191"


# ── resolução fuzzy do autor (bug: 'RENNAN' não casava 'RENAN') ──────────────
def test_resolver_autor_exato_passa_direto(pol, monkeypatch):
    # se o nome exato já retorna emendas, usa ele sem fuzzy
    monkeypatch.setattr(pol.httpx, "get", lambda *a, **k: _Resp(200, [{"nomeAutor": "ARTHUR LIRA"}]))
    assert pol._resolver_autor("Arthur Lira", 2026, {}) == "ARTHUR LIRA"


def test_resolver_autor_corrige_typo(pol, monkeypatch):
    # 1ª chamada (nome exato 'RENNAN CALHEIROS') → vazio;
    # chamada por token ('CALHEIROS') → candidatos reais; difflib escolhe o mais próximo
    chamadas = {"n": 0}

    def fake_get(url, params=None, headers=None, timeout=None):
        chamadas["n"] += 1
        nome = (params or {}).get("nomeAutor", "")
        if nome == "RENNAN CALHEIROS":
            return _Resp(200, [])  # typo não casa nada
        # busca por token devolve os autores reais que contêm 'CALHEIROS'
        return _Resp(200, [{"nomeAutor": "RENAN CALHEIROS"}, {"nomeAutor": "RENILDO CALHEIROS"}])

    monkeypatch.setattr(pol.httpx, "get", fake_get)
    resolvido = pol._resolver_autor("Rennan Calheiros", 2026, {})
    assert resolvido == "RENAN CALHEIROS"  # corrige o NN duplo via similaridade
    assert chamadas["n"] >= 2


def test_resolver_autor_sem_match_mantem_normalizado(pol, monkeypatch):
    monkeypatch.setattr(pol.httpx, "get", lambda *a, **k: _Resp(200, []))
    # nada casa → devolve o nome normalizado original (não inventa)
    assert pol._resolver_autor("Fulano Inexistente", 2026, {}) == "FULANO INEXISTENTE"
