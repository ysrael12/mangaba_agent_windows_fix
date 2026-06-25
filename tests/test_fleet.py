"""Tests for mangaba_cli.fleet — fleet status aggregation + rendering."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from mangaba_cli import fleet


def _profile(name, running, model="gemma4:e4b", skills=3, desc="", default=False):
    return SimpleNamespace(
        name=name, path=Path(f"/tmp/profiles/{name}"),
        gateway_running=running, model=model, provider="ollama",
        skill_count=skills, description=desc, is_default=default,
    )


@pytest.fixture
def patched(monkeypatch):
    profiles = [
        _profile("empresa1", True, desc="Padaria — atende e gera PIX"),
        _profile("empresa2", False, model="claude-opus-4-8"),
        _profile("default", True, default=True),
    ]
    monkeypatch.setattr("mangaba_cli.profiles.list_profiles", lambda: profiles)
    # pid lookup: running profiles get a fake pid
    monkeypatch.setattr(fleet, "_pid_for",
                        lambda path: 4242 if "empresa1" in str(path) or "default" in str(path) else None)
    return profiles


def test_collect_fleet_maps_all(patched):
    members = fleet.collect_fleet()
    assert len(members) == 3
    names = {m.name for m in members}
    assert names == {"empresa1", "empresa2", "default"}


def test_running_sorted_first(patched):
    members = fleet.collect_fleet()
    # Running members come before stopped ones.
    assert members[0].running is True
    assert members[-1].name == "empresa2"  # the only stopped one, last


def test_pid_attached_for_running(patched):
    members = {m.name: m for m in fleet.collect_fleet()}
    assert members["empresa1"].pid == 4242
    assert members["empresa2"].pid is None


def test_render_fleet_summary(patched):
    text = fleet.render_fleet(fleet.collect_fleet())
    assert "3 agente(s)" in text
    assert "2 no ar" in text
    assert "1 parado" in text
    assert "empresa1" in text and "Padaria" in text


def test_render_empty():
    assert "Nenhum agente" in fleet.render_fleet([])


def test_find_member(patched):
    assert fleet.find_member("empresa1").running is True
    assert fleet.find_member("inexistente") is None


def test_stop_already_stopped(patched):
    ok, msg = fleet.stop_profile("empresa2")
    assert ok is True
    assert "já estava parado" in msg


def test_stop_unknown(patched):
    ok, msg = fleet.stop_profile("naoexiste")
    assert ok is False
    assert "não encontrado" in msg


def test_start_already_running(patched):
    ok, msg = fleet.start_profile("empresa1")
    assert ok is True
    assert "já está no ar" in msg


def test_stop_running_calls_terminate(patched, monkeypatch):
    killed = {}
    monkeypatch.setattr("gateway.status.terminate_pid",
                        lambda pid, **kw: killed.setdefault("pid", pid))
    ok, msg = fleet.stop_profile("empresa1")
    assert ok is True
    assert killed["pid"] == 4242
