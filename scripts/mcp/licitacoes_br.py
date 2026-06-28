#!/usr/bin/env python3
"""Servidor MCP "Licitações BR" — licitações e contratos públicos via PNCP.

Fonte oficial: PNCP (Portal Nacional de Contratações Públicas, Lei 14.133/2021)
  https://pncp.gov.br/api/consulta  — REST público, SEM chave.

Foco em Alagoas (UF padrão = AL), mas todas as ferramentas aceitam outra UF.
Cobre: licitações com proposta aberta, publicações por período, itens de uma
contratação, contratos firmados e atas de registro de preços.

Rodar como servidor MCP (stdio):
    python scripts/mcp/licitacoes_br.py
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

PNCP = "https://pncp.gov.br/api/consulta/v1"
PNCP_ITENS = "https://pncp.gov.br/api/pncp/v1"
_H = {"Accept": "application/json", "User-Agent": "MangabaLicitacoesBR/1.0"}

# Modalidades de contratação (Lei 14.133/2021) — código → nome
MODALIDADES = {
    1: "Leilão (eletrônico)", 2: "Leilão (presencial)", 3: "Diálogo competitivo",
    4: "Concorrência (eletrônica)", 5: "Concorrência (presencial)",
    6: "Pregão (eletrônico)", 7: "Pregão (presencial)", 8: "Dispensa de licitação",
    9: "Inexigibilidade", 10: "Manifestação de interesse", 11: "Pré-qualificação",
    12: "Credenciamento", 13: "Leilão",
}
# Modalidades mais usadas — varridas quando o usuário não especifica uma
_MODALIDADES_COMUNS = [6, 8, 9, 4, 7]


def _fmt_dt(s: str) -> str:
    """'2026-07-15T09:00:00' → '15/07/2026 09:00'."""
    if not s or "T" not in s:
        return s or ""
    d, h = s.split("T")
    a, m, dia = d.split("-")
    return f"{dia}/{m}/{a} {h[:5]}"


def _fmt_money(v: Any) -> str:
    try:
        return f"R$ {float(v):,.2f}"
    except Exception:
        return "—"


def _resumir(c: Dict[str, Any]) -> Dict[str, Any]:
    """Extrai os campos úteis de uma contratação do PNCP."""
    uo = c.get("unidadeOrgao") or {}
    oe = c.get("orgaoEntidade") or {}
    return {
        "objeto": (c.get("objetoCompra") or "")[:300],
        "orgao": oe.get("razaoSocial") or uo.get("nomeUnidade"),
        "unidade": uo.get("nomeUnidade"),
        "municipio": uo.get("municipioNome"),
        "uf": uo.get("ufSigla"),
        "cnpj_orgao": oe.get("cnpj"),
        "modalidade": (c.get("modalidadeNome")
                       or MODALIDADES.get(c.get("modalidadeId"), "")),
        "valor_estimado": _fmt_money(c.get("valorTotalEstimado")),
        "numero_compra": c.get("numeroCompra"),
        "ano_compra": c.get("anoCompra"),
        "processo": c.get("processo"),
        "abertura_proposta": _fmt_dt(c.get("dataAberturaProposta", "")),
        "encerramento_proposta": _fmt_dt(c.get("dataEncerramentoProposta", "")),
        "situacao": c.get("situacaoCompraNome"),
        "link": c.get("linkSistemaOrigem"),
        # chaves para buscar itens depois
        "_id": f"{oe.get('cnpj')}/{c.get('anoCompra')}/{c.get('sequencialCompra')}",
    }


def _get(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    try:
        r = httpx.get(url, params=params, headers=_H, timeout=25)
        if r.status_code == 200:
            return r.json() if r.text.strip() else {}
        if r.status_code == 204:
            return {"data": [], "totalRegistros": 0}
        return {"erro": f"HTTP {r.status_code}", "detalhe": r.text[:160]}
    except Exception as e:  # noqa: BLE001
        return {"erro": str(e)}


# ── Funções de domínio (testáveis sem MCP) ──────────────────────────────────
def licitacoes_abertas(uf: str = "AL", modalidade: int = 0, objeto: str = "",
                       municipio: str = "", limite: int = 15) -> Any:
    """Licitações com proposta ABERTA (recebendo propostas agora) na UF.
    Varre as modalidades comuns se nenhuma for especificada. Filtra por
    palavra-chave no objeto e/ou município (opcionais)."""
    from datetime import datetime

    uf = (uf or "AL").upper()
    mods = [modalidade] if modalidade else _MODALIDADES_COMUNS
    data_final = f"{datetime.now().year + 1}1231"
    achados: List[Dict[str, Any]] = []
    for mod in mods:
        d = _get(f"{PNCP}/contratacoes/proposta", {
            "dataFinal": data_final, "codigoModalidadeContratacao": mod,
            "uf": uf, "pagina": 1, "tamanhoPagina": 50,
        })
        if isinstance(d, dict) and d.get("erro"):
            continue
        for c in (d.get("data") or []):
            r = _resumir(c)
            if objeto and objeto.lower() not in (r["objeto"] or "").lower():
                continue
            if municipio and municipio.lower() not in (r["municipio"] or "").lower():
                continue
            achados.append(r)
    achados.sort(key=lambda x: x.get("encerramento_proposta") or "")
    return _formatar_lista(achados[:limite], uf, "com proposta aberta", municipio, objeto)


def licitacoes_periodo(uf: str = "AL", data_inicial: str = "", data_final: str = "",
                       modalidade: int = 6, objeto: str = "", municipio: str = "",
                       limite: int = 15) -> Any:
    """Licitações PUBLICADAS num período (datas no formato AAAAMMDD). Padrão:
    pregão eletrônico (modalidade 6). Útil para histórico/o que saiu no período."""
    from datetime import datetime

    uf = (uf or "AL").upper()
    if not data_final:
        data_final = datetime.now().strftime("%Y%m%d")
    if not data_inicial:
        data_inicial = f"{datetime.now().year}0101"
    d = _get(f"{PNCP}/contratacoes/publicacao", {
        "dataInicial": data_inicial.replace("-", ""), "dataFinal": data_final.replace("-", ""),
        "codigoModalidadeContratacao": modalidade or 6, "uf": uf,
        "pagina": 1, "tamanhoPagina": 50,
    })
    if isinstance(d, dict) and d.get("erro"):
        return f"Erro PNCP: {d['erro']} {d.get('detalhe','')}"
    achados = []
    for c in (d.get("data") or []):
        r = _resumir(c)
        if objeto and objeto.lower() not in (r["objeto"] or "").lower():
            continue
        if municipio and municipio.lower() not in (r["municipio"] or "").lower():
            continue
        achados.append(r)
    titulo = f"publicadas {data_inicial}–{data_final} ({MODALIDADES.get(modalidade or 6,'')})"
    return _formatar_lista(achados[:limite], uf, titulo, municipio, objeto)


def licitacao_itens(id_contratacao: str = "", cnpj: str = "", ano: int = 0,
                    sequencial: int = 0) -> Any:
    """Itens de uma licitação específica (o que está sendo comprado + valores).
    Aceite o '_id' no formato 'CNPJ/ANO/SEQUENCIAL' (campo retornado nas buscas)
    ou cnpj+ano+sequencial separados."""
    if id_contratacao and "/" in id_contratacao:
        partes = id_contratacao.split("/")
        if len(partes) == 3:
            cnpj, ano, sequencial = partes[0], partes[1], partes[2]
    if not (cnpj and ano and sequencial):
        return "Informe id_contratacao='CNPJ/ANO/SEQ' ou cnpj+ano+sequencial."
    cnpj = "".join(filter(str.isdigit, str(cnpj)))
    d = _get(f"{PNCP_ITENS}/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens",
             {"pagina": 1, "tamanhoPagina": 50})
    if isinstance(d, dict) and d.get("erro"):
        return f"Erro PNCP: {d['erro']} {d.get('detalhe','')}"
    itens = d if isinstance(d, list) else (d.get("data") or [])
    if not itens:
        return f"Nenhum item encontrado para a contratação {cnpj}/{ano}/{sequencial}."
    linhas = [f"Itens da licitação {cnpj}/{ano}/{sequencial} — {len(itens)} item(ns):"]
    total = 0.0
    for it in itens:
        try:
            total += float(it.get("valorTotal") or 0)
        except Exception:
            pass
        linhas.append(
            f"{it.get('numeroItem')}. {(it.get('descricao') or '')[:120]} | "
            f"{it.get('materialOuServicoNome','')} | qtd {it.get('quantidade')} "
            f"{it.get('unidadeMedida','')} | unit {_fmt_money(it.get('valorUnitarioEstimado'))} | "
            f"total {_fmt_money(it.get('valorTotal'))} | "
            f"critério: {it.get('criterioJulgamentoNome','')}"
        )
    linhas.append(f"Valor total estimado: {_fmt_money(total)}")
    linhas.append("Fonte: PNCP (Lei 14.133/2021)")
    return "\n".join(linhas)


def contratos_orgao(cnpj_orgao: str = "", data_inicial: str = "", data_final: str = "",
                    objeto: str = "", limite: int = 15) -> Any:
    """CONTRATOS firmados por um ÓRGÃO (por CNPJ). Datas em AAAAMMDD.
    Mostra fornecedor contratado, objeto e valor. O PNCP só filtra contratos por
    CNPJ do órgão (não por UF) — pegue o CNPJ numa busca de licitações antes."""
    from datetime import datetime

    cnpj = "".join(filter(str.isdigit, str(cnpj_orgao or "")))
    if not cnpj:
        return ("Informe o CNPJ do órgão (cnpj_orgao). Dica: use uma busca de "
                "licitações (licitacoes_abertas_al) e copie o 'cnpj_orgao' do resultado.")
    if not data_final:
        data_final = datetime.now().strftime("%Y%m%d")
    if not data_inicial:
        data_inicial = f"{datetime.now().year}0101"
    d = _get(f"{PNCP}/contratos", {
        "dataInicial": data_inicial.replace("-", ""), "dataFinal": data_final.replace("-", ""),
        "cnpjOrgao": cnpj, "pagina": 1, "tamanhoPagina": 50,
    })
    if isinstance(d, dict) and d.get("erro"):
        return f"Erro PNCP: {d['erro']} {d.get('detalhe','')}"
    total = d.get("totalRegistros")
    achados = []
    for c in (d.get("data") or []):
        uo = c.get("unidadeOrgao") or {}
        obj = (c.get("objetoContrato") or "")
        if objeto and objeto.lower() not in obj.lower():
            continue
        forn = c.get("nomeRazaoSocialFornecedor") or (c.get("fornecedor") or {}).get("nome")
        achados.append({
            "objeto": obj[:250],
            "fornecedor": forn,
            "cnpj_fornecedor": c.get("niFornecedor"),
            "orgao": (c.get("orgaoEntidade") or {}).get("razaoSocial") or uo.get("nomeUnidade"),
            "municipio": uo.get("municipioNome"),
            "valor": _fmt_money(c.get("valorGlobal")),
            "vigencia": f"{_fmt_dt(c.get('dataVigenciaInicio',''))}–{_fmt_dt(c.get('dataVigenciaFim',''))}",
            "numero": c.get("numeroContratoEmpenho"),
        })
    if not achados:
        return f"Nenhum contrato do órgão {cnpj} no período {data_inicial}–{data_final}."
    cab = f"Contratos do órgão {cnpj} ({data_inicial}–{data_final})"
    if total:
        cab += f" — {total} no total, mostrando {min(len(achados), limite)}"
    linhas = [cab + ":"]
    for i, a in enumerate(achados[:limite], 1):
        linhas.append(
            f"{i}. {a['fornecedor']} ({a['cnpj_fornecedor']}) | {a['valor']} | {a['municipio']}\n"
            f"   Objeto: {a['objeto']}\n   Vigência: {a['vigencia']}"
        )
    linhas.append("Fonte: PNCP (Lei 14.133/2021)")
    return "\n".join(linhas)


def modalidades_licitacao() -> Any:
    """Lista os códigos de modalidade de contratação (Lei 14.133/2021)."""
    linhas = ["Modalidades de contratação (Lei 14.133/2021):"]
    for cod, nome in MODALIDADES.items():
        linhas.append(f"  {cod} = {nome}")
    return "\n".join(linhas)


def _formatar_lista(achados: List[Dict[str, Any]], uf: str, titulo: str,
                    municipio: str = "", objeto: str = "") -> str:
    filtro = ""
    if municipio:
        filtro += f", município ~ '{municipio}'"
    if objeto:
        filtro += f", objeto ~ '{objeto}'"
    if not achados:
        return f"Nenhuma licitação {titulo} em {uf}{filtro}."
    linhas = [f"Licitações {titulo} em {uf}{filtro} — {len(achados)} encontradas:"]
    for i, a in enumerate(achados, 1):
        linhas.append(
            f"{i}. {a['orgao']} ({a['municipio']}-{a['uf']}) | {a['modalidade']}\n"
            f"   Objeto: {a['objeto']}\n"
            f"   Valor estimado: {a['valor_estimado']} | Encerra propostas: "
            f"{a['encerramento_proposta'] or '—'} | Processo: {a['processo'] or '—'}\n"
            f"   ID p/ itens: {a['_id']} | Link: {a['link'] or '—'}"
        )
    linhas.append("Fonte: PNCP — Portal Nacional de Contratações Públicas")
    return "\n".join(linhas)


# ── Registro MCP ────────────────────────────────────────────────────────────
def _build_server():
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("licitacoes-br")

    @mcp.tool()
    def licitacoes_abertas_al(uf: str = "AL", modalidade: int = 0, objeto: str = "",
                              municipio: str = "", limite: int = 15) -> "Any":
        """Licitações com PROPOSTA ABERTA (recebendo lances agora) — padrão Alagoas.
        Use para 'quais licitações estão abertas', 'editais abertos', 'o que dá para
        participar'. Filtre por `objeto` (ex.: 'merenda', 'obras', 'saúde') e/ou
        `municipio` (ex.: 'Maceió', 'Arapiraca'). `modalidade` 0 = varre as comuns.
        Fonte: PNCP (sem chave)."""
        return licitacoes_abertas(uf, modalidade, objeto, municipio, limite)

    @mcp.tool()
    def licitacoes_periodo_al(uf: str = "AL", data_inicial: str = "", data_final: str = "",
                              modalidade: int = 6, objeto: str = "", municipio: str = "",
                              limite: int = 15) -> "Any":
        """Licitações PUBLICADAS num período (datas AAAAMMDD) — padrão Alagoas, pregão.
        Use para histórico: 'licitações publicadas em maio', 'editais de obras este ano'.
        Fonte: PNCP."""
        return licitacoes_periodo(uf, data_inicial, data_final, modalidade, objeto, municipio, limite)

    @mcp.tool()
    def licitacao_itens(id_contratacao: str = "", cnpj: str = "", ano: int = 0,
                        sequencial: int = 0) -> "Any":
        """ITENS de uma licitação (o que está sendo comprado, quantidades e valores).
        Passe o 'ID p/ itens' (formato CNPJ/ANO/SEQ) retornado pelas buscas. Fonte: PNCP."""
        return licitacao_itens(id_contratacao, cnpj, ano, sequencial)

    @mcp.tool()
    def contratos_orgao(cnpj_orgao: str = "", data_inicial: str = "", data_final: str = "",
                        objeto: str = "", limite: int = 15) -> "Any":
        """CONTRATOS firmados por um ÓRGÃO (por CNPJ) — fornecedor, objeto e valor.
        Use para 'quem ganhou', 'contratos assinados', 'quanto a prefeitura X gastou'.
        Pegue o cnpj_orgao numa busca de licitações primeiro. Fonte: PNCP."""
        return contratos_orgao(cnpj_orgao, data_inicial, data_final, objeto, limite)

    @mcp.tool()
    def licitacoes_modalidades() -> "Any":
        """Lista os códigos de modalidade de licitação (pregão, dispensa, concorrência…)."""
        return modalidades_licitacao()

    return mcp


if __name__ == "__main__":
    _build_server().run()
