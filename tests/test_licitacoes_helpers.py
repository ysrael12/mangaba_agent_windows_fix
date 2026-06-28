"""Testes herméticos dos helpers do MCP licitacoes-br (sem rede).

Cobre: filtro de objeto multi-termo (OR), formatação, retry de rate-limit (429)
e — crítico — a checagem de sanção por CNPJ confirmado (anti-falso-positivo).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

_MCP = Path(__file__).resolve().parents[1] / "scripts" / "mcp" / "licitacoes_br.py"


@pytest.fixture()
def lic():
    spec = importlib.util.spec_from_file_location("licitacoes_br_under_test", _MCP)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _Resp:
    def __init__(self, status, payload=None, text="ok"):
        self.status_code = status
        self._payload = payload if payload is not None else []
        self.text = text

    def json(self):
        return self._payload


# ── filtro de objeto multi-termo (bug: não casava 'internet,telefonia') ──────
def test_match_objeto_or_e_virgula(lic):
    assert lic._match_objeto("internet,telefonia", "Serviço de TELEFONIA fixa") is True
    assert lic._match_objeto("internet,telefonia", "fornecimento de merenda") is False


def test_match_objeto_vazio_aceita_tudo(lic):
    assert lic._match_objeto("", "qualquer coisa") is True


def test_match_objeto_case_insensitive(lic):
    assert lic._match_objeto("FIBRA", "rede de fibra óptica") is True


# ── formatação ───────────────────────────────────────────────────────────────
def test_fmt_money(lic):
    assert lic._fmt_money(1500000) == "R$ 1,500,000.00"
    assert lic._fmt_money("xyz") == "—"


def test_fmt_dt(lic):
    assert lic._fmt_dt("2026-07-15T09:00:00") == "15/07/2026 09:00"
    assert lic._fmt_dt("") == ""


# ── retry de rate-limit (HTTP 429) ───────────────────────────────────────────
def test_get_retry_em_429_sinaliza_rate_limited(lic, monkeypatch):
    monkeypatch.setattr("time.sleep", lambda *a, **k: None)  # não espera de verdade
    chamadas = {"n": 0}

    def fake_get(url, params=None, headers=None, timeout=None):
        chamadas["n"] += 1
        return _Resp(429, text="<html>Limite de Requisições Excedido</html>")

    monkeypatch.setattr(lic.httpx, "get", fake_get)
    out = lic._get("https://pncp/x", {})
    assert out.get("rate_limited") is True
    assert chamadas["n"] == 3  # 1ª + 2 retries


def test_get_200_retorna_json(lic, monkeypatch):
    monkeypatch.setattr(lic.httpx, "get", lambda *a, **k: _Resp(200, {"data": [1, 2]}))
    assert lic._get("https://pncp/x", {}) == {"data": [1, 2]}


# ── CEIS: confirma pelo CNPJ (bug: API ignora cnpjSancionado → falso positivo) ─
def test_ceis_confirma_pelo_cnpj_e_evita_falso_positivo(lic, monkeypatch):
    monkeypatch.setenv("TRANSPARENCIA_API_KEY", "chave-teste")
    # a API devolve a lista global; só 1 registro tem o CNPJ alvo
    payload = [
        {"pessoa": {"cnpjFormatado": "99.999.999/0001-99", "nome": "OUTRA EMPRESA"},
         "tipoSancao": {"descricaoResumida": "Inidônea"},
         "orgaoSancionador": {"nome": "TCU"}, "dataInicioSancao": "2020-01-01"},
        {"pessoa": {"cnpjFormatado": "12.345.678/0001-00", "nome": "ALVO LTDA"},
         "tipoSancao": {"descricaoResumida": "Impedida"},
         "orgaoSancionador": {"nome": "TJ"}, "dataInicioSancao": "2021-05-05"},
    ]
    monkeypatch.setattr(lic.httpx, "get", lambda *a, **k: _Resp(200, payload))

    # CNPJ que existe na lista → retorna só a sanção dele
    hit = lic._ceis_sancionado("12.345.678/0001-00", "ALVO LTDA")
    assert len(hit) == 1 and hit[0]["orgao"] == "TJ"

    # CNPJ que NÃO está na lista → vazio (sem falso positivo — o bug antigo)
    miss = lic._ceis_sancionado("11.111.111/0001-11", "EMPRESA LIMPA")
    assert miss == []


def test_ceis_sem_chave_retorna_vazio(lic, monkeypatch):
    monkeypatch.delenv("TRANSPARENCIA_API_KEY", raising=False)
    assert lic._ceis_sancionado("12.345.678/0001-00", "ALVO") == []
