"""Guardrail de saída (eval-driven) — inspeciona a resposta do agente ANTES de
enviar e age (redige PII ou bloqueia conteúdo fora do escopo/inseguro).

Tendência 2026: guardrails que intervêm em runtime (bloqueiam/transformam) com
orçamento de latência baixo. Aqui:
  • PII (regex, instantâneo): CPF, CNPJ, cartão, e-mail, telefone → redige.
  • Segurança/escopo (opcional, LLM-juiz): só quando ``guardrails.llm_check``.

Config (config.yaml ``guardrails``):
  enabled: bool          — liga o guardrail
  redact_pii: bool       — redige PII (padrão true quando enabled)
  mode: redact | block   — redigir o trecho ou bloquear a resposta inteira
  llm_check: bool        — checagem extra de segurança/escopo via modelo (custa 1 call)
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_REDACTION = "[removido]"

# Padrões de PII (foco Brasil + universais).
_PII_PATTERNS: List[tuple] = [
    ("cartão", re.compile(r"\b(?:\d[ -]?){13,16}\b")),
    ("cnpj", re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")),
    ("cpf", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("e-mail", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("telefone", re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b")),
]


def _cfg() -> Dict[str, Any]:
    try:
        from mangaba_cli.config import load_config

        return (load_config().get("guardrails") or {})
    except Exception:
        return {}


def enabled() -> bool:
    return bool(_cfg().get("enabled"))


def redact_pii(text: str) -> Dict[str, Any]:
    """Redige PII no texto. Retorna {text, found:[tipos]}."""
    found: List[str] = []
    out = text
    for label, rx in _PII_PATTERNS:
        if rx.search(out):
            found.append(label)
            out = rx.sub(_REDACTION, out)
    return {"text": out, "found": found}


def _llm_safety(user_msg: str, reply: str) -> Dict[str, Any]:
    """Checa segurança/escopo via modelo. Retorna {safe, reason}."""
    try:
        from mangaba_cli.config import load_config
        from openai import OpenAI

        m = (load_config().get("model") or {})
        client = OpenAI(base_url=m.get("base_url") or None, api_key=m.get("api_key") or "x")
        prompt = (
            "Você é um filtro de segurança. A resposta abaixo contém conteúdo "
            "tóxico, ofensivo, perigoso ou claramente fora do escopo de um "
            "atendimento profissional? Responda APENAS 'SAFE' ou 'UNSAFE: motivo'.\n\n"
            f"Pergunta: {user_msg[:400]}\n\nResposta: {reply[:800]}"
        )
        r = client.chat.completions.create(
            model=m.get("default") or m.get("name") or "",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=40, temperature=0,
        )
        t = (r.choices[0].message.content or "").strip()
        if t.upper().startswith("UNSAFE"):
            return {"safe": False, "reason": t.split(":", 1)[1].strip() if ":" in t else "conteúdo inseguro"}
        return {"safe": True, "reason": ""}
    except Exception as e:  # noqa: BLE001
        logger.debug("guardrail llm_safety falhou: %s", e)
        return {"safe": True, "reason": ""}  # fail-open (não bloqueia em erro)


def check_output(reply: str, user_msg: str = "") -> Dict[str, Any]:
    """Aplica o guardrail à resposta. Retorna:
    {action: allow|redact|block, text, reasons:[...]}"""
    cfg = _cfg()
    if not cfg.get("enabled") or not reply:
        return {"action": "allow", "text": reply, "reasons": []}

    reasons: List[str] = []
    text = reply
    mode = str(cfg.get("mode", "redact"))

    # 1) PII
    if cfg.get("redact_pii", True):
        r = redact_pii(text)
        if r["found"]:
            reasons += [f"PII: {', '.join(r['found'])}"]
            if mode == "block":
                return {"action": "block", "reasons": reasons,
                        "text": "Desculpe, não posso compartilhar esses dados."}
            text = r["text"]

    # 2) Segurança/escopo (opcional, custa 1 call)
    if cfg.get("llm_check"):
        s = _llm_safety(user_msg, text)
        if not s["safe"]:
            reasons.append(f"segurança: {s['reason']}")
            return {"action": "block", "reasons": reasons,
                    "text": "Desculpe, não consigo ajudar com isso."}

    if reasons:
        return {"action": "redact", "text": text, "reasons": reasons}
    return {"action": "allow", "text": text, "reasons": []}
