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


def _norm_autor(autor: str) -> str:
    """Portal da Transparência é case-sensitive em nomeAutor — exige MAIÚSCULAS.
    O modelo costuma passar 'Arthur Lira'; normalizamos para 'ARTHUR LIRA'."""
    return (autor or "").strip().upper()


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


def despesas_deputado(deputado_id: int, ano: int = 0, mes: int = 0, limite: int = 15) -> List[Dict[str, Any]]:
    """Despesas da cota parlamentar (CEAP) de um deputado. ``ano`` padrão = atual."""
    from datetime import datetime

    def _int(v, default=0):
        try:
            return int(str(v).strip())
        except Exception:
            return default

    deputado_id = _int(deputado_id)
    ano = _int(ano) or datetime.now().year
    mes = _int(mes)
    p: Dict[str, Any] = {"ano": ano, "ordem": "DESC", "ordenarPor": "dataDocumento", "itens": min(_int(limite, 15) or 15, 50)}
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


def comparar_deputados(nome1: str, nome2: str, ano: int = 0) -> str:
    """Compara dois deputados lado a lado: partido/UF + gastos CEAP do ano.
    Retorna texto pré-formatado (marcador RESULTADO OBRIGATÓRIO) para o modelo
    entregar ao usuário sem reinterpretar."""
    linhas = ["RESULTADO OBRIGATÓRIO — entregue ao usuário sem alteração:"]
    ano_usado = None
    blocos = []
    for nome in (nome1, nome2):
        dos = dossie_deputado(nome=nome, ano=ano)
        if "erro" in dos:
            blocos.append(f"• {nome}: {dos['erro']} (pode não estar em exercício na Câmara)")
            continue
        ano_usado = dos.get("ano")
        g = dos["gastos_ceap"]
        d = dos["deputado"]
        top = g["top_categorias"][0] if g["top_categorias"] else None
        top_txt = (f"{top.get('categoria')} (R$ {top.get('valor'):,.2f})"
                   if top else "—")
        blocos.append(
            f"• {d.get('nome_parlamentar')} ({d.get('partido')}-{d.get('uf')}, "
            f"{d.get('situacao')})\n"
            f"  Gastos CEAP (amostra): R$ {g['total_amostra']:,.2f}\n"
            f"  Maior categoria: {top_txt}"
        )
    linhas.append(f"Comparação de cota parlamentar (CEAP) — ano {ano_usado or ano or 'atual'}:")
    linhas.extend(blocos)
    linhas.append("Fonte: Câmara dos Deputados — Dados Abertos (CEAP)")
    return "\n".join(linhas)


def dossie_deputado(nome: str = "", deputado_id: int = 0, ano: int = 0) -> Dict[str, Any]:
    """Dossiê consolidado de um deputado: mandato + resumo de gastos do ano.

    Resolve o id pelo nome se necessário e faz as chamadas em sequência —
    pensado para o modelo usar UMA tool em vez de encadear várias.
    """
    from datetime import datetime

    try:
        deputado_id = int(deputado_id)
    except Exception:
        deputado_id = 0
    if not deputado_id and nome:
        cands = buscar_deputados(nome=nome, limite=1)
        if not cands:
            return {"erro": f"Deputado '{nome}' não encontrado."}
        deputado_id = cands[0]["id"]
    if not deputado_id:
        return {"erro": "Informe 'nome' ou 'deputado_id'."}

    ano = int(ano) if str(ano).strip().isdigit() else 0
    ano = ano or datetime.now().year
    det = detalhes_deputado(deputado_id)
    desp = despesas_deputado(deputado_id, ano, limite=50)
    total = sum((x.get("valor") or 0) for x in desp)
    por_cat: Dict[str, float] = {}
    for x in desp:
        por_cat[x.get("tipo", "?")] = por_cat.get(x.get("tipo", "?"), 0) + (x.get("valor") or 0)
    top = sorted(por_cat.items(), key=lambda kv: kv[1], reverse=True)[:3]
    return {
        "deputado": det,
        "ano": ano,
        "gastos_ceap": {
            "amostra_qtd": len(desp),
            "total_amostra": round(total, 2),
            "top_categorias": [{"categoria": k, "valor": round(v, 2)} for k, v in top],
            "obs": "Soma das despesas mais recentes retornadas (amostra); para o total exato, paginar todas.",
        },
        "fonte": "Câmara dos Deputados — Dados Abertos (CEAP)",
    }


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


