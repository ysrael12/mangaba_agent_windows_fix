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


# ── Senado Federal (Dados Abertos) ──────────────────────────────────────────
_SENADO = "https://legis.senado.leg.br/dadosabertos"


def _senado_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        r = httpx.get(f"{_SENADO}{path}", params=params or {}, headers=_HEADERS, timeout=20, follow_redirects=True)
        if r.status_code == 200 and "json" in r.headers.get("content-type", ""):
            return r.json()
        return {"erro": f"HTTP {r.status_code}"}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


def buscar_senadores(nome: str = "", uf: str = "", partido: str = "", limite: int = 15) -> List[Dict[str, Any]]:
    """Senadores em exercício, filtrando por nome/UF/partido."""
    pl = (_senado_get("/senador/lista/atual")
          .get("ListaParlamentarEmExercicio", {})
          .get("Parlamentares", {}).get("Parlamentar", []))
    out = []
    for x in pl:
        idp = x.get("IdentificacaoParlamentar", {}) or {}
        n, uf_, pt = idp.get("NomeParlamentar", ""), idp.get("UfParlamentar", ""), idp.get("SiglaPartidoParlamentar", "")
        if nome and nome.lower() not in (n or "").lower():
            continue
        if uf and uf.upper() != (uf_ or "").upper():
            continue
        if partido and partido.upper() != (pt or "").upper():
            continue
        out.append({"codigo": idp.get("CodigoParlamentar"), "nome": n, "partido": pt, "uf": uf_,
                    "email": idp.get("EmailParlamentar")})
        if len(out) >= limite:
            break
    return out


def detalhes_senador(codigo: int) -> Dict[str, Any]:
    d = _senado_get(f"/senador/{codigo}").get("DetalheParlamentar", {}).get("Parlamentar", {})
    idp = d.get("IdentificacaoParlamentar", {}) or {}
    man = (d.get("DadosBasicosParlamentar", {}) or {})
    return {"codigo": idp.get("CodigoParlamentar"), "nome": idp.get("NomeCompletoParlamentar"),
            "partido": idp.get("SiglaPartidoParlamentar"), "uf": idp.get("UfParlamentar"),
            "nascimento": man.get("DataNascimento"), "profissao": man.get("Profissao")}


def buscar_materias_senado(termo: str = "", sigla: str = "", ano: int = 0, limite: int = 10) -> List[Dict[str, Any]]:
    """Matérias (projetos) do Senado por palavra-chave, sigla (PL, PEC…) e/ou ano."""
    p: Dict[str, Any] = {}
    if termo:
        p["palavraChave"] = termo
    if sigla:
        p["sigla"] = sigla.upper()
    if ano:
        p["ano"] = ano
    d = _senado_get("/materia/pesquisa/lista", p)
    mats = ((d.get("PesquisaBasicaMateria", {}) or {}).get("Materias", {}) or {}).get("Materia", [])
    if isinstance(mats, dict):
        mats = [mats]
    return [{"materia": m.get("DescricaoIdentificacao"), "ementa": m.get("Ementa"),
             "autor": m.get("Autor"), "data": m.get("Data"), "url": m.get("UrlDetalheMateria")}
            for m in mats[:limite]]


# ── Glossário legislativo (local, instantâneo) ──────────────────────────────
_GLOSSARIO: Dict[str, str] = {
    "pec": "Proposta de Emenda à Constituição — altera o texto da Constituição; exige quórum qualificado (3/5) em dois turnos nas duas Casas.",
    "pl": "Projeto de Lei (ordinária) — cria ou altera leis comuns; aprovação por maioria simples.",
    "plp": "Projeto de Lei Complementar — regula matérias que a Constituição exige por lei complementar; quórum de maioria absoluta.",
    "mpv": "Medida Provisória — editada pelo Presidente com força de lei imediata; precisa ser convertida em lei pelo Congresso em até 120 dias.",
    "pdl": "Projeto de Decreto Legislativo — matéria de competência exclusiva do Congresso (ex.: sustar atos do Executivo).",
    "quórum": "Número mínimo de parlamentares para deliberar/aprovar (maioria simples, absoluta ou qualificada).",
    "regime de urgência": "Tramitação acelerada que dispensa prazos e algumas exigências regimentais.",
    "relator": "Parlamentar designado para analisar a matéria e apresentar parecer.",
    "emenda": "Proposta de alteração ao texto de uma proposição em tramitação.",
    "destaque": "Pedido para votar separadamente parte de uma proposição.",
    "veto": "Rejeição (total ou parcial) de um projeto pelo Presidente; pode ser derrubado pelo Congresso.",
    "sanção": "Aprovação de um projeto pelo Presidente, transformando-o em lei.",
    "promulgação": "Ato que atesta a existência da lei e ordena seu cumprimento.",
    "ceap": "Cota para o Exercício da Atividade Parlamentar — verba para despesas do mandato (a 'cota parlamentar').",
    "ceis": "Cadastro de Empresas Inidôneas e Suspensas — empresas sancionadas (Portal da Transparência).",
    "cnep": "Cadastro Nacional de Empresas Punidas — sanções da Lei Anticorrupção.",
}


