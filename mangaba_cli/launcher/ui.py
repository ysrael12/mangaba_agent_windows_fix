"""Small native dialogs for the tray launcher (Windows MessageBox via ctypes).

``pystray`` has no built-in message-box helper — these use ``ctypes`` +
``user32.MessageBoxW`` directly so the launcher doesn't need an extra GUI
toolkit dependency just for an "About" box and error popups.
"""

from __future__ import annotations

import ctypes
import sys

_MB_OK = 0x0
_MB_ICONINFORMATION = 0x40
_MB_ICONERROR = 0x10


def _get_version() -> str:
    try:
        from importlib.metadata import version

        return version("mangaba-agent")
    except Exception:
        return "dev"


def show_about() -> None:
    if sys.platform != "win32":
        return
    ctypes.windll.user32.MessageBoxW(
        0,
        f"Mangaba Dashboard v{_get_version()}\nhttps://mangaba.dev",
        "Mangaba Dashboard",
        _MB_OK | _MB_ICONINFORMATION,
    )


def show_error(msg: str) -> None:
    if sys.platform != "win32":
        return
    ctypes.windll.user32.MessageBoxW(
        0, msg, "Mangaba Dashboard — Erro", _MB_OK | _MB_ICONERROR
    )
