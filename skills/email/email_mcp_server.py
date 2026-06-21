#!/usr/bin/env python3
"""Servidor MCP de email (IMAP/SMTP) — sem dependências externas.

Funciona com Gmail via **Senha de App** (sem Google Cloud) ou qualquer
provedor IMAP/SMTP. Lê credenciais do ambiente:

    EMAIL_ADDRESS, EMAIL_PASSWORD          (obrigatórios)
    EMAIL_IMAP_HOST=imap.gmail.com         EMAIL_IMAP_PORT=993
    EMAIL_SMTP_HOST=smtp.gmail.com         EMAIL_SMTP_PORT=587

Registrar:
    mangaba mcp add email --command <venv-python> --args <.../email_mcp_server.py>
"""
from __future__ import annotations
import os
import json
import ssl
import smtplib
import imaplib
import email as _email
from email.header import decode_header, make_header
from email.message import EmailMessage

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("email")


def _cfg():
    addr = os.getenv("EMAIL_ADDRESS", "").strip()
    pwd = os.getenv("EMAIL_PASSWORD", "").strip()
    if not addr or not pwd:
        return None
    return {
        "addr": addr, "pwd": pwd,
        "imap_host": os.getenv("EMAIL_IMAP_HOST", "imap.gmail.com").strip(),
        "imap_port": int(os.getenv("EMAIL_IMAP_PORT", "993")),
        "smtp_host": os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com").strip(),
        "smtp_port": int(os.getenv("EMAIL_SMTP_PORT", "587")),
    }


def _err(msg):
    return json.dumps({"error": msg}, ensure_ascii=False)


def _dec(value):
    try:
        return str(make_header(decode_header(value or "")))
    except Exception:
        return value or ""


def _fetch(criteria: str, limit: int):
    c = _cfg()
    if not c:
        return _err("email não configurado: defina EMAIL_ADDRESS e EMAIL_PASSWORD "
                    "(use uma Senha de App do Gmail).")
    try:
        M = imaplib.IMAP4_SSL(c["imap_host"], c["imap_port"])
        M.login(c["addr"], c["pwd"])
        M.select("INBOX")
        typ, data = M.search(None, criteria)
        ids = data[0].split()[-limit:][::-1]
        out = []
        for i in ids:
            typ, msg_data = M.fetch(i, "(RFC822.HEADER)")
            msg = _email.message_from_bytes(msg_data[0][1])
            out.append({
                "id": i.decode(),
                "from": _dec(msg.get("From")),
                "subject": _dec(msg.get("Subject")),
                "date": msg.get("Date", ""),
            })
        M.logout()
        return json.dumps({"count": len(out), "emails": out}, ensure_ascii=False)
    except imaplib.IMAP4.error as e:
        return _err(f"login IMAP falhou (cheque a Senha de App): {e}")
    except Exception as e:
        return _err(str(e))


@mcp.tool()
def email_list_unread(limit: int = 10) -> str:
    """Lista os emails NÃO LIDOS da caixa de entrada (remetente, assunto, data)."""
    return _fetch("UNSEEN", limit)


@mcp.tool()
def email_search(query: str, limit: int = 10) -> str:
    """Busca emails pelo assunto/remetente. Ex: query='fatura' ou 'from:banco'."""
    crit = f'(FROM "{query[5:]}")' if query.lower().startswith("from:") else f'(SUBJECT "{query}")'
    return _fetch(crit, limit)


@mcp.tool()
def email_read(message_id: str) -> str:
    """Lê o corpo de um email pelo id (obtido em list/search)."""
    c = _cfg()
    if not c:
        return _err("email não configurado.")
    try:
        M = imaplib.IMAP4_SSL(c["imap_host"], c["imap_port"])
        M.login(c["addr"], c["pwd"])
        M.select("INBOX")
        typ, msg_data = M.fetch(message_id.encode(), "(RFC822)")
        msg = _email.message_from_bytes(msg_data[0][1])
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode(errors="replace")
                    break
        else:
            body = msg.get_payload(decode=True).decode(errors="replace")
        M.logout()
        return json.dumps({
            "from": _dec(msg.get("From")), "subject": _dec(msg.get("Subject")),
            "body": body[:4000],
        }, ensure_ascii=False)
    except Exception as e:
        return _err(str(e))


@mcp.tool()
def email_send(to: str, subject: str, body: str) -> str:
    """Envia um email."""
    c = _cfg()
    if not c:
        return _err("email não configurado.")
    try:
        m = EmailMessage()
        m["From"], m["To"], m["Subject"] = c["addr"], to, subject
        m.set_content(body)
        ctx = ssl.create_default_context()
        with smtplib.SMTP(c["smtp_host"], c["smtp_port"]) as s:
            s.starttls(context=ctx)
            s.login(c["addr"], c["pwd"])
            s.send_message(m)
        return json.dumps({"ok": True, "to": to}, ensure_ascii=False)
    except smtplib.SMTPAuthenticationError as e:
        return _err(f"login SMTP falhou (cheque a Senha de App): {e}")
    except Exception as e:
        return _err(str(e))


if __name__ == "__main__":
    mcp.run()
