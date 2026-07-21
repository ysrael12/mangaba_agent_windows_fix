"""Tests for agent.instinct_extraction — auto-extraction at session end."""

import importlib

import pytest


@pytest.fixture
def mods(tmp_path, monkeypatch):
    monkeypatch.setenv("MANGABA_HOME", str(tmp_path))
    import mangaba_agent.mangaba_constants as mangaba_constants
    importlib.reload(mangaba_constants)
    from agent import instincts as inst
    importlib.reload(inst)
    from agent import instinct_extraction as ext
    importlib.reload(ext)
    return inst, ext


def _chat(n=6):
    msgs = []
    for i in range(n // 2):
        msgs.append({"role": "user", "content": f"pergunta {i}"})
        msgs.append({"role": "assistant", "content": f"resposta {i}"})
    return msgs


def test_parse_plain_json(mods):
    _, ext = mods
    reply = '[{"trigger": "gerar pdf", "guidance": "use pdfplumber"}]'
    out = ext._parse_instincts_json(reply)
    assert out == [{"trigger": "gerar pdf", "guidance": "use pdfplumber"}]


def test_parse_fenced_json_with_prose(mods):
    _, ext = mods
    reply = ('Claro! Aqui estão:\n```json\n'
             '[{"trigger": "x", "guidance": "y"}, {"trigger": "a", "guidance": "b"}]\n```\nPronto.')
    out = ext._parse_instincts_json(reply)
    assert len(out) == 2
    assert out[0]["trigger"] == "x"


def test_parse_caps_at_max(mods):
    _, ext = mods
    items = [{"trigger": f"t{i}", "guidance": f"g{i}"} for i in range(10)]
    import json
    out = ext._parse_instincts_json(json.dumps(items))
    assert len(out) == ext.MAX_PER_SESSION


def test_parse_garbage_returns_empty(mods):
    _, ext = mods
    assert ext._parse_instincts_json("desculpe, não sei") == []
    assert ext._parse_instincts_json("") == []
    assert ext._parse_instincts_json("{not json}") == []


def test_extract_stores_provisional(mods):
    inst, ext = mods
    fake = lambda transcript, task: '[{"trigger": "gerar relatório", "guidance": "inclua o total"}]'
    stored = ext.extract_and_store(_chat(6), llm_fn=fake)
    assert len(stored) == 1
    saved = inst.load_instincts()
    assert len(saved) == 1
    # provisional → below injection threshold → NOT rendered
    assert saved[0].confidence == inst.PROVISIONAL_CONFIDENCE
    assert inst.render_block() == ""


def test_provisional_activates_after_reinforce(mods):
    inst, ext = mods
    fake = lambda t, task: '[{"trigger": "situação x", "guidance": "ação y"}]'
    ext.extract_and_store(_chat(6), llm_fn=fake)
    # confirm/reinforce by adding the same → bumps above threshold → injects
    inst.add_instinct("situação x", "ação y")
    assert "situação x" in inst.render_block()


def test_short_chat_skipped(mods):
    inst, ext = mods
    fake = lambda t, task: '[{"trigger": "x", "guidance": "y"}]'
    stored = ext.extract_and_store(_chat(2), llm_fn=fake)  # below MIN_TURNS
    assert stored == []
    assert inst.load_instincts() == []


def test_llm_exception_is_swallowed(mods):
    inst, ext = mods
    def boom(t, task):
        raise RuntimeError("provider down")
    stored = ext.extract_and_store(_chat(6), llm_fn=boom)
    assert stored == []


def test_transcript_keeps_only_text(mods):
    _, ext = mods
    msgs = [
        {"role": "user", "content": [{"type": "text", "text": "olá"}, {"type": "image"}]},
        {"role": "assistant", "content": "oi"},
        {"role": "tool", "content": "ignored"},
    ]
    t = ext._format_transcript(msgs)
    assert "olá" in t and "oi" in t and "ignored" not in t
