"""Tests for agent.followups — proactive follow-up heartbeat store."""

import importlib

import pytest


@pytest.fixture
def fu(tmp_path, monkeypatch):
    monkeypatch.setenv("MANGABA_HOME", str(tmp_path))
    import mangaba_agent.mangaba_constants as mangaba_constants
    importlib.reload(mangaba_constants)
    from agent import followups as mod
    importlib.reload(mod)
    return mod


def test_add_and_list(fu):
    f = fu.add_followup(platform="telegram", chat_id="123",
                        message="oi", delay_seconds=3600, now=1000.0)
    assert f.id and f.due_at == 1000.0 + 3600
    assert len(fu.list_open()) == 1


def test_due_only_when_time_passed(fu):
    fu.add_followup(platform="telegram", chat_id="1", message="m",
                    delay_seconds=100, now=1000.0)
    assert fu.due_followups(now=1050.0) == []        # not yet
    assert len(fu.due_followups(now=1100.0)) == 1     # due
    assert len(fu.due_followups(now=2000.0)) == 1     # overdue


def test_mark_sent_removes_from_due(fu):
    f = fu.add_followup(platform="x", chat_id="1", message="m",
                        delay_seconds=0, now=1000.0)
    assert fu.mark_sent(f.id) is True
    assert fu.due_followups(now=1000.0) == []
    assert fu.list_open() == []
    assert fu.mark_sent(f.id) is False               # already sent


def test_cancel(fu):
    f = fu.add_followup(platform="x", chat_id="1", message="m",
                        delay_seconds=10, now=1000.0)
    assert fu.cancel(f.id) is True
    assert fu.list_open() == []
    assert fu.due_followups(now=2000.0) == []


def test_validation(fu):
    with pytest.raises(ValueError):
        fu.add_followup(platform="", chat_id="1", message="m", delay_seconds=10)
    with pytest.raises(ValueError):
        fu.add_followup(platform="x", chat_id="1", message="", delay_seconds=10)
    with pytest.raises(ValueError):
        fu.add_followup(platform="x", chat_id="1", message="m", delay_seconds=-5)


@pytest.mark.parametrize("text,expected", [
    ("2h", 7200),
    ("30min", 1800),
    ("45m", 2700),
    ("1 dia", 86400),
    ("2 horas", 7200),
    ("90s", 90),
    ("1h30min", 5400),
])
def test_parse_duration(fu, text, expected):
    assert fu.parse_duration(text) == expected


def test_parse_duration_rejects_garbage(fu):
    assert fu.parse_duration("amanhã") is None
    assert fu.parse_duration("") is None


def test_list_open_sorted_by_due(fu):
    fu.add_followup(platform="x", chat_id="1", message="b", delay_seconds=200, now=1000.0)
    fu.add_followup(platform="x", chat_id="1", message="a", delay_seconds=100, now=1000.0)
    ids = [f.message for f in fu.list_open()]
    assert ids == ["a", "b"]