def glossario(termo: str = "") -> Any:
    """Definições de termos legislativos. Sem termo, lista os disponíveis."""
    if not termo:
        return {"termos": sorted(_GLOSSARIO.keys())}
    t = termo.lower().strip()
    if t in _GLOSSARIO:
        return {"termo": termo, "definicao": _GLOSSARIO[t]}
    hits = {k: v for k, v in _GLOSSARIO.items() if t in k or t in v.lower()}
    return hits or {"erro": f"Termo '{termo}' não encontrado no glossário."}


# ── TSE (dados abertos via CKAN — datasets/arquivos) ────────────────────────
def _tse_datasets(termo: str, limite: int = 5) -> List[Dict[str, Any]]:
    """Busca conjuntos de dados do TSE (candidatos, resultados, contas). O TSE
    publica dados em arquivos (CSV/ZIP), não consulta por registro — retorna os
    datasets e seus links."""
    try:
        r = httpx.get("https://dadosabertos.tse.jus.br/api/3/action/package_search",
                      params={"q": termo, "rows": min(limite, 20)}, headers=_HEADERS, timeout=20)
        res = r.json().get("result", {})
        out = []
        for p in res.get("results", []):
            out.append({"titulo": p.get("title"),
                        "url": f"https://dadosabertos.tse.jus.br/dataset/{p.get('name')}",
                        "recursos": len(p.get("resources", []))})
        return out
    except Exception as e:  # noqa: BLE001
        return [{"erro": str(e)}]


# ── Portal da Transparência (requer chave grátis) ───────────────────────────
def _transparencia_ceis(nome_ou_cnpj: str = "", limite: int = 10) -> Any:
    """Empresas/pessoas sancionadas (CEIS). Requer TRANSPARENCIA_API_KEY
    (grátis em portaldatransparencia.gov.br/api-de-dados/cadastrar-email)."""
    import os

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return {"erro": "Configure TRANSPARENCIA_API_KEY (chave grátis) no .env para usar o Portal da Transparência."}
    try:
        params: Dict[str, Any] = {"pagina": 1}
        if nome_ou_cnpj:
            params["nomeSancionado"] = nome_ou_cnpj
        r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/ceis",
                      params=params, headers={**_HEADERS, "chave-api-dados": key}, timeout=20)
        if r.status_code != 200:
            return {"erro": f"HTTP {r.status_code}: {r.text[:120]}"}
        d = r.json()[:limite]
        return [{"sancionado": (x.get("pessoa") or {}).get("nome"),
                 "tipo": (x.get("tipoSancao") or {}).get("descricaoResumida"),
                 "orgao": (x.get("orgaoSancionador") or {}).get("nome"),
                 "data_inicio": x.get("dataInicioSancao")} for x in d]
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


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

    @mcp.tool()
    def senado_buscar_senadores(nome: str = "", uf: str = "", partido: str = "", limite: int = 15) -> list:
        """Busca senadores em exercício por nome, UF e/ou partido (Senado Federal)."""
        return buscar_senadores(nome, uf, partido, limite)

    @mcp.tool()
    def senado_detalhes_senador(codigo: int) -> dict:
        """Detalhes de um senador pelo código (Senado Federal)."""
        return detalhes_senador(codigo)

    @mcp.tool()
    def senado_buscar_materias(termo: str = "", sigla: str = "", ano: int = 0, limite: int = 10) -> list:
        """Busca matérias/projetos do Senado por palavra-chave, sigla (PL, PEC…) e/ou ano."""
        return buscar_materias_senado(termo, sigla, ano, limite)

    @mcp.tool()
    def glossario_legislativo(termo: str = "") -> "Any":
        """Define termos legislativos (PEC, PL, MPV, quórum, veto, CEAP, CEIS…). Sem termo, lista todos."""
        return glossario(termo)

    @mcp.tool()
    def _tse_datasets(termo: str, limite: int = 5) -> list:
        """Busca conjuntos de dados do TSE (candidatos, resultados, prestação de contas) — retorna títulos e links."""
        return _tse_datasets(termo, limite)

    @mcp.tool()
    def _transparencia_ceis(nome_ou_cnpj: str = "", limite: int = 10) -> "Any":
        """Empresas/pessoas sancionadas (CEIS) no Portal da Transparência. Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_ceis(nome_ou_cnpj, limite)

    return mcp


if __name__ == "__main__":
    _build_server().run()
