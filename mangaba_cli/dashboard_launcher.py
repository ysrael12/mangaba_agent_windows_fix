"""Standalone dashboard launcher for the frozen Windows executable.

Double-click mangaba-dashboard.exe to start the web UI server, auto-start
the messaging gateway, and open the browser — no CLI knowledge required.

This module is the entry point for the ``mangaba-dashboard`` PyInstaller
executable. It intentionally avoids argparse / CLI subcommand machinery
so the end-user gets a zero-friction experience.
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    # ── 1. Bootstrap UTF-8 on Windows (same as mangaba_bootstrap) ──────
    try:
        import mangaba_agent.mangaba_bootstrap  # noqa: F401
    except ModuleNotFoundError:
        pass

    # ── 2. Set MANGABA_HOME if not already set ─────────────────────────
    # In a frozen bundle the user likely has no MANGABA_HOME env var.
    # Default to ~/.mangaba (the standard location).
    from mangaba_constants import get_mangaba_home  # noqa: E402
    get_mangaba_home()  # triggers resolution; creates dir if needed

    # ── 3. Ensure the web dist is findable ─────────────────────────────
    from mangaba_agent.frozen import get_bundle_dir

    if "MANGABA_WEB_DIST" not in os.environ:
        web_dist = get_bundle_dir() / "mangaba_cli" / "web_dist"
        if web_dist.is_dir():
            os.environ["MANGABA_WEB_DIST"] = str(web_dist)

    # ── 4. Fast-path: check if dashboard is already running ────────────
    try:
        from mangaba_cli.main import (
            _report_dashboard_status,
            _find_stale_dashboard_pids,
        )
        running = _report_dashboard_status()
        if running > 0:
            # Already running — just open the browser
            import webbrowser
            port = int(os.environ.get("MANGABA_DASHBOARD_PORT", "9119"))
            webbrowser.open(f"http://127.0.0.1:{port}")
            return
    except Exception:
        pass  # first run, nothing running

    # ── 5. Auto-start gateway in the background ────────────────────────
    try:
        from mangaba_cli.main import (
            _autostart_gateway_if_needed,
            _reconcile_client_agents_async,
        )
        _autostart_gateway_if_needed()
        _reconcile_client_agents_async()
    except Exception as exc:
        print(f"Gateway autostart skipped: {exc}")

    # ── 6. Start the dashboard server (blocks) ─────────────────────────
    from mangaba_cli.web_server import start_server

    port = int(os.environ.get("MANGABA_DASHBOARD_PORT", "9119"))
    host = os.environ.get("MANGABA_DASHBOARD_HOST", "127.0.0.1")

    print(f"Starting Mangaba Dashboard on http://{host}:{port}")
    print("Press Ctrl+C to stop.")

    start_server(
        host=host,
        port=port,
        open_browser=True,
        allow_public=False,
        embedded_chat=True,
    )


if __name__ == "__main__":
    main()