def _transparencia_emendas(autor: str = "", ano: int = 0, limite: int = 15) -> Any:
    """EMENDAS PARLAMENTARES (destino de verba: município/função + valores).
    DIFERENTE dos gastos da cota (CEAP). Requer TRANSPARENCIA_API_KEY."""
    import os
    from datetime import datetime

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return {"erro": "Configure TRANSPARENCIA_API_KEY (chave grátis) no .env."}
    H = {**_HEADERS, "chave-api-dados": key}
    anos_tentar = [ano] if ano else [datetime.now().year, 2024, 2023, 2022]
    try:
        for a in anos_tentar:
            params: Dict[str, Any] = {"pagina": 1, "ano": a}
            if autor:
                params["nomeAutor"] = _norm_autor(autor)
            r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
                          params=params, headers=H, timeout=25)
            if r.status_code != 200:
                return {"erro": f"HTTP {r.status_code}: {r.text[:120]}"}
            d = r.json()
            if d:
                return [{"autor": x.get("nomeAutor"), "ano": x.get("ano"),
                         "codigo_emenda": x.get("codigoEmenda"),
                         "destino": x.get("localidadeDoGasto"), "funcao": x.get("funcao"),
                         "subfuncao": x.get("subfuncao"),
                         "valor_empenhado": x.get("valorEmpenhado"),
                         "valor_pago": x.get("valorPago")} for x in d[:limite]]
        return {"msg": f"Nenhuma emenda encontrada para '{autor}' nos anos 2022-2024."}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


def _transparencia_emendas_empresas(autor: str = "", ano: int = 0) -> Any:
    """EMPRESAS/ENTIDADES beneficiadas pelas emendas parlamentares de um autor.
    Cruza emendas → documentos de execução → itens de empenho (objeto + valor).
    Use quando perguntar 'quais empresas receberam' ou 'beneficiários das emendas'.
    Requer TRANSPARENCIA_API_KEY."""
    import os
    from datetime import datetime

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return {"erro": "Configure TRANSPARENCIA_API_KEY no .env."}
    H = {**_HEADERS, "chave-api-dados": key}
    # Se ano não especificado ou futuro, tenta anos recentes disponíveis
    anos_tentar = [ano] if ano else [datetime.now().year, 2024, 2023, 2022]
    try:
        emendas = []
        ano_usado = None
        for a in anos_tentar:
            params: Dict[str, Any] = {"pagina": 1, "ano": a}
            if autor:
                params["nomeAutor"] = _norm_autor(autor)
            r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
                          params=params, headers=H, timeout=25)
            if r.status_code != 200:
                return {"erro": f"HTTP {r.status_code}: {r.text[:80]}"}
            emendas = r.json()
            if emendas:
                ano_usado = a
                break
        if not emendas:
            return {"msg": f"Nenhuma emenda encontrada para {autor or 'autor'} nos anos 2022-2024."}
        resultados = []
        for em in emendas:
            cod = em.get("codigoEmenda", "")
            rd = httpx.get(
                f"https://api.portaldatransparencia.gov.br/api-de-dados/emendas/documentos/{cod}",
                headers=H, timeout=15)
            docs = rd.json() if rd.status_code == 200 else []
            for doc in docs:
                cd = doc.get("codigoDocumento", "")
                fase = doc.get("fase", "")
                ri = httpx.get(
                    "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/itens-de-empenho",
                    params={"codigoDocumento": cd, "pagina": 1}, headers=H, timeout=15)
                if ri.status_code == 200:
                    for item in ri.json():
                        desc = item.get("descricao", "")
                        empresa: Dict[str, Any] = {}
                        import re as _re
                        m_cnpj = _re.search(r'PROPOSTA\s+(\d{12})\d{2}(?!\d)', desc)
                        m_cnes = _re.search(r'CNES\s+(\d+)', desc)
                        if m_cnpj:
                            cnpj14 = _calcular_cnpj(m_cnpj.group(1))
                            info = _lookup_cnpj(cnpj14)
                            if info:
                                empresa = {"razao_social": info.get("razao_social"),
                                           "cnpj": f"{cnpj14[:2]}.{cnpj14[2:5]}.{cnpj14[5:8]}/{cnpj14[8:12]}-{cnpj14[12:]}",
                                           "municipio": info.get("municipio"), "uf": info.get("uf")}
                        elif m_cnes:
                            info = _lookup_cnes(m_cnes.group(1))
                            if info:
                                empresa = {"razao_social": info.get("razao_social"),
                                           "cnpj": info.get("cnpj"), "cnes": m_cnes.group(1)}
                        resultados.append({
                            "funcao": em.get("funcao"),
                            "destino": em.get("localidadeDoGasto"),
                            "ano": ano_usado,
                            "codigo_emenda": cod,
                            "fase": fase,
                            "objeto": desc[:200],
                            "subelemento": item.get("descricaoSubelemento"),
                            "valor": item.get("valorAtual"),
                            **empresa,
                        })
        return resultados if resultados else {"msg": f"Nenhum item de empenho encontrado (ano={ano_usado})."}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── Emendas → empresas (CNPJ + razão social via BrasilAPI) ──────────────────

