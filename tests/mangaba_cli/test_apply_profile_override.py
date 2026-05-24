"""Regression tests for _apply_profile_override MANGABA_HOME guard (issue #22502).

When MANGABA_HOME is set to the mangaba root (e.g. systemd hardcodes
MANGABA_HOME=/root/.mangaba), _apply_profile_override must still read
active_profile and update MANGABA_HOME to the profile directory.

When MANGABA_HOME is already a profile directory (.../profiles/<name>),
_apply_profile_override must trust it and return without re-reading
active_profile (child-process inheritance contract).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest


def _run_apply_profile_override(
    tmp_path, monkeypatch, *, mangaba_home: str | None, active_profile: str | None,
    argv: list[str] | None = None,
):
    """Run _apply_profile_override in isolation.

    Returns the value of os.environ["MANGABA_HOME"] after the call,
    or None if unset.
    """
    mangaba_root = tmp_path / ".mangaba"
    mangaba_root.mkdir(parents=True, exist_ok=True)

    if active_profile is not None:
        (mangaba_root / "active_profile").write_text(active_profile)

    if active_profile and active_profile != "default":
        (mangaba_root / "profiles" / active_profile).mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    if mangaba_home is not None:
        monkeypatch.setenv("MANGABA_HOME", mangaba_home)
    else:
        monkeypatch.delenv("MANGABA_HOME", raising=False)

    monkeypatch.setattr(sys, "argv", argv or ["mangaba", "gateway", "start"])

    from mangaba_cli.main import _apply_profile_override
    _apply_profile_override()

    return os.environ.get("MANGABA_HOME")


class TestApplyProfileOverrideMangabaHomeGuard:
    """Regression guard for issue #22502.

    Verifies that MANGABA_HOME pointing to the mangaba root does NOT suppress
    the active_profile check, while MANGABA_HOME already pointing to a
    profile directory IS trusted as-is.
    """

    def test_mangaba_home_at_root_with_active_profile_is_redirected(
        self, tmp_path, monkeypatch
    ):
        """MANGABA_HOME=/root/.mangaba + active_profile=coder must redirect
        MANGABA_HOME to .../profiles/coder.

        Bug scenario from #22502: systemd sets MANGABA_HOME to the mangaba root
        and the user switches to a profile via `mangaba profile use`.
        Before the fix, the guard returned early and active_profile was ignored.
        """
        mangaba_root = tmp_path / ".mangaba"
        mangaba_root.mkdir(parents=True, exist_ok=True)

        result = _run_apply_profile_override(
            tmp_path,
            monkeypatch,
            mangaba_home=str(mangaba_root),
            active_profile="coder",
        )

        assert result is not None, "MANGABA_HOME must be set after profile redirect"
        assert "profiles" in result, (
            f"Expected MANGABA_HOME to point into profiles/ dir, got: {result!r}"
        )
        assert result.endswith("coder"), (
            f"Expected MANGABA_HOME to end with 'coder', got: {result!r}"
        )

    def test_mangaba_home_already_profile_dir_is_trusted(self, tmp_path, monkeypatch):
        """MANGABA_HOME=.../profiles/coder must not be overridden even when
        active_profile says something different.

        Preserves the child-process inheritance contract: a subprocess spawned
        with MANGABA_HOME already set to a specific profile must stay in that
        profile.
        """
        mangaba_root = tmp_path / ".mangaba"
        profile_dir = mangaba_root / "profiles" / "coder"
        profile_dir.mkdir(parents=True, exist_ok=True)

        (mangaba_root / "active_profile").write_text("other")

        monkeypatch.setattr(Path, "home", lambda: tmp_path)
        monkeypatch.setenv("MANGABA_HOME", str(profile_dir))
        monkeypatch.setattr(sys, "argv", ["mangaba", "gateway", "start"])

        from mangaba_cli.main import _apply_profile_override
        _apply_profile_override()

        assert os.environ.get("MANGABA_HOME") == str(profile_dir), (
            "MANGABA_HOME must remain unchanged when already pointing to a profile dir"
        )

    def test_mangaba_home_unset_reads_active_profile(self, tmp_path, monkeypatch):
        """Classic case: MANGABA_HOME unset + active_profile=coder must set
        MANGABA_HOME to the profile directory (existing behaviour must not regress).
        """
        result = _run_apply_profile_override(
            tmp_path,
            monkeypatch,
            mangaba_home=None,
            active_profile="coder",
        )

        assert result is not None
        assert "coder" in result

    def test_mangaba_home_unset_default_profile_no_redirect(self, tmp_path, monkeypatch):
        """active_profile=default must not redirect MANGABA_HOME."""
        mangaba_root = tmp_path / ".mangaba"
        mangaba_root.mkdir(parents=True, exist_ok=True)

        monkeypatch.setattr(Path, "home", lambda: tmp_path)
        monkeypatch.delenv("MANGABA_HOME", raising=False)
        monkeypatch.setattr(sys, "argv", ["mangaba", "gateway", "start"])
        (mangaba_root / "active_profile").write_text("default")

        from mangaba_cli.main import _apply_profile_override
        _apply_profile_override()

        assert os.environ.get("MANGABA_HOME") is None
