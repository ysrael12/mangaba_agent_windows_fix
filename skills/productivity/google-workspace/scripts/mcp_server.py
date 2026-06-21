#!/usr/bin/env python3
"""Servidor MCP local para o ecossistema Google (Gmail, Calendar, Drive, Sheets, Docs).

Reaproveita 100% da lógica de ``google_api.py`` (mesmo OAuth/token local) e a
expõe como ferramentas MCP. Privado: usa SEU token em ~/.mangaba/google_token.json,
sem terceiros.

Registrar no Mangaba (stdio):
    mangaba mcp add google --command python \
        --args /caminho/skills/productivity/google-workspace/scripts/mcp_server.py

Pré-requisito de auth (uma vez): rode setup.py (--client-secret, --auth-url,
--auth-code) ou deixe o agente conduzir pelo chat.
"""
from __future__ import annotations
import io
import json
import contextlib
from types import SimpleNamespace
from pathlib import Path
import sys

# google_api.py vive ao lado deste arquivo
sys.path.insert(0, str(Path(__file__).resolve().parent))
import google_api as g  # noqa: E402

from mcp.server.fastmcp import FastMCP  # noqa: E402

mcp = FastMCP("google-workspace")

# Todos os atributos que as funções de google_api podem ler — default None.
_ATTRS = [
    "add_labels", "attendees", "body", "calendar", "cc", "description", "doc_id",
    "domain", "email", "end", "event_id", "export_mime", "file_id", "from_header",
    "html", "location", "max", "message_id", "mime_type", "name", "notify",
    "output", "parent", "path", "permanent", "query", "range", "raw_query",
    "remove_labels", "role", "sheet_id", "sheet_name", "start", "subject",
    "summary", "text", "thread_id", "title", "to", "type", "values",
]


def _call(func, **kw):
    """Monta o namespace esperado, executa e captura o JSON impresso."""
    ns = SimpleNamespace(**{a: None for a in _ATTRS})
    for k, v in kw.items():
        setattr(ns, k, v)
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            func(ns)
    except SystemExit as e:  # alguns caminhos chamam sys.exit em erro
        return json.dumps({"error": f"falha: {e}"}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)
    out = buf.getvalue().strip()
    return out or json.dumps({"ok": True}, ensure_ascii=False)


# ---- Gmail ----
@mcp.tool()
def gmail_search(query: str, max: int = 10) -> str:
    """Busca emails no Gmail. query usa a sintaxe do Gmail (ex: 'is:unread from:x')."""
    return _call(g.gmail_search, query=query, max=max)

@mcp.tool()
def gmail_get(message_id: str) -> str:
    """Lê o conteúdo completo de um email pelo id."""
    return _call(g.gmail_get, message_id=message_id)

@mcp.tool()
def gmail_send(to: str, subject: str, body: str, cc: str = "", html: bool = False) -> str:
    """Envia um email."""
    return _call(g.gmail_send, to=to, subject=subject, body=body, cc=cc or None, html=html)

# ---- Calendar ----
@mcp.tool()
def calendar_list(max: int = 10, calendar: str = "primary") -> str:
    """Lista próximos eventos do Google Calendar."""
    return _call(g.calendar_list, max=max, calendar=calendar)

@mcp.tool()
def calendar_create(summary: str, start: str, end: str, description: str = "",
                    location: str = "", attendees: str = "", calendar: str = "primary") -> str:
    """Cria um evento. start/end no formato ISO (ex: 2026-06-22T14:00:00)."""
    return _call(g.calendar_create, summary=summary, start=start, end=end,
                 description=description, location=location, attendees=attendees,
                 calendar=calendar)

# ---- Drive ----
@mcp.tool()
def drive_search(query: str, max: int = 10) -> str:
    """Busca arquivos no Google Drive."""
    return _call(g.drive_search, query=query, max=max)

@mcp.tool()
def drive_download(file_id: str, output: str) -> str:
    """Baixa um arquivo do Drive para o caminho local 'output'."""
    return _call(g.drive_download, file_id=file_id, output=output)

# ---- Sheets ----
@mcp.tool()
def sheets_get(sheet_id: str, range: str, sheet_name: str = "") -> str:
    """Lê células de uma planilha. range ex: 'A1:C10'."""
    return _call(g.sheets_get, sheet_id=sheet_id, range=range, sheet_name=sheet_name or None)

@mcp.tool()
def sheets_append(sheet_id: str, range: str, values: list, sheet_name: str = "") -> str:
    """Adiciona linhas a uma planilha. values: lista de listas."""
    return _call(g.sheets_append, sheet_id=sheet_id, range=range, values=values,
                 sheet_name=sheet_name or None)

# ---- Docs ----
@mcp.tool()
def docs_get(doc_id: str) -> str:
    """Lê o texto de um Google Doc."""
    return _call(g.docs_get, doc_id=doc_id)

@mcp.tool()
def docs_create(title: str, text: str = "") -> str:
    """Cria um Google Doc."""
    return _call(g.docs_create, title=title, text=text)

# ---- Contacts ----
@mcp.tool()
def contacts_list(max: int = 50) -> str:
    """Lista contatos do Google."""
    return _call(g.contacts_list, max=max)


if __name__ == "__main__":
    mcp.run()
