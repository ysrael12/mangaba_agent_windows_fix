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
PNCP_SEARCH = "https://pncp.gov.br/api/search/"
_H = {"Accept": "application/json", "User-Agent": "MangabaLicitacoesBR/1.0"}
# O endpoint de busca textual do PNCP exige User-Agent de navegador.
_H_SEARCH = {
    "Accept": "application/json",
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
}

# Termos que caracterizam a área de TELECOMUNICAÇÕES — usados tanto para BUSCAR
# (cada termo é uma query separada; o PNCP faz AND entre palavras numa só query)
# quanto para FILTRAR ruído no objeto do contrato.
TELECOM_TERMOS = [
    "telefonia", "internet", "link de dados", "banda larga", "fibra óptica",
    "telecomunicações", "conectividade", "dados móveis", "link de internet",
]
# Filtro de confirmação no objeto — evita falsos positivos da busca textual.
_TELECOM_FILTRO = [
    "telefon", "telecomunic", "internet", "link de dados", "banda larga",
    "fibra", "dados móveis", "dados moveis", "voip", "conectividade",
    "link de internet", "circuito de dados", "rede de dados",
]

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


def _record_rate_limit(source: str, detail: str = "") -> None:
    """Anexa evento de rate-limit ao log compartilhado (lido pelo dashboard).
    Standalone (sem depender de mangaba_cli) — respeita MANGABA_HOME."""
    try:
        import json as _json, os as _os, time as _time
        from pathlib import Path as _Path
        home = _os.environ.get("MANGABA_HOME") or str(_Path.home() / ".mangaba")
        p = _Path(home) / "rate_limit_events.jsonl"
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("a", encoding="utf-8") as f:
            f.write(_json.dumps({"ts": _time.time(), "source": source,
                                 "detail": detail[:200]}, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _match_objeto(filtro: str, texto: str) -> bool:
    """True se QUALQUER termo de `filtro` (separado por vírgula) está em `texto`.
    Filtro vazio = aceita tudo. Trata 'internet,telefonia' como OR."""
    if not filtro:
        return True
    termos = [t.strip().lower() for t in filtro.split(",") if t.strip()]
    t = (texto or "").lower()
    return any(termo in t for termo in termos)


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
    """GET com tratamento de rate-limit (HTTP 429) do PNCP: backoff e retry.
    Sinaliza {'rate_limited': True} quando o limite persiste, para o chamador
    reportar busca parcial em vez de falsa ausência."""
    import time

    for tentativa in range(3):
        try:
            r = httpx.get(url, params=params, headers=_H, timeout=25)
            if r.status_code == 200:
                return r.json() if r.text.strip() else {}
            if r.status_code == 204:
                return {"data": [], "totalRegistros": 0}
            if r.status_code == 429:
                if tentativa < 2:
                    time.sleep(1.5 * (tentativa + 1))  # 1.5s, 3s
                    continue
                _record_rate_limit("pncp", "HTTP 429 — limite de requisições do PNCP")
                return {"erro": "HTTP 429", "rate_limited": True}
            return {"erro": f"HTTP {r.status_code}", "detalhe": r.text[:160]}
        except Exception as e:  # noqa: BLE001
            if tentativa < 2:
                time.sleep(1.0)
                continue
            return {"erro": str(e)}
    return {"erro": "falha após retries"}


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
    # Com filtro de objeto (ex.: telecom — raro) pagina mais fundo p/ não perder
    # editais enterrados; sem filtro, a 1ª página basta para um panorama geral.
    max_pag = 5 if (objeto or municipio) else 1
    achados: List[Dict[str, Any]] = []
    parcial = False
    for mod in mods:
        for pag in range(1, max_pag + 1):
            d = _get(f"{PNCP}/contratacoes/proposta", {
                "dataFinal": data_final, "codigoModalidadeContratacao": mod,
                "uf": uf, "pagina": pag, "tamanhoPagina": 50,
            })
            if isinstance(d, dict) and d.get("erro"):
                if d.get("rate_limited"):
                    parcial = True
                break  # próxima modalidade
            data = d.get("data") or []
            for c in data:
                r = _resumir(c)
                if not _match_objeto(objeto, r["objeto"]):
                    continue
                if municipio and municipio.lower() not in (r["municipio"] or "").lower():
                    continue
                achados.append(r)
            if len(data) < 50:
                break
    achados.sort(key=lambda x: x.get("encerramento_proposta") or "")
    texto = _formatar_lista(achados[:limite], uf, "com proposta aberta", municipio, objeto)
    if parcial:
        texto += ("\n\n⚠️ Busca parcial: o PNCP limitou as requisições (429). "
                  "Pode haver mais editais — tente de novo em instantes.")
    return texto


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
        if not _match_objeto(objeto, r["objeto"]):
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
        if not _match_objeto(objeto, obj):
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


def _buscar_contratos_area(termos: List[str], uf: str, paginas: int = 1,
                           tam_pagina: int = 20) -> List[Dict[str, str]]:
    """Busca contratos por uma lista de termos (cada um uma query) e devolve
    item_urls distintos no formato {cnpj, ano, seq}. Tolera falhas por termo."""
    import re

    vistos: set = set()
    refs: List[Dict[str, str]] = []
    for termo in termos:
        for pag in range(1, paginas + 1):
            d = _get_search({"q": termo, "tipos_documento": "contrato", "ufs": uf,
                             "ordenacao": "-data", "pagina": pag, "tam_pagina": tam_pagina})
            itens = (d or {}).get("items") or []
            for it in itens:
                m = re.match(r"/contratos/(\d+)/(\d+)/(\d+)", it.get("item_url", ""))
                if not m:
                    continue
                key = m.group(0)
                if key in vistos:
                    continue
                vistos.add(key)
                refs.append({"cnpj": m.group(1), "ano": m.group(2), "seq": m.group(3)})
            if len(itens) < tam_pagina:
                break
    return refs


def _get_search(params: Dict[str, Any]) -> Dict[str, Any]:
    try:
        r = httpx.get(PNCP_SEARCH, params=params, headers=_H_SEARCH, timeout=25)
        return r.json() if r.status_code == 200 and r.text.strip() else {}
    except Exception:
        return {}


def _detalhe_contrato(ref: Dict[str, str]) -> Dict[str, Any]:
    d = _get(f"{PNCP_ITENS}/orgaos/{ref['cnpj']}/contratos/{ref['ano']}/{ref['seq']}", {})
    if not isinstance(d, dict) or d.get("erro"):
        return {}
    return d


def campeoes_por_area(termos: Optional[List[str]] = None, uf: str = "AL",
                      area_nome: str = "telecomunicações", limite: int = 10,
                      paginas: int = 2) -> Any:
    """RANKING dos fornecedores que mais VENCEM contratos de uma área na UF.

    Busca contratos por cada termo, confirma a área no objeto (anti-ruído),
    agrega por CNPJ do fornecedor e ranqueia por valor total ganho. É o coração
    do caso 'campeões de licitações em telecomunicações de Alagoas'."""
    from concurrent.futures import ThreadPoolExecutor

    uf = (uf or "AL").upper()
    termos = termos or TELECOM_TERMOS
    filtro = _TELECOM_FILTRO if termos is TELECOM_TERMOS else [t.lower() for t in termos]

    refs = _buscar_contratos_area(termos, uf, paginas=paginas)
    if not refs:
        return f"Nenhum contrato de {area_nome} encontrado em {uf}."

    # busca os detalhes em paralelo (cada um traz o fornecedor vencedor)
    with ThreadPoolExecutor(max_workers=8) as ex:
        detalhes = list(ex.map(_detalhe_contrato, refs[:120]))

    por_forn: Dict[str, Any] = {}
    n_contratos = 0
    for c in detalhes:
        if not c:
            continue
        objeto = (c.get("objetoContrato") or "").lower()
        if not any(f in objeto for f in filtro):
            continue  # confirma que é da área (descarta falso positivo da busca)
        cnpj = c.get("niFornecedor") or "?"
        nome = c.get("nomeRazaoSocialFornecedor") or "(sem nome)"
        try:
            valor = float(c.get("valorGlobal") or 0)
        except Exception:
            valor = 0.0
        uo = c.get("unidadeOrgao") or {}
        orgao = (c.get("orgaoEntidade") or {}).get("razaoSocial") or uo.get("nomeUnidade")
        n_contratos += 1
        if cnpj not in por_forn:
            por_forn[cnpj] = {"nome": nome, "cnpj": cnpj, "total": 0.0,
                              "contratos": 0, "orgaos": set()}
        por_forn[cnpj]["total"] += valor
        por_forn[cnpj]["contratos"] += 1
        if orgao:
            por_forn[cnpj]["orgaos"].add(orgao)

    if not por_forn:
        return (f"Encontrei contratos na busca, mas nenhum confirmou ser de "
                f"{area_nome} no objeto, em {uf}.")

    ranking = sorted(por_forn.values(), key=lambda x: -x["total"])
    linhas = [f"🏆 Campeões de licitações em {area_nome} — {uf} "
              f"({n_contratos} contratos, {len(ranking)} empresas):"]
    for i, f in enumerate(ranking[:limite], 1):
        linhas.append(
            f"{i}. {f['nome']} ({f['cnpj']})\n"
            f"   Total ganho: {_fmt_money(f['total'])} | {f['contratos']} contrato(s) | "
            f"{len(f['orgaos'])} órgão(s)"
        )
    linhas.append("Fonte: PNCP — contratos firmados (Lei 14.133/2021)")
    return "\n".join(linhas)


def _ceis_sancionado(cnpj: str, nome: str = "") -> List[Dict[str, Any]]:
    """Verifica se um CNPJ está sancionado no CEIS (Portal da Transparência).

    IMPORTANTE: o CEIS NÃO filtra por CNPJ (os params cnpjSancionado/cpfCnpj são
    ignorados e devolvem a lista global — fonte de falso positivo). A forma
    correta é buscar por nomeSancionado e CONFIRMAR pelo cnpjFormatado retornado.
    Requer TRANSPARENCIA_API_KEY. Retorna só as sanções cujo CNPJ bate (vazio = limpo)."""
    import os

    key = os.getenv("TRANSPARENCIA_API_KEY", "")
    if not key or not nome:
        return []
    alvo = "".join(filter(str.isdigit, cnpj or ""))
    if not alvo:
        return []
    # usa as 2-3 primeiras palavras da razão social como termo de busca
    termo = " ".join([w for w in nome.split() if len(w) > 2][:3]) or nome
    try:
        sancoes = []
        for pag in (1, 2):
            r = httpx.get("https://api.portaldatransparencia.gov.br/api-de-dados/ceis",
                          params={"pagina": pag, "nomeSancionado": termo},
                          headers={**_H, "chave-api-dados": key}, timeout=15)
            if r.status_code != 200:
                break
            data = r.json()
            for x in data:
                p = x.get("pessoa") or {}
                cnpj_reg = "".join(filter(str.isdigit, p.get("cnpjFormatado") or ""))
                if cnpj_reg and cnpj_reg == alvo:  # confirma pelo CNPJ
                    sancoes.append({
                        "tipo": (x.get("tipoSancao") or {}).get("descricaoResumida"),
                        "orgao": (x.get("orgaoSancionador") or {}).get("nome"),
                        "inicio": x.get("dataInicioSancao"), "fim": x.get("dataFimSancao")})
            if len(data) < 15:
                break
        return sancoes
    except Exception:
        return []


def campeoes_telecom_x_sancoes(uf: str = "AL", limite: int = 10) -> Any:
    """CRUZAMENTO: ranking dos campeões de telecom + verificação de SANÇÕES (CEIS).
    Para cada empresa vencedora, checa se está sancionada no Portal da Transparência.
    Flagra a situação crítica: empresa sancionada que mesmo assim vence contratos."""
    from concurrent.futures import ThreadPoolExecutor

    uf = (uf or "AL").upper()
    refs = _buscar_contratos_area(TELECOM_TERMOS, uf, paginas=2)
    if not refs:
        return f"Nenhum contrato de telecomunicações encontrado em {uf}."
    with ThreadPoolExecutor(max_workers=8) as ex:
        detalhes = list(ex.map(_detalhe_contrato, refs[:120]))

    por_forn: Dict[str, Any] = {}
    for c in detalhes:
        if not c:
            continue
        objeto = (c.get("objetoContrato") or "").lower()
        if not any(f in objeto for f in _TELECOM_FILTRO):
            continue
        cnpj = c.get("niFornecedor") or "?"
        try:
            valor = float(c.get("valorGlobal") or 0)
        except Exception:
            valor = 0.0
        if cnpj not in por_forn:
            por_forn[cnpj] = {"nome": c.get("nomeRazaoSocialFornecedor") or "(sem nome)",
                              "cnpj": cnpj, "total": 0.0, "contratos": 0}
        por_forn[cnpj]["total"] += valor
        por_forn[cnpj]["contratos"] += 1

    if not por_forn:
        return f"Nenhum contrato confirmado de telecomunicações em {uf}."
    ranking = sorted(por_forn.values(), key=lambda x: -x["total"])[:limite]

    # checa sanções dos top em paralelo
    def _chk(f):
        f["sancoes"] = _ceis_sancionado(f["cnpj"], f["nome"]) if f["cnpj"] != "?" else []
        return f
    with ThreadPoolExecutor(max_workers=8) as ex:
        ranking = list(ex.map(_chk, ranking))

    sancionadas = [f for f in ranking if f.get("sancoes")]
    linhas = [f"🏆 Campeões de telecom × sanções (CEIS) — {uf}:"]
    for i, f in enumerate(ranking, 1):
        flag = "⚠️ SANCIONADA" if f.get("sancoes") else "✓ sem sanção"
        linhas.append(f"{i}. {f['nome']} ({f['cnpj']}) — {_fmt_money(f['total'])} | "
                      f"{f['contratos']} contrato(s) | {flag}")
        for s in (f.get("sancoes") or [])[:2]:
            linhas.append(f"     ↳ {s.get('tipo')} | {s.get('orgao')} | desde {s.get('inicio')}")
    if sancionadas:
        linhas.append(f"\n⚠️ ATENÇÃO: {len(sancionadas)} campeã(s) com sanção no CEIS.")
    else:
        linhas.append("\n✓ Nenhum dos campeões verificados está sancionado no CEIS.")
    linhas.append("Fonte: PNCP (contratos) + Portal da Transparência (CEIS)")
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
    def campeoes_telecom_al(uf: str = "AL", limite: int = 10) -> "Any":
        """CAMPEÕES de licitações em TELECOMUNICAÇÕES — ranking das empresas que
        mais vencem contratos de telefonia/internet/link de dados/fibra na UF
        (padrão Alagoas). Agrega por CNPJ do fornecedor e ordena por valor total
        ganho. Use para 'quem mais ganha licitação de telecom', 'maiores empresas
        de internet em contratos públicos', 'campeões de telecomunicações'. PNCP."""
        return campeoes_por_area(None, uf, "telecomunicações", limite)

    @mcp.tool()
    def campeoes_por_area_al(termos: str = "", area_nome: str = "", uf: str = "AL",
                             limite: int = 10) -> "Any":
        """CAMPEÕES de licitações em QUALQUER área — ranking de fornecedores que
        mais vencem contratos. Passe `termos` separados por vírgula (ex.:
        'merenda,alimentação escolar' ou 'medicamento,fármaco') e um `area_nome`
        para o título. Padrão UF=AL. PNCP."""
        # Aceita os termos em `termos` OU em `area_nome` (o modelo às vezes troca).
        bruto = termos or area_nome or ""
        lista = [t.strip() for t in bruto.split(",") if t.strip()]
        if not lista:
            return ("Informe os termos da área (ex.: termos='medicamento,fármaco'). "
                    "Para telecomunicações use campeoes_telecom_al.")
        return campeoes_por_area(lista, uf, area_nome or termos or "área", limite)

    @mcp.tool()
    def campeoes_telecom_x_sancoes(uf: str = "AL", limite: int = 10) -> "Any":
        """CRUZAMENTO campeões de telecom × SANÇÕES (CEIS): ranking das empresas que
        mais vencem licitações de telecom na UF JÁ verificando se cada uma está
        sancionada no Portal da Transparência. Use para 'algum campeão está
        sancionado', 'empresa irregular vencendo licitação de telecom', 'cruzar
        vencedores com CEIS'. Requer TRANSPARENCIA_API_KEY. Fonte: PNCP + CEIS."""
        return campeoes_telecom_x_sancoes(uf, limite)

    @mcp.tool()
    def licitacoes_modalidades() -> "Any":
        """Lista os códigos de modalidade de licitação (pregão, dispensa, concorrência…)."""
        return modalidades_licitacao()

    return mcp


if __name__ == "__main__":
    _build_server().run()
