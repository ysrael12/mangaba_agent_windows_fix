#!/usr/bin/env python3
"""Harness agêntico do agente Licitações AL — Qwen + tools licitacoes-br.
Executa chamadas reais ao PNCP/CEIS. Segredos via env (HF_TOKEN, TRANSPARENCIA_API_KEY).
"""
from __future__ import annotations

import importlib.util, json, os
from pathlib import Path
import httpx

MCP = str(Path(__file__).with_name("licitacoes_br.py"))
HF_KEY = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""
MODEL = os.getenv("POLITICA_BR_MODEL", "Qwen/Qwen2.5-72B-Instruct")
_soul = Path.home() / ".mangaba" / "SOUL.md"
SOUL = _soul.read_text() if _soul.exists() else "Você é um consultor de licitações de Alagoas."

_spec = importlib.util.spec_from_file_location("lic", MCP)
_m = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_m)

TOOLS = {
    "campeoes_telecom_al": lambda **k: _m.campeoes_por_area(None, k.get("uf", "AL"), "telecomunicações", k.get("limite", 10)),
    "campeoes_telecom_x_sancoes": lambda **k: _m.campeoes_telecom_x_sancoes(k.get("uf", "AL"), k.get("limite", 10)),
    "campeoes_por_area_al": lambda **k: (lambda lista: _m.campeoes_por_area(lista, k.get("uf", "AL"), k.get("area_nome") or k.get("termos") or "área", k.get("limite", 10)) if lista else "Informe os termos da área.")([t.strip() for t in (k.get("termos") or k.get("area_nome") or "").split(",") if t.strip()]),
    "licitacoes_abertas_al": lambda **k: _m.licitacoes_abertas(k.get("uf", "AL"), k.get("modalidade", 0), k.get("objeto", ""), k.get("municipio", ""), k.get("limite", 15)),
    "licitacoes_periodo_al": lambda **k: _m.licitacoes_periodo(k.get("uf", "AL"), k.get("data_inicial", ""), k.get("data_final", ""), k.get("modalidade", 6), k.get("objeto", ""), k.get("municipio", ""), k.get("limite", 15)),
    "licitacao_itens": lambda **k: _m.licitacao_itens(k.get("id_contratacao", ""), k.get("cnpj", ""), k.get("ano", 0), k.get("sequencial", 0)),
    "contratos_orgao": lambda **k: _m.contratos_orgao(k.get("cnpj_orgao", ""), k.get("data_inicial", ""), k.get("data_final", ""), k.get("objeto", ""), k.get("limite", 15)),
    "licitacoes_modalidades": lambda **k: _m.modalidades_licitacao(),
}


def _t(name, desc, props, req=None):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": req or []}}}


S = lambda d="": {"type": "string", "description": d}
I = lambda d="": {"type": "integer", "description": d}
SCHEMAS = [
    _t("campeoes_telecom_al", "Ranking das empresas que mais vencem contratos de telecom na UF (padrão AL).", {"uf": S(), "limite": I()}),
    _t("campeoes_telecom_x_sancoes", "Ranking dos campeões de telecom JÁ cruzado com sanções do CEIS. Use para 'algum campeão sancionado'.", {"uf": S(), "limite": I()}),
    _t("campeoes_por_area_al", "Ranking de campeões em qualquer área. termos separados por vírgula.", {"termos": S(), "area_nome": S(), "uf": S(), "limite": I()}),
    _t("licitacoes_abertas_al", "Editais com proposta aberta agora (filtra objeto/município).", {"uf": S(), "objeto": S(), "municipio": S(), "limite": I()}),
    _t("licitacoes_periodo_al", "Licitações publicadas num período (AAAAMMDD).", {"uf": S(), "data_inicial": S(), "data_final": S(), "objeto": S(), "limite": I()}),
    _t("licitacao_itens", "Itens de uma licitação (use id 'CNPJ/ANO/SEQ').", {"id_contratacao": S()}),
    _t("contratos_orgao", "Contratos firmados por um órgão (por CNPJ).", {"cnpj_orgao": S(), "objeto": S(), "limite": I()}),
    _t("licitacoes_modalidades", "Lista códigos de modalidade.", {}),
]


def call_llm(messages):
    r = httpx.post("https://router.huggingface.co/v1/chat/completions",
                   headers={"Authorization": f"Bearer {HF_KEY}"},
                   json={"model": MODEL, "messages": messages, "tools": SCHEMAS,
                         "temperature": 0.2, "max_tokens": 1500}, timeout=90)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]


def run_agent(pergunta, max_steps=6, verbose=True):
    msgs = [{"role": "system", "content": SOUL}, {"role": "user", "content": pergunta}]
    trace = []
    for _ in range(max_steps):
        msg = call_llm(msgs)
        tcs = msg.get("tool_calls") or []
        if not tcs:
            return msg.get("content", ""), trace
        msgs.append({"role": "assistant", "content": msg.get("content"), "tool_calls": tcs})
        for tc in tcs:
            fn = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"] or "{}")
            except Exception:
                args = {}
            trace.append((fn, args))
            if verbose:
                print(f"    ⚙️  {fn}({', '.join(f'{k}={v!r}' for k,v in args.items())})")
            try:
                result = TOOLS[fn](**args) if fn in TOOLS else f"[tool {fn} não disponível]"
            except Exception as e:
                result = f"[erro: {e}]"
            content = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
            msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": content[:4000]})
    return "[max_steps atingido]", trace


PERGUNTAS = [
    "Quais são os campeões de licitações de telecomunicações em Alagoas?",
    "Algum desses campeões de telecom de Alagoas está sancionado no CEIS?",
    "Tem alguma licitação de internet ou telefonia aberta agora em Alagoas?",
    "Quem são os campeões em medicamentos em Alagoas?",
    "Quantos contratos a VELOO NET ganhou e qual o valor total em telecom?",
]

if __name__ == "__main__":
    import sys
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for i, q in enumerate(PERGUNTAS, 1):
        if only and only != str(i):
            continue
        print(f"\n{'='*68}\nP{i}: {q}\n{'='*68}")
        resp, trace = run_agent(q)
        print(f"  🔧 tools: {[t[0] for t in trace]}")
        print(f"  💬 {resp[:900]}")
