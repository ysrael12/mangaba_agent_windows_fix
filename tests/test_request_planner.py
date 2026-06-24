"""Tests for agent.request_planner — deterministic complex-request decomposition."""

from agent import request_planner as rp


def test_simple_request_one_step():
    steps = rp.decompose("qual a capital da França?")
    # No action verb → kept as single clause, not complex.
    assert len(steps) <= 1
    assert rp.is_complex("qual a capital da França?") is False


def test_multi_step_by_connector_depois():
    steps = rp.decompose("pesquise sobre o cliente e depois gere um relatório PDF")
    assert len(steps) == 2
    assert "pesquise" in steps[0].text.lower()
    assert "relat" in steps[1].text.lower()
    assert rp.is_complex("pesquise sobre o cliente e depois gere um relatório PDF")


def test_multi_step_by_semicolon_and_entao():
    steps = rp.decompose("busque os pedidos do dia; então resuma; por fim me envie")
    assert len(steps) == 3
    assert rp.is_complex("busque os pedidos do dia; então resuma; por fim me envie")


def test_numbered_list():
    text = "1. analise as fotos\n2. escolha a melhor\n3. apague as outras"
    steps = rp.decompose(text)
    assert len(steps) == 3
    assert steps[0].text.lower().startswith("analise")
    assert "apague" in steps[2].text.lower()


def test_bullet_list():
    text = "- gere o PIX\n- mande no whatsapp\n- agende um follow-up"
    steps = rp.decompose(text)
    assert len(steps) == 3


def test_skill_suggestion_pix():
    steps = rp.decompose("gere um PIX de 50 reais e mande pro cliente")
    skills = [s.skill for s in steps]
    assert "pix-cobranca" in skills


def test_skill_suggestion_nota_fiscal():
    steps = rp.decompose("emita a nota fiscal com o CNPJ do cliente")
    assert any(s.skill == "nota-fiscal" for s in steps)


def test_complexity_alta_when_two_verbs():
    # classifier on a single clause with two action verbs
    assert rp._classify("pesquise e analise os dados") == "alta"


def test_render_plan_contains_steps():
    steps = rp.decompose("busque os dados; gere o relatório; me envie")
    plan = rp.render_plan(steps)
    assert "📋" in plan
    assert "1." in plan and "2." in plan and "3." in plan


def test_render_scaffold_only_when_multistep():
    one = rp.decompose("me diga as horas")
    assert rp.render_agent_scaffold(one) == ""
    many = rp.decompose("pesquise X e depois gere Y e por fim envie Z")
    sc = rp.render_agent_scaffold(many)
    assert "checklist" in sc.lower()
    assert "todo" in sc.lower()


def test_e_conjunction_split_conservative():
    # Two clear actions joined by "e" → split.
    steps = rp.decompose("crie o catálogo e envie pro cliente")
    assert len(steps) == 2
    # A single action with "e" linking nouns → not over-split.
    single = rp.decompose("liste produtos e preços")
    assert len(single) == 1


def test_comma_separated_actions_split():
    steps = rp.decompose("pesquise o cliente, gere um PDF, me mande aqui")
    assert len(steps) == 3
    assert "pesquise" in steps[0].text.lower()
    assert "mande" in steps[2].text.lower()


def test_comma_non_action_not_split():
    # "que é importante" is not an action → stays attached to step 1.
    steps = rp.decompose("analise o cliente, que é importante, e gere o orçamento")
    assert len(steps) == 2
    assert "importante" in steps[0].text.lower()


def test_full_pipeline_four_steps_with_skills():
    g = ("pesquise o cliente no google, gere um relatório em PDF, "
         "me mande aqui e depois agende um follow-up em 2h")
    steps = rp.decompose(g)
    assert len(steps) == 4
    skills = [s.skill for s in steps]
    assert "followup-cliente" in skills


def test_empty_input():
    assert rp.decompose("") == []
    assert rp.is_complex("") is False
