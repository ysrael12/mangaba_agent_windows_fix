#!/usr/bin/env python3
"""Servidor MCP "Política BR" — ferramentas sobre as APIs públicas abertas da
política brasileira. Starter: Câmara dos Deputados (Dados Abertos, sem chave).

Rodar como servidor MCP (stdio):
    python scripts/mcp/politica_br.py

Registrar no Mangaba (~/.mangaba/config.yaml):
    mcp_servers:
      politica-br:
        command: python
        args: ["scripts/mcp/politica_br.py"]

Fonte oficial: https://dadosabertos.camara.leg.br/swagger/api.html
Todas as respostas vêm em tempo real da Câmara — cite a fonte ao usar.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

BASE = "https://dadosabertos.camara.leg.br/api/v2"
_HEADERS = {"Accept": "application/json", "User-Agent": "MangabaPoliticaBR/1.0"}


def _get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        r = httpx.get(f"{BASE}{path}", params=params or {}, headers=_HEADERS, timeout=20)
        if r.status_code == 200:
            return r.json()
        return {"erro": f"HTTP {r.status_code}", "detalhe": r.text[:200]}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── Funções de domínio (testáveis sem MCP) ──────────────────────────────────
def buscar_deputados(nome: str = "", uf: str = "", partido: str = "", limite: int = 10) -> List[Dict[str, Any]]:
    p: Dict[str, Any] = {"ordem": "ASC", "ordenarPor": "nome", "itens": min(limite, 50)}
    if nome:
        p["nome"] = nome
    if uf:
        p["siglaUf"] = uf.upper()
    if partido:
        p["siglaPartido"] = partido.upper()
    d = _get("/deputados", p).get("dados", [])
    return [
        {"id": x.get("id"), "nome": x.get("nome"), "partido": x.get("siglaPartido"),
         "uf": x.get("siglaUf"), "email": x.get("email")}
        for x in d
    ]


def detalhes_deputado(deputado_id: int) -> Dict[str, Any]:
    d = _get(f"/deputados/{deputado_id}").get("dados", {})
    s = d.get("ultimoStatus", {}) or {}
    return {
        "id": d.get("id"), "nome": d.get("nomeCivil"),
        "nome_parlamentar": s.get("nome"), "partido": s.get("siglaPartido"),
        "uf": s.get("siglaUf"), "situacao": s.get("situacao"),
        "gabinete": (s.get("gabinete") or {}).get("nome"),
        "escolaridade": d.get("escolaridade"), "nascimento": d.get("dataNascimento"),
    }


def despesas_deputado(deputado_id: int, ano: int, mes: int = 0, limite: int = 15) -> List[Dict[str, Any]]:
    """Despesas da cota parlamentar (CEAP) de um deputado."""
    p: Dict[str, Any] = {"ano": ano, "ordem": "DESC", "ordenarPor": "dataDocumento", "itens": min(limite, 50)}
    if mes:
        p["mes"] = mes
    d = _get(f"/deputados/{deputado_id}/despesas", p).get("dados", [])
    return [
        {"data": x.get("dataDocumento"), "tipo": x.get("tipoDespesa"),
         "fornecedor": x.get("nomeFornecedor"), "valor": x.get("valorLiquido")}
        for x in d
    ]


def buscar_proposicoes(termo: str = "", tipo: str = "", numero: int = 0, ano: int = 0, limite: int = 10) -> List[Dict[str, Any]]:
    p: Dict[str, Any] = {"ordem": "DESC", "ordenarPor": "id", "itens": min(limite, 50)}
    if termo:
        p["keywords"] = termo
    if tipo:
        p["siglaTipo"] = tipo.upper()
    if numero:
        p["numero"] = numero
    if ano:
        p["ano"] = ano
    d = _get("/proposicoes", p).get("dados", [])
    return [
        {"id": x.get("id"), "ementa": x.get("ementa"),
         "proposicao": f"{x.get('siglaTipo')} {x.get('numero')}/{x.get('ano')}"}
        for x in d
    ]


def detalhes_proposicao(proposicao_id: int) -> Dict[str, Any]:
    d = _get(f"/proposicoes/{proposicao_id}").get("dados", {})
    st = d.get("statusProposicao", {}) or {}
    return {
        "id": d.get("id"), "proposicao": f"{d.get('siglaTipo')} {d.get('numero')}/{d.get('ano')}",
        "ementa": d.get("ementa"), "situacao": st.get("descricaoSituacao"),
        "tramitacao": st.get("descricaoTramitacao"), "despacho": st.get("despacho"),
        "url_inteiro_teor": d.get("urlInteiroTeor"),
    }


def votacoes_proposicao(proposicao_id: int, limite: int = 10) -> List[Dict[str, Any]]:
    d = _get(f"/proposicoes/{proposicao_id}/votacoes",
             {"ordem": "DESC", "ordenarPor": "dataHoraRegistro", "itens": min(limite, 50)}).get("dados", [])
    return [
        {"id": x.get("id"), "data": x.get("dataHoraRegistro"),
         "descricao": x.get("descricao"), "aprovacao": x.get("aprovacao")}
        for x in d
    ]


def partidos(limite: int = 40) -> List[Dict[str, Any]]:
    d = _get("/partidos", {"ordem": "ASC", "ordenarPor": "sigla", "itens": min(limite, 100)}).get("dados", [])
    return [{"id": x.get("id"), "sigla": x.get("sigla"), "nome": x.get("nome")} for x in d]


# ── Registro MCP ────────────────────────────────────────────────────────────
def _build_server():
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("politica-br")

    @mcp.tool()
    def camara_buscar_deputados(nome: str = "", uf: str = "", partido: str = "", limite: int = 10) -> list:
        """Busca deputados federais por nome, UF (ex.: SP) e/ou partido (ex.: PT)."""
        return buscar_deputados(nome, uf, partido, limite)

    @mcp.tool()
    def camara_detalhes_deputado(deputado_id: int) -> dict:
        """Detalhes de um deputado pelo id (nome, partido, UF, situação, gabinete)."""
        return detalhes_deputado(deputado_id)

    @mcp.tool()
    def camara_despesas_deputado(deputado_id: int, ano: int, mes: int = 0, limite: int = 15) -> list:
        """Despesas da cota parlamentar (CEAP) de um deputado em um ano (e mês opcional)."""
        return despesas_deputado(deputado_id, ano, mes, limite)

    @mcp.tool()
    def camara_buscar_proposicoes(termo: str = "", tipo: str = "", numero: int = 0, ano: int = 0, limite: int = 10) -> list:
        """Busca proposições (PL, PEC, MPV…) por termo, tipo, número e/ou ano."""
        return buscar_proposicoes(termo, tipo, numero, ano, limite)

    @mcp.tool()
    def camara_detalhes_proposicao(proposicao_id: int) -> dict:
        """Detalhes de uma proposição pelo id (ementa, situação, tramitação)."""
        return detalhes_proposicao(proposicao_id)

    @mcp.tool()
    def camara_votacoes_proposicao(proposicao_id: int, limite: int = 10) -> list:
        """Votações de uma proposição pelo id (data, descrição, se foi aprovada)."""
        return votacoes_proposicao(proposicao_id, limite)

    @mcp.tool()
    def camara_partidos(limite: int = 40) -> list:
        """Lista os partidos com representação na Câmara."""
        return partidos(limite)

    return mcp


if __name__ == "__main__":
    _build_server().run()
