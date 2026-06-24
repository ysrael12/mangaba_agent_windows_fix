"""Heurística de capacidade do modelo ativo — para adaptar os auxílios determinísticos.

O Mangaba usa **gemma como default, mas qualquer modelo vindo do gateway** (Claude,
GPT, Gemini, DeepSeek, Llama grande, etc.). Os auxílios determinísticos (ex.:
injeção do plano decomposto) são salva-vidas para modelos fracos; um modelo forte
planeja melhor sozinho e não deve ser engessado por eles.

Este módulo classifica o modelo ativo em "capaz" (orquestra bem sozinho) ou
"fraco" (precisa de andaime determinístico), por nome do modelo — sem rede, sem
custo. É heurístico de propósito: na dúvida, trata como FRACO (mais seguro: o
andaime ajuda e raramente atrapalha).
"""

from __future__ import annotations

import re
from typing import Optional

# Famílias/sinais de modelos fortes que orquestram tarefas complexas sozinhos.
_CAPABLE_PATTERNS = [
    r"claude",                              # Anthropic (qualquer)
    r"gpt-4", r"gpt-5", r"gpt-4o", r"\bo[134]\b", r"o3-|o1-|o4-",
    r"gemini-(?:1\.5|2|2\.5|pro|exp)", r"gemini-flash",
    r"deepseek", r"grok", r"mistral-large", r"mixtral-8x22",
    r"command-r-plus", r"qwen.*(?:72b|max|plus|235b|110b)",
    r"llama.*(?:70b|405b|3\.[123]-70|3\.[123]-405)",
    r"nemotron.*(?:70b|340b|ultra|super)", r"kimi", r"nous|hermes-(?:3|4)",
]

# Sinais de modelos pequenos/fracos (precisam de andaime determinístico).
_WEAK_PATTERNS = [
    r"gemma", r"phi-?[0-9]", r"\b(?:1|2|3|4|5|6|7|8|9)b\b", r"\bmini\b",
    r"\bsmall\b", r"\btiny", r"qwen.*(?:0\.5b|1\.5b|3b|4b|7b)", r"llama.*(?:1b|3b|8b)",
    r"smollm", r"stablelm", r"tinyllama", r"\be[0-9]b\b",  # gemma 3n e2b/e4b
]


def _norm(model: Optional[str]) -> str:
    return (model or "").strip().lower()


def is_capable_model(model: Optional[str]) -> bool:
    """True se o modelo provavelmente orquestra pedidos complexos sozinho.

    Estratégia: se bate num sinal CAPAZ → capaz. Senão, se bate num sinal FRACO
    → fraco. Caso totalmente desconhecido → assume FRACO (andaime ajuda e o custo
    de injetar um checklist é baixo).
    """
    name = _norm(model)
    if not name:
        return False
    for pat in _CAPABLE_PATTERNS:
        if re.search(pat, name):
            # Um sinal de "fraco" mais específico (ex.: llama-3.1-8b) tem
            # prioridade sobre um "capaz" genérico de mesma família.
            for wpat in _WEAK_PATTERNS:
                if re.search(wpat, name):
                    return False
            return True
    return False  # desconhecido ou explicitamente fraco → fraco


def capability_tier(model: Optional[str]) -> str:
    """'capaz' | 'fraco' — rótulo legível."""
    return "capaz" if is_capable_model(model) else "fraco"
