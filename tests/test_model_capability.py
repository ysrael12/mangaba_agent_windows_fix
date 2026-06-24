"""Tests for agent.model_capability — capable vs weak model heuristic."""

import pytest

from agent import model_capability as mc


@pytest.mark.parametrize("model", [
    "claude-opus-4-8",
    "anthropic/claude-sonnet-4-6",
    "gpt-4o",
    "openai/gpt-5",
    "google/gemini-2.5-pro",
    "deepseek-chat",
    "x-ai/grok-2",
    "qwen2.5-72b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-405b",
])
def test_capable_models(model):
    assert mc.is_capable_model(model) is True
    assert mc.capability_tier(model) == "capaz"


@pytest.mark.parametrize("model", [
    "gemma4:e4b",
    "gemma2:9b",
    "ollama/gemma-2b",
    "phi-3",
    "qwen2.5:7b",
    "llama-3.1-8b",
    "mistral-7b",
    "smollm2",
    "",  # unknown/empty → treat as weak (safe)
    "some-random-local-model",
])
def test_weak_models(model):
    assert mc.is_capable_model(model) is False
    assert mc.capability_tier(model) == "fraco"


def test_specific_weak_beats_generic_capable_family():
    # llama is a capable family, but the 8b variant is weak → weak wins.
    assert mc.is_capable_model("meta-llama/llama-3.1-8b-instruct") is False
    # qwen max is capable, qwen 7b is weak
    assert mc.is_capable_model("qwen-max") is True
    assert mc.is_capable_model("qwen2.5:7b") is False


def test_default_is_gemma_weak():
    # The project default model family must be treated as weak (gets scaffolding).
    assert mc.is_capable_model("gemma4:e4b") is False
