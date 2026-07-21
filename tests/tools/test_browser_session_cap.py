"""Regression tests for the concurrent browser session cap."""

import pytest
from unittest.mock import patch


class TestBrowserSessionCap:
    def setup_method(self):
        from tools import browser_tool

        self.browser_tool = browser_tool
        self.orig_active_sessions = browser_tool._active_sessions.copy()

    def teardown_method(self):
        self.browser_tool._active_sessions.clear()
        self.browser_tool._active_sessions.update(self.orig_active_sessions)

    def test_raises_when_at_cap_for_new_task_id(self):
        browser_tool = self.browser_tool
        browser_tool._active_sessions.clear()
        for i in range(browser_tool.BROWSER_MAX_CONCURRENT_SESSIONS):
            browser_tool._active_sessions[f"task-{i}"] = {"session_name": f"sess-{i}"}

        with (
            patch.object(browser_tool, "_start_browser_cleanup_thread"),
            patch.object(browser_tool, "_update_session_activity"),
        ):
            with pytest.raises(RuntimeError, match="Browser session limit reached"):
                browser_tool._get_session_info("task-new")

    def test_allows_reusing_existing_task_id_even_at_cap(self):
        browser_tool = self.browser_tool
        browser_tool._active_sessions.clear()
        for i in range(browser_tool.BROWSER_MAX_CONCURRENT_SESSIONS):
            browser_tool._active_sessions[f"task-{i}"] = {"session_name": f"sess-{i}"}

        with (
            patch.object(browser_tool, "_start_browser_cleanup_thread"),
            patch.object(browser_tool, "_update_session_activity"),
        ):
            result = browser_tool._get_session_info("task-0")

        assert result == {"session_name": "sess-0"}

    def test_allows_new_session_under_cap(self):
        browser_tool = self.browser_tool
        browser_tool._active_sessions.clear()

        with (
            patch.object(browser_tool, "_start_browser_cleanup_thread"),
            patch.object(browser_tool, "_update_session_activity"),
            patch.object(browser_tool, "_get_cdp_override", return_value=None),
            patch.object(browser_tool, "_is_local_sidecar_key", return_value=False),
            patch.object(browser_tool, "_get_cloud_provider", return_value=None),
            patch.object(
                browser_tool,
                "_create_local_session",
                return_value={"session_name": "sess-new", "features": {"local": True}},
            ),
            patch.object(browser_tool, "_ensure_cdp_supervisor"),
        ):
            result = browser_tool._get_session_info("task-under-cap")

        assert result["session_name"] == "sess-new"
        assert "task-under-cap" in browser_tool._active_sessions
