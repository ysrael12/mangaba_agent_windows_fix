"""Manages the ``mangaba-dashboard`` subprocess lifecycle for the tray launcher."""

from __future__ import annotations

import os
import socket
import subprocess
from pathlib import Path
from typing import Optional

from mangaba_cli._subprocess_compat import windows_detach_popen_kwargs


def _port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """True if something is already listening on ``host:port``.

    Used before spawning so a second launcher instance (or the dashboard
    already started another way) doesn't stack a redundant, failing
    process on top of a working one.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


class DashboardProcessManager:
    """Encapsulates start/stop/status of the dashboard as a subprocess."""

    def __init__(self, install_dir: Path, port: Optional[int] = None):
        self._install_dir = install_dir
        self._process: Optional[subprocess.Popen] = None
        self._dashboard_exe = install_dir / "mangaba-dashboard.exe"
        self._port = port or int(os.environ.get("MANGABA_DASHBOARD_PORT", "9119"))

    @property
    def port(self) -> int:
        return self._port

    @property
    def is_running(self) -> bool:
        """True if this manager's own subprocess is alive.

        Deliberately does NOT fall back to a port check — a stale process
        from a previous launcher instance would then read as "running"
        with no way for this manager to stop it. ``start()`` uses the port
        check separately to avoid stacking a second server.
        """
        if self._process is None:
            return False
        return self._process.poll() is None

    def start(self) -> bool:
        """Start the dashboard. Returns True if started or already running."""
        if self.is_running:
            return True
        if _port_in_use(self._port):
            # Something else (another launcher, a manually-started dashboard)
            # already owns the port — treat as success rather than spawning
            # a second server that will just fail to bind.
            return True
        if not self._dashboard_exe.is_file():
            return False

        self._process = subprocess.Popen(
            [str(self._dashboard_exe)],
            cwd=str(self._install_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            close_fds=True,
            **windows_detach_popen_kwargs(),
        )
        return True

    def stop(self, timeout: float = 5.0) -> bool:
        """Stop the dashboard gracefully. Returns True if stopped."""
        if not self.is_running:
            return True
        assert self._process is not None
        try:
            self._process.terminate()
            self._process.wait(timeout=timeout)
            return True
        except subprocess.TimeoutExpired:
            self._process.kill()
            self._process.wait(timeout=2)
            return True
        except Exception:
            return False

    def stop_gateway(self, timeout: float = 5.0) -> bool:
        """Stop the background gateway process (``mangaba gateway run``).

        The dashboard auto-starts the gateway as a *detached* subprocess
        (``_autostart_gateway_if_needed`` in ``mangaba_cli/main.py``) — it is
        not a child of this launcher's dashboard process, so ``stop()``
        terminating the dashboard leaves the gateway running as an orphan.
        Call this alongside ``stop()`` when the user fully exits the
        launcher, so no background ``mangaba.exe`` process is left behind.
        Returns True if a gateway process was found and stopped (or none
        was running), False if it was found but could not be stopped.
        """
        try:
            from gateway.status import get_running_pid, terminate_pid, _pid_exists
        except ImportError:
            return True

        pid = get_running_pid()
        if pid is None:
            return True

        try:
            terminate_pid(pid, force=False)
        except ProcessLookupError:
            return True
        except PermissionError:
            return False
        except OSError:
            return False

        import time

        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if not _pid_exists(pid):
                return True
            time.sleep(0.2)

        try:
            terminate_pid(pid, force=True)
        except (ProcessLookupError, PermissionError, OSError):
            pass
        return not _pid_exists(pid)

    def pid(self) -> Optional[int]:
        if self.is_running:
            assert self._process is not None
            return self._process.pid
        return None
