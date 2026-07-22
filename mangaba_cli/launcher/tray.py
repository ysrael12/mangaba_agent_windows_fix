"""System tray icon + context menu for the Mangaba Dashboard launcher."""

from __future__ import annotations

import threading
import webbrowser
from pathlib import Path

import pystray
from PIL import Image

from .process_manager import DashboardProcessManager

# How often the watchdog thread checks whether the dashboard subprocess is
# still alive. Short enough that a crash is reflected in the icon within a
# few seconds without a user having to open the menu to notice.
_WATCHDOG_INTERVAL_S = 3.0


def load_icon(name: str) -> Image.Image:
    """Load an icon from the launcher's bundled resources directory."""
    resources = Path(__file__).parent / "resources"
    return Image.open(str(resources / name))


def create_tray(manager: DashboardProcessManager) -> pystray.Icon:
    """Create the tray icon with its context menu, wired to ``manager``."""

    icon_running = load_icon("icon_running.ico")
    icon_stopped = load_icon("icon_stopped.ico")

    def update_icon(icon: pystray.Icon) -> None:
        if manager.is_running:
            icon.icon = icon_running
            icon.title = "Mangaba Dashboard — Rodando"
        else:
            icon.icon = icon_stopped
            icon.title = "Mangaba Dashboard — Parado"

    def on_start(icon: pystray.Icon, item) -> None:
        manager.start()
        update_icon(icon)

    def on_stop(icon: pystray.Icon, item) -> None:
        manager.stop()
        update_icon(icon)

    def on_open(icon: pystray.Icon, item) -> None:
        webbrowser.open(f"http://127.0.0.1:{manager.port}")

    def on_exit(icon: pystray.Icon, item) -> None:
        manager.stop()
        icon.stop()

    menu = pystray.Menu(
        pystray.MenuItem("Abrir Dashboard", on_open, default=True),
        pystray.MenuItem("Iniciar", on_start, visible=lambda item: not manager.is_running),
        pystray.MenuItem("Parar", on_stop, visible=lambda item: manager.is_running),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Sair", on_exit),
    )

    icon = pystray.Icon("mangaba", icon_stopped, "Mangaba Dashboard", menu)

    def watchdog() -> None:
        """Reflect an unexpected dashboard crash in the icon without
        waiting for the user to open the menu (spec risk: "Dashboard
        crasha e launcher não detecta").

        Runs as a daemon thread for the life of the process — no explicit
        stop condition needed, since it dies when the launcher exits
        (``icon.stop()`` in ``on_exit`` ends ``icon.run()``, which ends
        ``__main__.py``'s ``main()``, which ends the process).
        """
        while True:
            threading.Event().wait(_WATCHDOG_INTERVAL_S)
            try:
                update_icon(icon)
            except Exception:
                # Icon may be mid-teardown — best-effort, never let the
                # watchdog thread crash the app.
                pass

    threading.Thread(target=watchdog, daemon=True).start()
    update_icon(icon)
    return icon