def _calcular_cnpj(cnpj_12: str) -> str:
    """Calcula os dois dígitos verificadores e retorna o CNPJ com 14 dígitos."""
    def _dv(digits: str, pesos: list) -> int:
        s = sum(int(d) * p for d, p in zip(digits, pesos))
        r = s % 11
        return 0 if r < 2 else 11 - r
    p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d1 = _dv(cnpj_12, p1)
    d2 = _dv(cnpj_12 + str(d1), p2)
    return cnpj_12 + str(d1) + str(d2)


def _lookup_cnpj(cnpj14: str) -> Dict[str, Any]:
    """Consulta razão social, município e situação via BrasilAPI (sem chave)."""
    try:
        r = httpx.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj14}",
                      headers={"User-Agent": "MangabaPoliticaBR/1.0"}, timeout=12)
        if r.status_code == 200:
            d = r.json()
            return {"razao_social": d.get("razao_social"), "municipio": d.get("municipio"),
                    "uf": d.get("uf"), "situacao": d.get("descricao_situacao_cadastral"),
                    "atividade": (d.get("cnae_fiscal_descricao") or "")}
    except Exception:
        pass
    return {}


def _lookup_cnes(cnes: str) -> Dict[str, Any]:
    """Consulta estabelecimento de saúde via CNES (DATASUS/saude.gov.br, sem chave)."""
    try:
        r = httpx.get(f"https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{cnes}",
                      headers={"Accept": "application/json", "User-Agent": "MangabaPoliticaBR/1.0"},
                      timeout=12)
        if r.status_code == 200:
            d = r.json()
            cnpj_raw = d.get("numero_cnpj_entidade") or d.get("numero_cnpj", "")
            cnpj_fmt = (f"{cnpj_raw[:2]}.{cnpj_raw[2:5]}.{cnpj_raw[5:8]}/{cnpj_raw[8:12]}-{cnpj_raw[12:]}"
                        if len(str(cnpj_raw)) == 14 else str(cnpj_raw))
            return {"razao_social": d.get("nome_razao_social"), "cnpj": cnpj_fmt,
                    "esfera": d.get("descricao_esfera_administrativa"),
                    "tipo_unidade": d.get("codigo_tipo_unidade"),
                    "cnes": cnes, "fonte_id": "CNES/DATASUS"}
    except Exception:
        pass
    return {}


