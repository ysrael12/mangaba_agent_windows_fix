#!/usr/bin/env python3
"""Regressão LIVE do MCP Política BR — bate nas APIs públicas reais.

NÃO é um teste hermético (precisa de rede + TRANSPARENCIA_API_KEY), por isso
fica fora de tests/. Rode à mão sempre que mexer em politica_br.py:

    TRANSPARENCIA_API_KEY=sua_chave python scripts/mcp/test_politica_br_regressao.py

Verifica INVARIANTES estruturais (não números exatos, que mudam com o tempo):
  - cruzamento emenda × sanção retorna cobertura honesta "N de M"
  - empresas/CNPJ retorna >0 beneficiários com CNPJ formatado
  - comparar deputados retorna texto limpo com os dois nomes
  - resolução fuzzy corrige typos no nome do autor (RENNAN→RENAN, ARTUR→ARTHUR)
  - NENHUM output vaza o marcador interno "RESULTADO OBRIGATÓRIO"
  - histórico multi-ano retorna dados por função

Modo agêntico (opcional, bate no LLM — lento e custa tokens):
    python scripts/mcp/test_politica_br_regressao.py --agentico
requer HF_TOKEN/router configurado; valida que o modelo escolhe a tool certa.

Saída: exit code 0 = tudo passou, 1 = alguma falha.
"""
from __future__ import annotations

import importlib.util
import os
import re
import sys
from pathlib import Path

MCP_PATH = Path(__file__).with_name("politica_br.py")

_spec = importlib.util.spec_from_file_location("politica_br", MCP_PATH)
_m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_m)  # type: ignore[union-attr]

_falhas: list[str] = []
_passou = 0


def check(nome: str, cond: bool, detalhe: str = "") -> None:
    global _passou
    if cond:
        _passou += 1
        print(f"  ✓ {nome}")
    else:
        _falhas.append(nome)
        print(f"  ✗ {nome}  {('— ' + detalhe) if detalhe else ''}")


SEM_MARCADOR = lambda s: "RESULTADO OBRIGAT" not in s and "sem alteração" not in s


def teste_funcoes() -> None:
    """Checks diretos nas funções de domínio (sem LLM)."""
    if not os.getenv("TRANSPARENCIA_API_KEY"):
        print("⚠️  TRANSPARENCIA_API_KEY não definida — pulando testes do Portal.")
        return

    print("\n[1] Cruzamento emenda × sanção (x_sancoes)")
    r = _m._transparencia_emendas_x_sancoes("Arthur Lira", 2026)
    check("retorna texto", isinstance(r, str))
    check("sem vazar marcador interno", SEM_MARCADOR(r), r[:60])
    check("reporta cobertura honesta 'N de M'", bool(re.search(r"\d+ de \d+", r)), r)
    check("cita fonte CEIS", "CEIS" in r)

    print("\n[2] Empresas/CNPJ beneficiadas (empresas_cnpj)")
    r = _m._transparencia_emendas_empresas_detalhado("Arthur Lira", 2026)
    check("retorna texto", isinstance(r, str))
    check("sem vazar marcador", SEM_MARCADOR(r), r[:60])
    check("tem >0 entidades", "entidades receberam verba" in r and "0 entidades" not in r)
    check("tem CNPJ formatado", bool(re.search(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}", r)))

    print("\n[3] Resolução fuzzy de nome (tolera typos)")
    r_typo = _m._transparencia_emendas_empresas_detalhado("ARTUR LIRA", 2026)  # falta H
    check("typo 'ARTUR' resolve p/ dados", isinstance(r_typo, str) and "entidades receberam" in r_typo)
    check("display mostra nome canônico ARTHUR", "ARTHUR LIRA" in r_typo, r_typo[:80])
    r_renan = _m._transparencia_emendas_x_sancoes("RENNAN CALHEIROS", 2026)  # NN duplo
    check("typo 'RENNAN' resolve p/ RENAN", "RENAN CALHEIROS" in r_renan, r_renan[:80])

    print("\n[4] Comparar deputados (CEAP)")
    r = _m.comparar_deputados("Nikolas Ferreira", "Andre Janones", 2024)
    check("retorna texto", isinstance(r, str))
    check("sem vazar marcador", SEM_MARCADOR(r), r[:60])
    check("cita ambos os deputados", "Nikolas" in r and "Janones" in r)
    check("mostra gastos CEAP", "CEAP" in r and "R$" in r)

    print("\n[5] Histórico multi-ano por função")
    r = _m._transparencia_emendas_multiperiodo("Arthur Lira", "2023,2024")
    check("retorna estrutura", isinstance(r, dict) and "anos" in r)
    anos = (r or {}).get("anos", {})
    check("tem dados de ao menos 1 ano", bool(anos), str(list(anos)[:3]))

    print("\n[6] Nome inexistente → mensagem honesta (não inventa)")
    r = _m._transparencia_emendas_empresas_detalhado("FULANO INEXISTENTE XYZ", 2026)
    check("reporta ausência sem inventar", isinstance(r, str) and "Nenhuma emenda" in r, str(r)[:80])


def teste_agentico() -> None:
    """Valida que o modelo escolhe a tool certa (bate no LLM — opcional)."""
    print("\n[AGÊNTICO] requer router HF configurado — pode ser lento/flaky")
    sys.path.insert(0, str(Path(__file__).parent))
    try:
        import test_agentico_harness as ta  # type: ignore
    except Exception as e:
        print(f"  ⚠️  harness agêntico indisponível ({e}) — pulando.")
        return
    soul = Path.home() / ".mangaba" / "SOUL.md"
    if soul.exists():
        ta.SOUL = soul.read_text()
    casos = [
        ("emenda×sanção → tool única", "alguma empresa que recebeu emenda do Arthur Lira em 2026 está sancionada no CEIS?",
         lambda tools: tools == ["transparencia_emendas_x_sancoes"]),
        ("comparar → tool única", "compare os gastos de cota de Nikolas Ferreira e Andre Janones em 2024",
         lambda tools: "camara_comparar_deputados" in tools),
    ]
    for nome, q, ok in casos:
        try:
            resp, trace = ta.run_agent(q, max_steps=6, verbose=False)
            tools = [t[0] for t in trace]
            check(f"{nome} (tools={tools})", ok(tools) and SEM_MARCADOR(resp), resp[:80])
        except Exception as e:
            check(nome, False, str(e))


if __name__ == "__main__":
    print("=" * 60)
    print("REGRESSÃO LIVE — MCP Política BR")
    print("=" * 60)
    teste_funcoes()
    if "--agentico" in sys.argv:
        teste_agentico()
    print("\n" + "=" * 60)
    print(f"RESULTADO: {_passou} passou, {len(_falhas)} falhou")
    if _falhas:
        print("Falhas:", ", ".join(_falhas))
        sys.exit(1)
    print("✅ Tudo passou.")
    sys.exit(0)
