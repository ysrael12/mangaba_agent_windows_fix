"""Tests for agent.instincts — confidence-scored learned rules."""

import importlib

import pytest


@pytest.fixture
def instincts(tmp_path, monkeypatch):
    """Point the instinct store at a temp MANGABA_HOME."""
    monkeypatch.setenv("MANGABA_HOME", str(tmp_path))
    import mangaba_agent.mangaba_constants as mangaba_constants
    importlib.reload(mangaba_constants)
    from agent import instincts as mod
    importlib.reload(mod)
    return mod


def test_add_and_load(instincts):
    i = instincts.add_instinct("o cliente pedir nota fiscal", "peça o CNPJ primeiro")
    assert i.id
    assert i.confidence == instincts.BASE_CONFIDENCE
    loaded = instincts.load_instincts()
    assert len(loaded) == 1
    assert loaded[0].trigger == "o cliente pedir nota fiscal"


def test_reinforce_on_duplicate(instincts):
    a = instincts.add_instinct("gerar pdf", "use pdfplumber")
    b = instincts.add_instinct("gerar pdf", "use pdfplumber")
    assert a.id == b.id  # same instinct
    assert b.confidence > a.confidence
    assert b.uses == 2
    assert len(instincts.load_instincts()) == 1


def test_confidence_caps_at_max(instincts):
    instincts.add_instinct("x acontecer", "faça y")
    last = None
    for _ in range(20):
        last = instincts.add_instinct("x acontecer", "faça y")
    assert last.confidence <= instincts.MAX_CONFIDENCE


def test_forget(instincts):
    i = instincts.add_instinct("trigger aqui", "guidance aqui")
    assert instincts.forget(i.id) is True
    assert instincts.load_instincts() == []
    assert instincts.forget(i.id) is False


def test_render_block_only_includes_confident(instincts):
    instincts.add_instinct("situação a", "ação a")
    block = instincts.render_block()
    assert "Instintos aprendidos" in block
    assert "situação a" in block


def test_render_block_model_aware_caps(instincts):
    # Add many instincts above threshold.
    for i in range(10):
        inst = instincts.add_instinct(f"gatilho {i}", f"acao {i}")
        instincts.reinforce(inst.id)  # bump above min confidence
    weak = instincts.render_block(model="gemma4:e4b").count("- Quando")
    capable = instincts.render_block(model="claude-opus-4-8").count("- Quando")
    assert weak == instincts.INJECT_TOP_N
    assert capable == instincts.INJECT_TOP_N_CAPABLE
    assert capable < weak


def test_inject_n_for_model(instincts):
    assert instincts._inject_n_for_model("gemma4:e4b") == instincts.INJECT_TOP_N
    assert instincts._inject_n_for_model("claude-opus-4-8") == instincts.INJECT_TOP_N_CAPABLE


def test_empty_render_block(instincts):
    assert instincts.render_block() == ""


def test_promotion_candidates(instincts):
    i = instincts.add_instinct("forte", "muito usada")
    for _ in range(6):
        instincts.reinforce(i.id)
    cands = instincts.promotion_candidates()
    assert any(c.id == i.id for c in cands)


def test_parse_capture_when_then(instincts):
    parsed = instincts.parse_capture("lembre disso: quando o cliente pedir X, faça Y")
    assert parsed is not None
    trigger, guidance = parsed
    assert "cliente pedir x" in trigger.lower()
    assert "y" in guidance.lower()


def test_parse_capture_general(instincts):
    parsed = instincts.parse_capture("aprenda: sempre confirme antes de apagar arquivos")
    assert parsed is not None


def test_parse_capture_rejects_normal_text(instincts):
    assert instincts.parse_capture("oi, tudo bem?") is None
    assert instincts.parse_capture("") is None