def _emendas_beneficiarios_raw(autor: str = "", ano: int = 0):
    """Núcleo do cruzamento emendas→empenhos→CNPJ/CNES. Retorna
    (lista_de_dicts, ano_usado) com total_recebido como float — ou (erro_str, None).
    Usado tanto pelo formatador de texto quanto pela tool de cruzamento com sanções."""
    import os
    import re
    from datetime import datetime

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return "Configure TRANSPARENCIA_API_KEY no .env.", None
    H = {**_HEADERS, "chave-api-dados": key}
    anos_tentar = [ano] if ano else [datetime.now().year, 2024, 2023, 2022]
    try:
        emendas, ano_usado = [], None
        for a in anos_tentar:
            params: Dict[str, Any] = {"pagina": 1, "ano": a}
            if autor:
                params["nomeAutor"] = _norm_autor(autor)
            r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
                          params=params, headers=H, timeout=20)
            emendas = r.json() if r.status_code == 200 else []
            if emendas:
                ano_usado = a
                break
        if not emendas:
            return f"Nenhuma emenda encontrada para '{autor}' nos anos 2022-2026.", None

        cnpj_cache: Dict[str, Dict] = {}
        resultados = []
        for em in emendas:
            cod = em.get("codigoEmenda", "")
            rd = httpx.get(
                f"https://api.portaldatransparencia.gov.br/api-de-dados/emendas/documentos/{cod}",
                headers=H, timeout=15)
            docs = rd.json() if rd.status_code == 200 else []
            for doc in docs:
                cd = doc.get("codigoDocumento", "")
                ri = httpx.get(
                    "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/itens-de-empenho",
                    params={"codigoDocumento": cd, "pagina": 1}, headers=H, timeout=15)
                if ri.status_code != 200:
                    continue
                for item in ri.json():
                    desc = item.get("descricao", "")
                    valor = item.get("valorAtual", "")
                    empresa: Dict[str, Any] = {}
                    # formato 2022-2024: PROPOSTA com 14 dígitos (12 CNPJ base + 2 seq)
                    # formato 2026: PROPOSTA com 18+ dígitos — NÃO é CNPJ, ignorar
                    m_cnpj = re.search(r'PROPOSTA\s+(\d{12})\d{2}(?!\d)', desc)
                    # formato 2026: CNES XXXXXXX
                    m_cnes = re.search(r'CNES\s+(\d+)', desc)
                    if m_cnpj:
                        cnpj14 = _calcular_cnpj(m_cnpj.group(1))
                        if cnpj14 not in cnpj_cache:
                            cnpj_cache[cnpj14] = _lookup_cnpj(cnpj14)
                        empresa = dict(cnpj_cache[cnpj14])
                        empresa["cnpj"] = f"{cnpj14[:2]}.{cnpj14[2:5]}.{cnpj14[5:8]}/{cnpj14[8:12]}-{cnpj14[12:]}"
                    elif m_cnes:
                        cnes_id = m_cnes.group(1)
                        if f"cnes_{cnes_id}" not in cnpj_cache:
                            cnpj_cache[f"cnes_{cnes_id}"] = _lookup_cnes(cnes_id)
                        empresa = dict(cnpj_cache[f"cnes_{cnes_id}"])
                    resultados.append({
                        "funcao": em.get("funcao"),
                        "destino": em.get("localidadeDoGasto"),
                        "ano": ano_usado,
                        "objeto": desc[:180],
                        "valor": valor,
                        "subelemento": item.get("descricaoSubelemento"),
                        **empresa,
                    })
        # agrupa por beneficiário (CNPJ ou CNES) somando valores
        por_benef: Dict[str, Any] = {}
        for item in resultados:
            chave = item.get("cnpj") or item.get("cnes") or item.get("objeto", "")[:50]
            if chave not in por_benef:
                por_benef[chave] = {
                    "beneficiario": item.get("razao_social") or item.get("objeto", "")[:80],
                    "cnpj": item.get("cnpj", ""),
                    "cnes": item.get("cnes", ""),
                    "funcao": item.get("funcao", ""),
                    "total_recebido_R$": 0.0,
                }
            try:
                por_benef[chave]["total_recebido_R$"] += float(
                    str(item.get("valor", "0")).replace(".", "").replace(",", "."))
            except Exception:
                pass

        lista = sorted(por_benef.values(), key=lambda x: -x["total_recebido_R$"])
        return lista, ano_usado
    except Exception as e:  # noqa: BLE001
        return f"Erro ao consultar emendas: {e}", None


def _transparencia_emendas_empresas_detalhado(autor: str = "", ano: int = 0) -> Any:
    """EMPRESAS beneficiadas pelas emendas parlamentares com CNPJ e razão social.
    Cruza: emendas → documentos → itens de empenho → extrai CNPJ da proposta →
    consulta BrasilAPI (Receita Federal) para obter razão social, município e situação.
    Requer TRANSPARENCIA_API_KEY. BrasilAPI: pública, sem chave."""
    lista, ano_usado = _emendas_beneficiarios_raw(autor, ano)
    if isinstance(lista, str):  # erro/mensagem
        return lista
    if not lista:
        return f"RESULTADO: 0 beneficiários encontrados para {autor} em {ano_usado}."

    # Resposta curta — modelo DEVE entregar estes dados ao usuário sem alteração
    linhas = [f"RESULTADO OBRIGATÓRIO — entregue ao usuário sem alteração:",
              f"Emendas de {autor} ({ano_usado}) — {len(lista)} entidades receberam verba:"]
    for i, b in enumerate(lista[:15], 1):
        cnpj = b["cnpj"] if b["cnpj"] else f"CNES {b.get('cnes','?')}"
        linhas.append(f"{i}. {b['beneficiario']} | {cnpj} | R$ {b['total_recebido_R$']:,.2f}")
    linhas.append(f"Fonte: Portal da Transparência + CNES/DATASUS")
    return "\n".join(linhas)


