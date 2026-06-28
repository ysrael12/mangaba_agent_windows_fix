"""WhatsApp Cloud API (oficial, Meta) — validação, envio e parsing de webhook.

O motor só tinha o bridge Baileys (QR). Este módulo adiciona o caminho
**oficial**: recebe mensagens pelo webhook da Meta e responde via Graph API.
A integração com o agente fica no web_server (reusa o agente do chat).

Credenciais (env):
  WHATSAPP_CLOUD_TOKEN       — access token (permanente ou temporário)
  WHATSAPP_PHONE_NUMBER_ID   — id do número (Cloud API)
  WHATSAPP_VERIFY_TOKEN      — segredo de verificação do webhook (gerado)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

GRAPH_VERSION = "v21.0"
GRAPH = f"https://graph.facebook.com/{GRAPH_VERSION}"


def validate(token: str, phone_number_id: str) -> Dict[str, Any]:
    """Confere as credenciais consultando o número no Graph API."""
    import httpx

    token = (token or "").strip()
    pnid = (phone_number_id or "").strip()
    if not token or not pnid:
        return {"ok": False, "error": "Informe token e phone_number_id."}
    try:
        r = httpx.get(
            f"{GRAPH}/{pnid}",
            params={"fields": "verified_name,display_phone_number,quality_rating"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=12,
        )
        if r.status_code == 200:
            d = r.json()
            return {
                "ok": True,
                "name": d.get("verified_name", ""),
                "number": d.get("display_phone_number", ""),
                "quality": d.get("quality_rating", ""),
            }
        try:
            msg = r.json().get("error", {}).get("message", "")
        except Exception:
            msg = ""
        return {"ok": False, "error": msg or f"Credenciais inválidas (HTTP {r.status_code})."}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": f"Falha ao validar: {e}"}


def send_text(token: str, phone_number_id: str, to: str, body: str) -> Dict[str, Any]:
    """Envia uma mensagem de texto via Cloud API."""
    import httpx

    if not body:
        return {"ok": False, "error": "mensagem vazia"}
    # WhatsApp limita ~4096; corta com folga.
    body = body[:4000]
    try:
        r = httpx.post(
            f"{GRAPH}/{phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {"body": body},
            },
            timeout=20,
        )
        if r.status_code in (200, 201):
            return {"ok": True}
        return {"ok": False, "error": r.text[:200]}
    except Exception as e:  # noqa: BLE001
        logger.warning("WhatsApp send falhou: %s", e)
        return {"ok": False, "error": str(e)}


def parse_inbound(payload: Dict[str, Any]) -> List[Dict[str, str]]:
    """Extrai mensagens de texto de um payload de webhook da Meta.

    Retorna lista de {from, text, name}. Ignora status/eventos sem texto.
    """
    out: List[Dict[str, str]] = []
    try:
        for entry in payload.get("entry", []) or []:
            for change in entry.get("changes", []) or []:
                value = change.get("value", {}) or {}
                contacts = {c.get("wa_id"): (c.get("profile", {}) or {}).get("name", "")
                            for c in (value.get("contacts", []) or [])}
                for m in value.get("messages", []) or []:
                    if m.get("type") != "text":
                        continue
                    frm = m.get("from", "")
                    txt = (m.get("text", {}) or {}).get("body", "")
                    if frm and txt:
                        out.append({"from": frm, "text": txt, "name": contacts.get(frm, "")})
    except Exception as e:  # noqa: BLE001
        logger.debug("parse_inbound falhou: %s", e)
    return out
