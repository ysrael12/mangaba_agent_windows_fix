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


def test_read_gateway_log_tail(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir()
    (logs / "gateway.log").write_text("\n".join(f"line {i}" for i in range(100)))
    out = fleet.read_gateway_log(tmp_path, lines=5)
    assert "line 99" in out and "line 95" in out
    assert "line 94" not in out


def test_read_gateway_log_missing(tmp_path):
    assert "ainda não rodou" in fleet.read_gateway_log(tmp_path)


def test_home_channels_parsed(tmp_path):
    (tmp_path / "config.yaml").write_text(
        "platforms:\n"
        "  telegram:\n"
        "    home_channel:\n"
        "      platform: telegram\n"
        "      chat_id: '12345'\n"
        "      name: Operador\n"
    )
    homes = fleet._home_channels_for_profile(tmp_path)
    assert len(homes) == 1
    assert homes[0]["chat_id"] == "12345"
    assert homes[0]["platform"] == "telegram"


def test_home_channels_none_when_absent(tmp_path):
    (tmp_path / "config.yaml").write_text("platforms:\n  telegram: {}\n")
    assert fleet._home_channels_for_profile(tmp_path) == []


def test_broadcast_enqueues_followups(patched, tmp_path, monkeypatch):
    # Give empresa1 (running) a home_channel; empresa2 is stopped.
    p1 = tmp_path / "empresa1"
    (p1).mkdir()
    (p1 / "config.yaml").write_text(
        "platforms:\n  telegram:\n    home_channel:\n      platform: telegram\n      chat_id: '999'\n      name: Op\n"
    )
    # Re-point the running member's path to our temp dir.
    members = [
        SimpleNamespace(name="empresa1", path=p1, gateway_running=True,
                        model="m", provider="ollama", skill_count=0,
                        description="", is_default=False),
    ]
    monkeypatch.setattr("mangaba_cli.profiles.list_profiles", lambda: members)
    monkeypatch.setattr(fleet, "_pid_for", lambda path: 1)
    reached, channels, skipped = fleet.broadcast("manutenção às 22h")
    assert reached == 1 and channels == 1
    store = p1 / "followups.jsonl"
    assert store.exists()
    line = store.read_text().strip()
    assert "manutenção às 22h" in line and "fleet-broadcast" in line


def test_broadcast_skips_no_home_channel(patched, tmp_path, monkeypatch):
    p = tmp_path / "nope"
    p.mkdir()
    (p / "config.yaml").write_text("platforms:\n  telegram: {}\n")
    members = [SimpleNamespace(name="nope", path=p, gateway_running=True,
                              model="m", provider="o", skill_count=0,
                              description="", is_default=False)]
    monkeypatch.setattr("mangaba_cli.profiles.list_profiles", lambda: members)
    monkeypatch.setattr(fleet, "_pid_for", lambda path: 1)
    reached, channels, skipped = fleet.broadcast("oi")
    assert reached == 0 and channels == 0
    assert any("sem home_channel" in s for s in skipped)


def test_broadcast_empty_raises(patched):
    with pytest.raises(ValueError):
        fleet.broadcast("")