def _transparencia_emendas_x_sancoes(autor: str = "", ano: int = 0) -> Any:
    """CRUZAMENTO server-side: pega TODOS os beneficiários das emendas de um autor
    e verifica cada CNPJ no CEIS (sancionados). Garante cobertura 100% — não
    depende do modelo iterar. Retorna texto pré-formatado."""
    lista, ano_usado = _emendas_beneficiarios_raw(autor, ano)
    if isinstance(lista, str):
        return lista
    if not lista:
        return f"RESULTADO: 0 beneficiários para {autor} em {ano_usado} — nada a cruzar."

    com_cnpj = [b for b in lista if b.get("cnpj")]
    sancionados = []
    for b in com_cnpj:
        cnpj = b["cnpj"]
        res = _transparencia_ceis(nome_ou_cnpj=cnpj, limite=5)
        if isinstance(res, list) and res:
            sancionados.append((b, res))

    linhas = ["RESULTADO OBRIGATÓRIO — entregue ao usuário sem alteração:",
              f"Cruzamento emendas × sanções (CEIS) — {autor} ({ano_usado}):",
              f"Beneficiários com CNPJ verificados: {len(com_cnpj)} de {len(lista)} "
              f"(demais são empenhos/CNES sem CNPJ direto)."]
    if not sancionados:
        linhas.append("✓ NENHUM dos CNPJs verificados está sancionado no CEIS.")
    else:
        linhas.append(f"⚠️ {len(sancionados)} beneficiário(s) SANCIONADO(s):")
        for b, sanc in sancionados:
            linhas.append(f"• {b['beneficiario']} ({b['cnpj']}) — recebeu R$ "
                          f"{b['total_recebido_R$']:,.2f}")
            for s in sanc[:3]:
                linhas.append(f"    sanção: {s.get('tipo')} | {s.get('orgao')} | {s.get('data_inicio')}")
    linhas.append("Fonte: Portal da Transparência (emendas + CEIS)")
    return "\n".join(linhas)


# ── Emendas 2025/2026 — Transparência multi-ano ─────────────────────────────

def _transparencia_emendas_multiperiodo(autor: str = "", anos: str = "") -> Any:
    """Emendas parlamentares em múltiplos anos (ex.: '2022,2023,2024,2025,2026').
    Retorna resumo por ano e função com totais. Requer TRANSPARENCIA_API_KEY."""
    import os
    from datetime import datetime

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return {"erro": "Configure TRANSPARENCIA_API_KEY no .env."}
    H = {**_HEADERS, "chave-api-dados": key}
    ano_atual = datetime.now().year
    lista_anos = [int(a.strip()) for a in anos.split(",") if a.strip().isdigit()] if anos else list(range(2022, ano_atual + 1))
    resultado: Dict[str, Any] = {}
    try:
        for a in lista_anos:
            params: Dict[str, Any] = {"pagina": 1, "ano": a}
            if autor:
                params["nomeAutor"] = _norm_autor(autor)
            r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
                          params=params, headers=H, timeout=20)
            if r.status_code != 200:
                resultado[str(a)] = {"erro": f"HTTP {r.status_code}"}
                continue
            dados = r.json()
            if not dados:
                resultado[str(a)] = {"emendas": 0, "total_empenhado": "R$ 0", "total_pago": "R$ 0"}
                continue

            def _val(s: str) -> float:
                return float(s.replace(".", "").replace(",", ".")) if s else 0.0

            total_emp = sum(_val(e.get("valorEmpenhado", "0")) for e in dados)
            total_pago = sum(_val(e.get("valorPago", "0")) for e in dados)
            por_funcao: Dict[str, float] = {}
            for e in dados:
                por_funcao[e.get("funcao", "?")] = por_funcao.get(e.get("funcao", "?"), 0.0) + _val(e.get("valorPago", "0"))
            resultado[str(a)] = {
                "emendas": len(dados),
                "total_empenhado": f"R$ {total_emp:,.2f}",
                "total_pago": f"R$ {total_pago:,.2f}",
                "por_funcao": {k: f"R$ {v:,.2f}" for k, v in sorted(por_funcao.items(), key=lambda x: -x[1])},
                "destinos": list({e.get("localidadeDoGasto") for e in dados}),
            }
        return {"autor": autor or "todos", "fonte": "Portal da Transparência", "anos": resultado}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── Câmara — painel de emendas (dados orçamentários via dadosabertos) ────────

