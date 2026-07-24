"""Tests for DashboardProcessManager.stop_gateway().

The dashboard auto-starts the gateway (`mangaba gateway run`) as a detached
subprocess -- it is not a child of the launcher's dashboard process, so
stopping the dashboard alone leaves the gateway running as an orphan.
stop_gateway() must independently find and terminate it via its PID file.
"""

import sys
import types

import pytest

from mangaba_cli.launcher.process_manager import DashboardProcessManager


def _fake_gateway_status_module(**overrides):
    """Build a fake `gateway.status` module with overridable functions."""
    mod = types.ModuleType("gateway.status")
    mod.get_running_pid = overrides.get("get_running_pid", lambda: None)
    mod.terminate_pid = overrides.get("terminate_pid", lambda pid, force=False: None)
    mod._pid_exists = overrides.get("_pid_exists", lambda pid: False)
    return mod


@pytest.fixture
def manager(tmp_path):
    return DashboardProcessManager(install_dir=tmp_path)


def test_stop_gateway_returns_true_when_none_running(manager, monkeypatch):
    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(get_running_pid=lambda: None),
    )
    assert manager.stop_gateway() is True


def test_stop_gateway_terminates_gracefully(manager, monkeypatch):
    terminate_calls = []
    # Simulate the process dying immediately after a graceful terminate.
    state = {"alive": True}

    def fake_terminate(pid, force=False):
        terminate_calls.append((pid, force))
        state["alive"] = False

    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(
            get_running_pid=lambda: 4242,
            terminate_pid=fake_terminate,
            _pid_exists=lambda pid: state["alive"],
        ),
    )

    assert manager.stop_gateway(timeout=1.0) is True
    assert terminate_calls == [(4242, False)]


def test_stop_gateway_force_kills_after_timeout(manager, monkeypatch):
    terminate_calls = []
    # Process never dies from the graceful terminate, only from force=True.
    state = {"alive": True}

    def fake_terminate(pid, force=False):
        terminate_calls.append((pid, force))
        if force:
            state["alive"] = False

    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(
            get_running_pid=lambda: 4242,
            terminate_pid=fake_terminate,
            _pid_exists=lambda pid: state["alive"],
        ),
    )

    assert manager.stop_gateway(timeout=0.3) is True
    assert terminate_calls == [(4242, False), (4242, True)]


def test_stop_gateway_returns_false_when_unkillable(manager, monkeypatch):
    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(
            get_running_pid=lambda: 4242,
            terminate_pid=lambda pid, force=False: None,
            _pid_exists=lambda pid: True,  # never dies, even after force
        ),
    )

    assert manager.stop_gateway(timeout=0.3) is False


def test_stop_gateway_handles_permission_error(manager, monkeypatch):
    def fake_terminate(pid, force=False):
        raise PermissionError("denied")

    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(
            get_running_pid=lambda: 4242,
            terminate_pid=fake_terminate,
        ),
    )

    assert manager.stop_gateway() is False


def test_stop_gateway_handles_already_gone(manager, monkeypatch):
    def fake_terminate(pid, force=False):
        raise ProcessLookupError()

    monkeypatch.setitem(
        sys.modules,
        "gateway.status",
        _fake_gateway_status_module(
            get_running_pid=lambda: 4242,
            terminate_pid=fake_terminate,
        ),
    )

    assert manager.stop_gateway() is True
