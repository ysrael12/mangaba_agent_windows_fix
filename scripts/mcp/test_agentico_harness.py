#!/usr/bin/env python3
"""Teste agêntico REAL do agente Política BR.
Roda o loop completo: Qwen2.5 + 22 tools, executa chamadas de verdade contra
as APIs públicas, mede se o modelo CRUZA fontes para perguntas complexas.
"""
import importlib.util, json, os, sys, textwrap
from pathlib import Path
import httpx

# Segredos vêm do ambiente — NUNCA hardcode tokens no repo.
#   export HF_TOKEN=hf_...           (chave do HuggingFace router)
#   export TRANSPARENCIA_API_KEY=... (chave grátis do Portal da Transparência)
MCP = str(Path(__file__).with_name("politica_br.py"))
HF_KEY = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""
MODEL = os.getenv("POLITICA_BR_MODEL", "Qwen/Qwen2.5-72B-Instruct")
_soul = Path.home() / ".mangaba" / "SOUL.md"
SOUL = _soul.read_text() if _soul.exists() else "Você é um consultor de dados públicos da política brasileira."

spec = importlib.util.spec_from_file_location("pol", MCP)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

# ── Mapa nome-da-tool → função de domínio executável ─────────────────────────
TOOLS = {
    "camara_buscar_deputados": lambda **k: m.buscar_deputados(**k),
    "camara_dossie_deputado": lambda **k: m.dossie_deputado(**k),
    "camara_comparar_deputados": lambda **k: m.comparar_deputados(**k),
    "senado_buscar_senadores": lambda **k: m.buscar_senadores(**k),
    "senado_buscar_materias": lambda **k: m.buscar_materias_senado(**k),
    "transparencia_sancoes": lambda **k: m._transparencia_ceis(**k),
    "transparencia_emendas": lambda **k: m._transparencia_emendas(**k),
    "transparencia_emendas_empresas_cnpj": lambda **k: m._transparencia_emendas_empresas_detalhado(**k),
    "emendas_historico": lambda **k: m._transparencia_emendas_multiperiodo(**k),
    "transparencia_emendas_x_sancoes": lambda **k: m._transparencia_emendas_x_sancoes(**k),
}

# ── Schemas das tools (formato OpenAI) ───────────────────────────────────────
def _t(name, desc, props, required=None):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required or []}}}

S = lambda d="": {"type": "string", "description": d}
I = lambda d="": {"type": "integer", "description": d}
SCHEMAS = [
    _t("camara_buscar_deputados", "Busca deputados por nome/UF/partido.",
       {"nome": S(), "uf": S(), "partido": S(), "limite": I()}),
    _t("camara_dossie_deputado", "Dossiê + gastos CEAP (cota) de um deputado pelo nome.",
       {"nome": S("nome do deputado"), "ano": I()}),
    _t("camara_comparar_deputados", "Compara dois deputados (partido/UF + gastos CEAP).",
       {"nome1": S(), "nome2": S(), "ano": I()}, ["nome1", "nome2"]),
    _t("senado_buscar_senadores", "Busca senadores em exercício por nome/UF/partido.",
       {"nome": S(), "uf": S(), "partido": S(), "limite": I()}),
    _t("senado_buscar_materias", "Busca matérias/projetos do Senado por termo/sigla/ano.",
       {"termo": S(), "sigla": S(), "ano": I(), "limite": I()}),
    _t("transparencia_sancoes", "Empresas/pessoas SANCIONADAS no CEIS (por nome ou CNPJ).",
       {"nome_ou_cnpj": S("nome ou CNPJ a verificar"), "limite": I()}),
    _t("transparencia_emendas", "Emendas parlamentares de um autor (destino/função/valor).",
       {"autor": S("nome do parlamentar"), "ano": I()}),
    _t("transparencia_emendas_empresas_cnpj", "EMPRESAS/ENTIDADES com CNPJ que receberam verba das emendas de um autor. Use para 'quais empresas/quem recebeu'.",
       {"autor": S("nome do parlamentar"), "ano": I()}),
    _t("emendas_historico", "Histórico multi-ano (2022-2026) de emendas de um autor por ano/função.",
       {"autor": S(), "anos": S("ex '2024,2025'")}),
    _t("transparencia_emendas_x_sancoes", "CRUZAMENTO automático: verifica se beneficiários das emendas de um autor estao SANCIONADOS no CEIS. Cobertura 100%% server-side. Use para 'alguma empresa que recebeu emenda esta sancionada'.",
       {"autor": S(), "ano": I()}),
]

def call_llm(messages):
    r = httpx.post("https://router.huggingface.co/v1/chat/completions",
                   headers={"Authorization": f"Bearer {HF_KEY}"},
                   json={"model": MODEL, "messages": messages, "tools": SCHEMAS,
                         "temperature": 0.2, "max_tokens": 2000}, timeout=60)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]

def run_agent(pergunta, max_steps=6, verbose=True):
    msgs = [{"role": "system", "content": SOUL},
            {"role": "user", "content": pergunta}]
    trace = []
    for step in range(max_steps):
        msg = call_llm(msgs)
        tcs = msg.get("tool_calls") or []
        if not tcs:
            return msg.get("content", ""), trace
        # registra assistant turn com tool_calls
        msgs.append({"role": "assistant", "content": msg.get("content"),
                     "tool_calls": tcs})
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
                result = TOOLS[fn](**args) if fn in TOOLS else f"[tool {fn} não disponível no teste]"
            except Exception as e:
                result = f"[erro: {e}]"
            content = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
            msgs.append({"role": "tool", "tool_call_id": tc["id"],
                         "content": content[:4000]})
    return "[max_steps atingido]", trace

# ── Bateria de perguntas complexas ───────────────────────────────────────────
PERGUNTAS = [
    ("Q1 simples", "Quais empresas receberam verba das emendas do Arthur Lira em 2026?"),
    ("Q2 CRUZAMENTO emenda×sanção",
     "Alguma das empresas que recebeu emenda do Arthur Lira em 2026 está sancionada no CEIS? Verifique cada CNPJ."),
    ("Q3 comparação", "Compare os gastos de cota parlamentar de Arthur Lira e Eduardo Bolsonaro em 2024."),
    ("Q4 multi-fonte", "Arthur Lira tem matérias no Senado? E quais emendas ele fez em 2025?"),
]

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for tag, q in PERGUNTAS:
        if only and only not in tag:
            continue
        print(f"\n{'='*70}\n{tag}: {q}\n{'='*70}")
        resp, trace = run_agent(q)
        tools_usadas = [t[0] for t in trace]
        print(f"\n  🔧 Tools chamadas ({len(trace)}): {tools_usadas}")
        print(f"\n  💬 RESPOSTA:\n{textwrap.indent(resp[:1500], '     ')}")