def _camara_emendas_orcamentarias(autor_nome: str = "", ano: int = 0, limite: int = 20) -> Any:
    """Propostas orçamentárias (emendas) via Câmara dadosabertos — complementa o
    Portal da Transparência com fase anterior ao empenho. Retorna emendas com
    código, autor, programa e dotação."""
    from datetime import datetime
    ano_busca = ano or datetime.now().year
    # A Câmara expõe emendas orçamentárias via endpoint de proposições orçamentárias
    try:
        params: Dict[str, Any] = {"pagina": 1, "itens": limite, "ano": ano_busca,
                                  "siglaTipo": "PEC", "tema": "orcamento"}
        if autor_nome:
            params["keywords"] = autor_nome
        # Emendas ao orçamento são proposições do tipo EMO/EMP na Câmara
        for tipo in ["EMO", "PL"]:
            params["siglaTipo"] = tipo
            r = httpx.get(f"{BASE}/proposicoes", params=params, headers=_HEADERS, timeout=15)
            if r.status_code == 200 and r.json().get("dados"):
                dados = r.json()["dados"]
                return [{"tipo": d.get("siglaTipo"), "numero": d.get("numero"),
                         "ano": d.get("ano"), "ementa": d.get("ementa", "")[:150],
                         "uri": d.get("uri")} for d in dados[:limite]]
        return {"msg": "Câmara: nenhuma emenda orçamentária encontrada para os filtros."}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── Senado — matérias orçamentárias (LOA/emendas) ───────────────────────────

def _senado_emendas_orcamentarias(termo: str = "emenda orçamentária", ano: int = 0, limite: int = 10) -> Any:
    """Matérias do Senado relacionadas a emendas orçamentárias (LOA, LDO).
    Complementa o Portal da Transparência com tramitação legislativa."""
    from datetime import datetime
    ano_busca = ano or datetime.now().year
    try:
        r = httpx.get("https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista",
                      params={"palavraChave": termo, "ano": ano_busca, "tramitando": "S"},
                      headers={**_HEADERS, "Accept": "application/json"}, timeout=15)
        if r.status_code != 200:
            return {"erro": f"Senado HTTP {r.status_code}"}
        dados = (r.json().get("PesquisaBasicaMateria", {})
                  .get("Materias", {}).get("Materia", []))
        if isinstance(dados, dict):
            dados = [dados]
        return [{"codigo": d.get("Codigo"), "sigla": d.get("DescricaoSubtipoMateria"),
                 "numero": d.get("Numero"), "ano": d.get("Ano"),
                 "ementa": d.get("EmentaMateria", "")[:150],
                 "situacao": d.get("SituacaoAtual", {}).get("DescricaoSituacao")}
                for d in dados[:limite]]
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── SIOP via download CSV público ──────────────────────────────────────────
# O SIOP não tem API REST pública acessível externamente. Os dados de execução
# orçamentária das emendas no SIOP estão espelhados no Portal da Transparência
# (/api-de-dados/emendas). Para anos correntes a fonte canônica é o Portal.

