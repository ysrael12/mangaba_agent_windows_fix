"""Valida a identidade dos templates de agente (nome, bordão, saudação, persona).

Cobre a feature 'identidade própria para os 17 agentes' + os toolsets de dados.
Hermético: só importa o módulo de dados puros (sem rede).
"""
from __future__ import annotations

import pytest

from mangaba_cli.agent_templates import (
    AGENT_TEMPLATES,
    get_template,
    list_templates,
)

IDENTITY_FIELDS = ("agent_name", "tagline", "greeting", "persona", "emoji", "label", "id")


def test_catalogo_tem_17_agentes():
    assert len(AGENT_TEMPLATES) == 17


def test_ids_e_nomes_unicos():
    ids = [t["id"] for t in AGENT_TEMPLATES]
    names = [t["agent_name"] for t in AGENT_TEMPLATES]
    assert len(ids) == len(set(ids)), "ids duplicados"
    assert len(names) == len(set(names)), "nomes de agente duplicados"


@pytest.mark.parametrize("tpl", AGENT_TEMPLATES, ids=lambda t: t["id"])
def test_todos_os_campos_de_identidade_presentes(tpl):
    for field in IDENTITY_FIELDS:
        assert tpl.get(field), f"{tpl['id']} sem '{field}'"


@pytest.mark.parametrize("tpl", AGENT_TEMPLATES, ids=lambda t: t["id"])
def test_nome_aparece_na_persona(tpl):
    # a identidade precisa ter efeito em runtime → o nome deve estar no SOUL/persona
    assert tpl["agent_name"] in tpl["persona"], f"{tpl['id']}: nome fora da persona"


@pytest.mark.parametrize("tpl", AGENT_TEMPLATES, ids=lambda t: t["id"])
def test_saudacao_embutida_na_persona(tpl):
    # a mensagem de boas-vindas deve estar embutida (não há campo de greeting no install)
    trecho = tpl["greeting"][:25]
    assert trecho in tpl["persona"], f"{tpl['id']}: saudação não embutida na persona"


@pytest.mark.parametrize("tpl", AGENT_TEMPLATES, ids=lambda t: t["id"])
def test_persona_proibe_revelar_ia(tpl):
    assert "IA" in tpl["persona"], f"{tpl['id']}: persona não trata o disfarce de IA"


def test_list_templates_oculta_persona_mas_expoe_identidade():
    for t in list_templates():
        assert "persona" not in t, "list_templates não deve vazar a persona"
        assert t.get("agent_name") and t.get("tagline"), "identidade deve ser exposta na listagem"


def test_get_template_resolve_e_404():
    assert get_template("licitacoes")["agent_name"] == "Lícia"
    assert get_template("politica")["agent_name"] == "Cívico"
    assert get_template("inexistente") is None


def test_agentes_de_dados_mantem_roteamento_de_tools():
    # regressão: a identidade NÃO pode ter quebrado o roteamento de ferramentas
    lic = get_template("licitacoes")["persona"]
    assert "campeoes_telecom_al" in lic and "licitacoes-br" in lic
    pol = get_template("politica")["persona"]
    assert "transparencia_emendas" in pol and "politica-br" in pol
