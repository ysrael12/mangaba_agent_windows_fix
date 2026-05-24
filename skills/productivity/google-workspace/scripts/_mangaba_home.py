"""Resolve MANGABA_HOME for standalone skill scripts.

Skill scripts may run outside the Mangaba process (e.g. system Python,
nix env, CI) where ``mangaba_constants`` is not importable.  This module
provides the same ``get_mangaba_home()`` and ``display_mangaba_home()``
contracts as ``mangaba_constants`` without requiring it on ``sys.path``.

When ``mangaba_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``mangaba_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``MANGABA_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from mangaba_constants import display_mangaba_home as display_mangaba_home
    from mangaba_constants import get_mangaba_home as get_mangaba_home
except (ModuleNotFoundError, ImportError):

    def get_mangaba_home() -> Path:
        """Return the Mangaba home directory (default: ~/.mangaba).

        Mirrors ``mangaba_constants.get_mangaba_home()``."""
        val = os.environ.get("MANGABA_HOME", "").strip()
        return Path(val) if val else Path.home() / ".mangaba"

    def display_mangaba_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``mangaba_constants.display_mangaba_home()``."""
        home = get_mangaba_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)
