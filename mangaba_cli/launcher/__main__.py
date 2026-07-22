"""Entry point for ``mangaba-launcher.exe`` (system tray launcher).

Separate from ``mangaba_cli/dashboard_launcher.py`` (the headless
``mangaba-dashboard.exe`` entry point, which keeps working standalone for
anyone who wants to run the server without a tray). This module only
manages the tray icon and the dashboard subprocess — see
``SPEC_INSTALLER.md`` (Fase 7).
"""

from __future__ import annotations

import sys
from pathlib import Path

from .process_manager import DashboardProcessManager
from .tray import create_tray


def main() -> None:
    if getattr(sys, "frozen", False):
        install_dir = Path(sys.executable).resolve().parent
    else:
        # Source/dev run: dashboard exe would live in dist/mangaba-dashboard/
        # next to the repo root — not meaningful outside the frozen build,
        # but keep this from crashing during local testing of tray.py itself.
        install_dir = Path(__file__).resolve().parents[2] / "dist" / "mangaba-dashboard"

    manager = DashboardProcessManager(install_dir)

    if "--minimized" in sys.argv:
        manager.start()

    icon = create_tray(manager)
    icon.run()


if __name__ == "__main__":
    main()
