"""Frozen-bundle awareness for PyInstaller builds.

Centralizes the ``sys.frozen`` / ``sys._MEIPASS`` detection so every module
that needs to locate a bundled resource (dashboard SPA, skills, locales,
plugins, the tool manifest, …) resolves the same base directory whether the
app runs from source or from a PyInstaller ``--onedir`` bundle.

Behavior contract (important — do not break):
    In **non-frozen** (source) mode ``get_bundle_dir()`` returns the repository
    root (the parent of this ``mangaba_agent`` package), so ``resource_path(x)``
    equals ``<repo_root>/x``. Every call site that previously computed a path
    like ``Path(__file__).resolve().parent.parent / "plugins"`` from a module
    living at ``<repo_root>/<pkg>/<mod>.py`` therefore gets an identical result
    after switching to ``resource_path("plugins")``. This keeps source runs
    byte-for-byte compatible while enabling the frozen path.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path
from typing import Optional


def is_frozen() -> bool:
    """True when running from a PyInstaller (or similar) frozen bundle."""
    return getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")


def get_bundle_dir() -> Path:
    """Root of the bundle (where bundled data — web_dist, skills, plugins — live).

    Frozen: ``sys._MEIPASS`` (PyInstaller's extraction/data root).
    Source: the repository root (parent of the ``mangaba_agent`` package).
    """
    if is_frozen():
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent


def get_executable_dir() -> Path:
    """Directory to place/read user-facing writable files next to the app.

    Frozen: the directory containing the executable, so configs/logs written
    "next to the .exe" land beside it rather than inside the read-only bundle.
    Source: the current working directory (unchanged legacy behavior).
    """
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return Path.cwd()


def resource_path(relative: str) -> Path:
    """Resolve ``relative`` against the bundle root.

    Use for read-only bundled resources (skills, locales, plugins, web_dist,
    the tool manifest). Accepts forward-slash relative paths like
    ``"mangaba_cli/web_dist"``.
    """
    return get_bundle_dir() / relative


def find_node_executable() -> Optional[Path]:
    """Locate a usable ``node`` binary: system PATH first, then the portable
    runtime the Windows installer places next to the frozen executable.

    The Inno Setup installer (see ``SPEC_INSTALLER.md``) downloads a portable
    Node.js build into ``<install_dir>\\runtime\\node\\`` when no compatible
    ``node`` is found on the system PATH at install time. Source/dev runs and
    non-Windows frozen builds have no such directory — only checked when
    ``is_frozen()`` is true, since ``get_executable_dir()`` falls back to
    ``Path.cwd()`` in source mode, where a ``runtime/node/`` lookup would be
    meaningless.
    """
    system_node = shutil.which("node")
    if system_node:
        return Path(system_node)

    if not is_frozen():
        return None

    exe_name = "node.exe" if sys.platform == "win32" else "node"
    bundled = get_executable_dir() / "runtime" / "node" / exe_name
    if bundled.is_file():
        return bundled
    return None
