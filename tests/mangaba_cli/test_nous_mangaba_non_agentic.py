"""Tests for the Nous-Mangaba-3/4 non-agentic warning detector.

Prior to this check, the warning fired on any model whose name contained
``"mangaba"`` anywhere (case-insensitive). That false-positived on unrelated
local Modelfiles such as ``mangaba-brain:qwen3-14b-ctx16k`` — a tool-capable
Qwen3 wrapper that happens to live under the "mangaba" tag namespace.

``is_nous_mangaba_non_agentic`` should only match the actual Dheiver Santos
Mangaba-3 / Mangaba-4 chat family.
"""

from __future__ import annotations

import pytest

from mangaba_cli.model_switch import (
    _MANGABA_MODEL_WARNING,
    _check_mangaba_model_warning,
    is_nous_mangaba_non_agentic,
)


@pytest.mark.parametrize(
    "model_name",
    [
        "dheiver2/Mangaba-3-Llama-3.1-70B",
        "dheiver2/Mangaba-3-Llama-3.1-405B",
        "mangaba-3",
        "Mangaba-3",
        "mangaba-4",
        "mangaba-4-405b",
        "mangaba_4_70b",
        "openrouter/mangaba3:70b",
        "openrouter/dheiver2/mangaba-4-405b",
        "dheiver2/Mangaba3",
        "mangaba-3.1",
    ],
)
def test_matches_real_nous_mangaba_chat_models(model_name: str) -> None:
    assert is_nous_mangaba_non_agentic(model_name), (
        f"expected {model_name!r} to be flagged as Nous Mangaba 3/4"
    )
    assert _check_mangaba_model_warning(model_name) == _MANGABA_MODEL_WARNING


@pytest.mark.parametrize(
    "model_name",
    [
        # Kyle's local Modelfile — qwen3:14b under a custom tag
        "mangaba-brain:qwen3-14b-ctx16k",
        "mangaba-brain:qwen3-14b-ctx32k",
        "mangaba-honcho:qwen3-8b-ctx8k",
        # Plain unrelated models
        "qwen3:14b",
        "qwen3-coder:30b",
        "qwen2.5:14b",
        "claude-opus-4-6",
        "anthropic/claude-sonnet-4.5",
        "gpt-5",
        "openai/gpt-4o",
        "google/gemini-2.5-flash",
        "deepseek-chat",
        # Non-chat Mangaba models we don't warn about
        "mangaba-llm-2",
        "mangaba2-pro",
        "nous-mangaba-2-mistral",
        # Edge cases
        "",
        "mangaba",  # bare "mangaba" isn't the 3/4 family
        "mangaba-brain",
        "brain-mangaba-3-impostor",  # "3" not preceded by /: boundary
    ],
)
def test_does_not_match_unrelated_models(model_name: str) -> None:
    assert not is_nous_mangaba_non_agentic(model_name), (
        f"expected {model_name!r} NOT to be flagged as Nous Mangaba 3/4"
    )
    assert _check_mangaba_model_warning(model_name) == ""


def test_none_like_inputs_are_safe() -> None:
    assert is_nous_mangaba_non_agentic("") is False
    # Defensive: the helper shouldn't crash on None-ish falsy input either.
    assert _check_mangaba_model_warning("") == ""
