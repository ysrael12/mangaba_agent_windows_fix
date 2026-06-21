#!/usr/bin/env python3
"""Conecta o Composio MCP ao Mangaba automaticamente.

Lê a API key do ambiente (COMPOSIO_API_KEY), cria/reaproveita um config MCP
para os toolkits pedidos (padrão: gmail), gera a URL do servidor MCP e a
registra no Mangaba como servidor 'google'. Imprime a URL no fim.

Uso (o agente roda isto via terminal; a key vem do .env):
    COMPOSIO_API_KEY=ak_... python scripts/composio_connect.py [gmail googlecalendar googledrive]

Pré-requisito: a conta Google já conectada no Composio (1 clique no site).
"""
from __future__ import annotations
import os
import sys
import json


def _url_from(obj):
    """Extrai a URL de respostas variadas do SDK (atributo ou dict)."""
    for attr in ("url", "mcp_url", "server_url", "instance_url"):
        v = getattr(obj, attr, None)
        if isinstance(v, str) and v.startswith("http"):
            return v
    if isinstance(obj, dict):
        for k in ("url", "mcp_url", "server_url"):
            if isinstance(obj.get(k), str):
                return obj[k]
    return None


def main():
    # Aceita a key inline: --key <KEY> (e a persiste no .env), ou via ambiente.
    argv = sys.argv[1:]
    key = os.getenv("COMPOSIO_API_KEY", "").strip()
    if "--key" in argv:
        i = argv.index("--key")
        try:
            key = argv[i + 1].strip()
            del argv[i:i + 2]
        except IndexError:
            print(json.dumps({"error": "use: --key <CHAVE>"}))
            return 1
        # persiste no .env para o runtime do MCP
        try:
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from mangaba_cli.config import save_env_value
            save_env_value("COMPOSIO_API_KEY", key)
        except Exception:
            pass
    if not key:
        print(json.dumps({"error": "Sem API key. Passe --key <CHAVE> ou defina COMPOSIO_API_KEY."}))
        return 1
    toolkits = [t.lower() for t in (argv or ["gmail"])]
    user_id = os.getenv("COMPOSIO_USER_ID", "mangaba-user").strip()

    try:
        from composio import Composio
    except Exception as e:
        print(json.dumps({"error": f"SDK composio ausente: {e}. uv pip install composio"}))
        return 1

    try:
        c = Composio(api_key=key)
    except Exception as e:
        print(json.dumps({"error": f"falha ao iniciar Composio: {e}"}))
        return 1

    # 1) reaproveita um config existente desses toolkits, senão cria
    cfg_id = None
    name = "mangaba-" + "-".join(toolkits)
    try:
        existing = c.mcp.list(toolkits=",".join(toolkits))
        items = getattr(existing, "items", None) or (existing if isinstance(existing, list) else [])
        for it in items:
            cfg_id = getattr(it, "id", None) or (it.get("id") if isinstance(it, dict) else None)
            if cfg_id:
                break
    except Exception:
        pass

    if not cfg_id:
        try:
            created = c.mcp.create(name=name, toolkits=toolkits)
            cfg_id = getattr(created, "id", None) or getattr(created, "mcp_config_id", None) \
                or (created.get("id") if isinstance(created, dict) else None)
        except Exception as e:
            print(json.dumps({"error": f"falha ao criar config MCP: {e}"}))
            return 1

    if not cfg_id:
        print(json.dumps({"error": "não obtive o id do config MCP."}))
        return 1

    # 2) gera a URL do servidor para o usuário
    try:
        inst = c.mcp.generate(user_id=user_id, mcp_config_id=cfg_id)
        url = _url_from(inst)
    except Exception as e:
        print(json.dumps({"error": f"falha ao gerar URL: {e}"}))
        return 1

    if not url:
        print(json.dumps({"error": "URL não retornada pelo Composio.", "config_id": cfg_id}))
        return 1

    # 3) registra no Mangaba
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from mangaba_cli.mcp_config import _save_mcp_server
        _save_mcp_server("google", {"url": url})
        registered = True
    except Exception as e:
        registered = False
        reg_err = str(e)

    out = {"ok": True, "url": url, "config_id": cfg_id, "registered": registered}
    if not registered:
        out["register_error"] = reg_err
        out["hint"] = f"registre manualmente: /mcp add google {url}"
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