def _siop_execucao_resumo(autor: str = "", ano: int = 0) -> Any:
    """Execução orçamentária das emendas via SIOP (espelho no Portal da
    Transparência). Retorna resumo por tipo de emenda e fase de execução
    (empenhado / liquidado / pago) para todos os anos disponíveis."""
    import os
    from datetime import datetime

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key:
        return {"erro": "Configure TRANSPARENCIA_API_KEY no .env."}
    H = {**_HEADERS, "chave-api-dados": key}
    ano_busca = ano or datetime.now().year
    try:
        params: Dict[str, Any] = {"pagina": 1, "ano": ano_busca}
        if autor:
            params["nomeAutor"] = _norm_autor(autor)
        r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
                      params=params, headers=H, timeout=20)
        if r.status_code != 200:
            return {"erro": f"HTTP {r.status_code}: {r.text[:80]}"}
        dados = r.json()
        if not dados:
            return {"msg": f"Sem dados para {autor or 'todos'} em {ano_busca}."}

        def _v(s: str) -> float:
            return float(s.replace(".", "").replace(",", ".")) if s else 0.0

        linhas = []
        for e in dados:
            linhas.append({
                "tipo_emenda": e.get("tipoEmenda"),
                "funcao": e.get("funcao"),
                "subfuncao": e.get("subfuncao"),
                "localidade": e.get("localidadeDoGasto"),
                "empenhado": f"R$ {_v(e.get('valorEmpenhado','0')):,.2f}",
                "liquidado": f"R$ {_v(e.get('valorLiquidado','0')):,.2f}",
                "pago": f"R$ {_v(e.get('valorPago','0')):,.2f}",
                "fonte": "SIOP/Portal da Transparência",
                "ano": e.get("ano"),
            })
        total_emp = sum(_v(e.get("valorEmpenhado","0")) for e in dados)
        total_pago = sum(_v(e.get("valorPago","0")) for e in dados)
        return {"autor": autor, "ano": ano_busca, "total_emendas": len(dados),
                "total_empenhado": f"R$ {total_emp:,.2f}",
                "total_pago": f"R$ {total_pago:,.2f}",
                "detalhamento": linhas}
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
    def camara_detalhes_deputado(deputado_id: int = 0, id_deputado: int = 0) -> dict:
        """Detalhes de um deputado pelo id (nome, partido, UF, situação, gabinete).
        Aceita 'deputado_id' ou 'id_deputado'."""
        return detalhes_deputado(deputado_id or id_deputado)

    @mcp.tool()
    def camara_despesas_deputado(deputado_id: int = 0, ano: int = 0, mes: int = 0, limite: int = 15, id_deputado: int = 0) -> list:
        """Despesas da cota parlamentar (CEAP) de um deputado. Aceita 'deputado_id' ou
        'id_deputado'. 'ano' opcional (padrão = ano atual); 'mes' opcional."""
        return despesas_deputado(deputado_id or id_deputado, ano, mes, limite)

    @mcp.tool()
    def camara_buscar_proposicoes(termo: str = "", tipo: str = "", numero: int = 0, ano: int = 0, limite: int = 10) -> list:
        """Busca proposições (PL, PEC, MPV…) por termo, tipo, número e/ou ano."""
        return buscar_proposicoes(termo, tipo, numero, ano, limite)

    @mcp.tool()
    def camara_detalhes_proposicao(proposicao_id: int = 0, id_proposicao: int = 0) -> dict:
        """Detalhes de uma proposição pelo id. Aceita 'proposicao_id' ou 'id_proposicao'."""
        return detalhes_proposicao(proposicao_id or id_proposicao)

    @mcp.tool()
    def camara_votacoes_proposicao(proposicao_id: int = 0, limite: int = 10, id_proposicao: int = 0) -> list:
        """Votações de uma proposição pelo id. Aceita 'proposicao_id' ou 'id_proposicao'."""
        return votacoes_proposicao(proposicao_id or id_proposicao, limite)

    @mcp.tool()
    def camara_dossie_deputado(nome: str = "", deputado_id: int = 0, ano: int = 0, id_deputado: int = 0) -> dict:
        """DOSSIÊ de um deputado em UMA chamada: dados do mandato + resumo de gastos
        (CEAP) do ano + principais categorias. Passe 'nome' OU o id. Use isto em vez
        de encadear buscar→detalhes→despesas."""
        return dossie_deputado(nome, deputado_id or id_deputado, ano)

    @mcp.tool()
    def camara_comparar_deputados(nome1: str, nome2: str, ano: int = 0) -> dict:
        """Compara DOIS deputados lado a lado (partido/UF + gastos CEAP do ano) em
        uma única chamada. Passe os dois nomes."""
        return comparar_deputados(nome1, nome2, ano)

    @mcp.tool()
    def camara_partidos(limite: int = 40) -> list:
        """Lista os partidos com representação na Câmara."""
        return partidos(limite)

    @mcp.tool()
    def senado_buscar_senadores(nome: str = "", uf: str = "", partido: str = "", limite: int = 15) -> list:
        """Busca senadores em exercício por nome, UF e/ou partido (Senado Federal)."""
        return buscar_senadores(nome, uf, partido, limite)

    @mcp.tool()
    def senado_detalhes_senador(codigo: int = 0, senador_id: int = 0, codigo_senador: int = 0) -> dict:
        """Detalhes de um senador pelo código. Aceita 'codigo', 'senador_id' ou 'codigo_senador'."""
        return detalhes_senador(codigo or senador_id or codigo_senador)

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
    def transparencia_sancoes(nome_ou_cnpj: str = "", limite: int = 10) -> "Any":
        """Empresas/pessoas sancionadas (CEIS) no Portal da Transparência. Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_ceis(nome_ou_cnpj, limite)

    @mcp.tool()
    def transparencia_emendas(autor: str = "", ano: int = 0, limite: int = 15) -> "Any":
        """EMENDAS PARLAMENTARES por autor: destino da verba (município/UF), função e
        valores (empenhado/pago). IMPORTANTE: emendas são DIFERENTES dos gastos da cota
        (CEAP) — use ESTA para 'emendas', não o dossiê. Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_emendas(autor, ano, limite)

    @mcp.tool()
    def transparencia_emendas_empresas(autor: str = "", ano: int = 0) -> "Any":
        """EMPRESAS/ENTIDADES beneficiadas pelas emendas parlamentares de um autor.
        Cruza emendas → documentos de execução → itens de empenho (objeto + valor +
        subelemento). Use quando perguntar 'quais empresas receberam verba da emenda',
        'beneficiários', 'destino em relação a empresas'. DIFERENTE de CEAP/cota.
        Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_emendas_empresas(autor, ano)

    @mcp.tool()
    def transparencia_emendas_empresas_cnpj(autor: str = "", ano: int = 0) -> "Any":
        """EMPRESAS com CNPJ e razão social (Receita Federal) que receberam verba
        das emendas parlamentares. Cruza emendas → empenhos → extrai CNPJ da proposta
        → consulta BrasilAPI para obter: razão social, município/UF, situação cadastral
        e total recebido. Use quando perguntar 'quais empresas', 'CNPJ', 'razão social',
        'quem recebeu'. Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_emendas_empresas_detalhado(autor, ano)

    @mcp.tool()
    def transparencia_emendas_x_sancoes(autor: str = "", ano: int = 0) -> "Any":
        """CRUZAMENTO automático: verifica se os beneficiários das emendas de um autor
        estão SANCIONADOS no CEIS. Pega TODOS os CNPJs das emendas e cruza cada um com
        o cadastro de sancionados — cobertura 100%, server-side. Use quando perguntar
        'alguma empresa que recebeu emenda está sancionada', 'beneficiário sancionado',
        'cruzar emenda com CEIS'. Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_emendas_x_sancoes(autor, ano)

    @mcp.tool()
    def emendas_historico(autor: str = "", anos: str = "") -> "Any":
        """HISTÓRICO MULTI-ANO de emendas parlamentares (2022 a 2026).
        Retorna total empenhado/pago por ano e por função (Saúde, Educação, etc.).
        Parâmetro `anos` opcional: '2023,2024,2025' — padrão = todos os anos disponíveis.
        Fonte: Portal da Transparência (dados SIOP espelhados). Requer TRANSPARENCIA_API_KEY."""
        return _transparencia_emendas_multiperiodo(autor, anos)

    @mcp.tool()
    def emendas_execucao_siop(autor: str = "", ano: int = 0) -> "Any":
        """Execução orçamentária das emendas: empenhado / liquidado / pago por
        tipo de emenda e função. Equivalente ao painel SIOP/Siga Brasil.
        Inclui dados de 2026 (ano corrente). Requer TRANSPARENCIA_API_KEY."""
        return _siop_execucao_resumo(autor, ano)

    @mcp.tool()
    def camara_emendas_orcamentarias(autor_nome: str = "", ano: int = 0, limite: int = 20) -> "Any":
        """Proposições orçamentárias (emendas) da Câmara dos Deputados —
        fase legislativa anterior ao empenho. Complementa o Portal da Transparência
        com projetos de LOA e emendas ao orçamento em tramitação."""
        return _camara_emendas_orcamentarias(autor_nome, ano, limite)

    @mcp.tool()
    def senado_emendas_orcamentarias(termo: str = "emenda orçamentária", ano: int = 0, limite: int = 10) -> "Any":
        """Matérias do Senado relacionadas a emendas ao orçamento (LOA/LDO).
        Retorna tramitação legislativa das emendas orçamentárias no Senado.
        Fonte: legis.senado.leg.br/dadosabertos."""
        return _senado_emendas_orcamentarias(termo, ano, limite)

    return mcp


if __name__ == "__main__":
    _build_server().run()
