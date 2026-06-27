"""Isolamento por cliente em processo dedicado (Fase 3 — white-label real).

Cada cliente isolado ganha um **profile próprio** (``$HOME/.mangaba/profiles/
<client_id>``) com config, ``.env`` (credenciais), memória, índice RAG e
persona (SOUL.md) **100% separados**, rodando como um **gateway dedicado** que
expõe apenas o ``api_server`` numa **porta própria**.

O roteador (api_server principal, porta 8642) faz proxy das requisições do
cliente para a porta do backend dele — ver ``api_server._handle_chat_completions``.

Fluxo:
  provision(client)  → cria/configura o profile + aloca porta
  start(client)      → sobe o gateway dedicado (só api_server)
  status(client)     → pid + saúde da porta
  stop(client)       → derruba o gateway dedicado
  teardown(client)   → stop + remove o profile do disco
"""

from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

_PORT_BASE = 8700
_PORT_MAX = 8900

# Serializa provisionamento para evitar dois clientes pegando a mesma porta
# (TOCTOU entre _free_port e a gravação do api_port).
_PROVISION_LOCK = threading.Lock()


def _profile_name(client: Dict[str, Any]) -> str:
    return str(client["id"])  # ex.: cli_3a8a... (nome de profile válido)


def _profile_dir(client: Dict[str, Any]) -> Path:
    from mangaba_cli.profiles import get_profile_dir

    return get_profile_dir(_profile_name(client))


def _free_port() -> int:
    """Acha uma porta livre na faixa dedicada."""
    used = _ports_in_use()
    for port in range(_PORT_BASE, _PORT_MAX):
        if port in used:
            continue
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Sem portas livres na faixa dedicada (8700-8900).")


def _ports_in_use() -> set:
    from mangaba_cli import api_clients

    return {int(c.get("api_port") or 0) for c in api_clients.list_clients() if c.get("api_port")}


def _set_env_lines(env_path: Path, updates: Dict[str, str], remove_keys: set) -> None:
    """Reescreve um .env aplicando updates e removendo chaves indesejadas."""
    lines = []
    seen = set()
    if env_path.exists():
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                lines.append(raw)
                continue
            key = stripped.split("=", 1)[0].strip()
            if key in remove_keys:
                continue
            if key in updates:
                lines.append(f"{key}={updates[key]}")
                seen.add(key)
            else:
                lines.append(raw)
    for k, v in updates.items():
        if k not in seen:
            lines.append(f"{k}={v}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def provision(client: Dict[str, Any]) -> Dict[str, Any]:
    """Cria/configura o profile dedicado do cliente. Retorna {profile, api_port}."""
    from mangaba_cli import api_clients
    from mangaba_cli.profiles import create_profile, get_profile_dir
    from mangaba_agent.mangaba_constants import get_mangaba_home

    name = _profile_name(client)
    pdir = get_profile_dir(name)

    if not pdir.exists():
        # Clona config/.env/SOUL/skills do profile ativo → herda credenciais,
        # modelo e configuração de RAG.
        create_profile(name, clone_config=True, no_alias=True)

    # Porta dedicada (reusa se já houver). Aloca + persiste sob trava para que
    # dois clientes concorrentes não recebam a mesma porta.
    with _PROVISION_LOCK:
        port = int(client.get("api_port") or 0) or _free_port()
        api_clients.update_client(client["id"], profile=name, api_port=port)

    # .env: liga só o api_server nesta porta; remove tokens de outros canais
    # para o gateway dedicado não tentar conectar Telegram/Discord.
    _set_env_lines(
        pdir / ".env",
        updates={
            "API_SERVER_ENABLED": "true",
            "API_SERVER_HOST": "127.0.0.1",
            "API_SERVER_PORT": str(port),
        },
        remove_keys={
            "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
            "DISCORD_BOT_TOKEN", "DISCORD_ALLOWED_USERS", "DISCORD_IGNORE_NO_MENTION",
            "SLACK_BOT_TOKEN", "SLACK_APP_TOKEN",
        },
    )

    # config.yaml: modelo próprio + RAG conforme o cliente.
    _apply_profile_config(pdir, client)

    # Persona dedicada → SOUL.md (entra no system prompt do profile).
    persona = (client.get("persona") or "").strip()
    if persona:
        (pdir / "SOUL.md").write_text(persona + "\n", encoding="utf-8")

    # Copia o índice RAG do profile ativo para o profile do cliente.
    if client.get("rag_enabled", True):
        src_rag = get_mangaba_home() / "rag"
        dst_rag = pdir / "rag"
        if src_rag.is_dir() and not dst_rag.exists():
            try:
                shutil.copytree(src_rag, dst_rag)
            except Exception:
                pass

    return {"profile": name, "api_port": port}


def _apply_profile_config(pdir: Path, client: Dict[str, Any]) -> None:
    import yaml

    cfg_path = pdir / "config.yaml"
    try:
        cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
    except Exception:
        cfg = {}
    cfg = cfg or {}
    if client.get("model"):
        m = cfg.setdefault("model", {})
        m["default"] = client["model"]
        m["name"] = client["model"]
    mem = cfg.setdefault("memory", {})
    mem["provider"] = "mangaba_rag" if client.get("rag_enabled", True) else ""
    cfg_path.write_text(yaml.safe_dump(cfg, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _mangaba_bin() -> str:
    return shutil.which("mangaba") or "mangaba"


def _pid_path(client: Dict[str, Any]) -> Path:
    return _profile_dir(client) / "gateway.pid"


def _read_pid(client: Dict[str, Any]) -> Optional[int]:
    p = _pid_path(client)
    try:
        if not p.exists():
            return None
        raw = p.read_text().strip()
        if not raw:
            return None
        if raw.startswith("{"):  # formato JSON {"pid": N, ...}
            import json as _json

            return int(_json.loads(raw).get("pid"))
        return int(raw)
    except Exception:
        return None


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def _port_healthy(port: int, timeout: float = 1.5) -> bool:
    import urllib.request

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def start(client: Dict[str, Any], wait: float = 35.0) -> Dict[str, Any]:
    """Sobe o gateway dedicado do cliente (só api_server). Idempotente."""
    pdir = _profile_dir(client)
    if not pdir.exists():
        provision(client)
        from mangaba_cli import api_clients
        client = api_clients.get_client(client["id"]) or client

    port = int(client.get("api_port") or 0)
    if not port:
        port = provision(client)["api_port"]

    if _port_healthy(port):
        return {"running": True, "api_port": port, "already": True}

    env = dict(os.environ)
    env["MANGABA_HOME"] = str(pdir)
    # Crítico p/ exposição pública: o backend dedicado deve ler SEMPRE do .env
    # do seu profile (host=127.0.0.1, porta dedicada, sem API_SERVER_KEY). Se
    # herdasse API_SERVER_HOST=0.0.0.0 / API_SERVER_KEY do processo principal,
    # ficaria exposto e exigiria auth, quebrando o proxy interno.
    for _k in ("API_SERVER_HOST", "API_SERVER_PORT", "API_SERVER_KEY",
               "API_SERVER_ENABLED", "API_SERVER_CORS_ORIGINS", "API_SERVER_MODEL_NAME"):
        env.pop(_k, None)

    logf = open(pdir / "logs" / "gateway.out.log", "ab", buffering=0)
    (pdir / "logs").mkdir(parents=True, exist_ok=True)
    subprocess.Popen(
        [_mangaba_bin(), "gateway", "run"],
        env=env,
        stdout=logf,
        stderr=logf,
        start_new_session=True,
        cwd=str(pdir),
    )

    deadline = time.time() + wait
    while time.time() < deadline:
        if _port_healthy(port):
            return {"running": True, "api_port": port}
        time.sleep(1.0)
    return {"running": False, "api_port": port, "error": "timeout ao subir o gateway dedicado"}


def stop(client: Dict[str, Any]) -> Dict[str, Any]:
    """Derruba o gateway dedicado do cliente."""
    pid = _read_pid(client)
    if pid and _pid_alive(pid):
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass
        for _ in range(10):
            if not _pid_alive(pid):
                break
            time.sleep(0.5)
        if _pid_alive(pid):
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass
    # Fallback: mata quem ainda escuta na porta dedicada.
    port = int(client.get("api_port") or 0)
    if port and _port_healthy(port, timeout=0.8):
        try:
            out = subprocess.run(
                ["lsof", "-ti", f"tcp:{port}"], capture_output=True, text=True, timeout=5
            ).stdout.split()
            for spid in out:
                try:
                    os.kill(int(spid), signal.SIGTERM)
                except Exception:
                    pass
        except Exception:
            pass
    return {"running": False}


def status(client: Dict[str, Any]) -> Dict[str, Any]:
    port = int(client.get("api_port") or 0)
    pid = _read_pid(client)
    return {
        "profile": client.get("profile") or "",
        "api_port": port,
        "pid": pid if (pid and _pid_alive(pid)) else None,
        "healthy": bool(port and _port_healthy(port)),
        "provisioned": _profile_dir(client).exists(),
        "autostart": bool(client.get("autostart")),
    }


def reconcile() -> Dict[str, Any]:
    """Sobe os agentes dedicados de todos os clientes marcados com autostart.

    Chamado no boot/start do dashboard para que os backends isolados voltem
    sozinhos após um reinício da máquina. Inicia em threads (cada start bloqueia
    enquanto o gateway sobe).
    """
    import threading

    from mangaba_cli import api_clients

    targets = [
        c for c in api_clients.list_clients()
        if c.get("autostart") and c.get("status") == "active" and c.get("profile")
    ]
    results: Dict[str, str] = {}
    threads = []

    def _boot(c: Dict[str, Any]) -> None:
        try:
            r = start(c)
            results[c["id"]] = "up" if r.get("running") else f"falha: {r.get('error')}"
        except Exception as e:  # pragma: no cover
            results[c["id"]] = f"erro: {e}"

    for c in targets:
        if _port_healthy(int(c.get("api_port") or 0)):
            results[c["id"]] = "já no ar"
            continue
        t = threading.Thread(target=_boot, args=(c,), daemon=True)
        t.start()
        threads.append(t)
    for t in threads:
        t.join(timeout=60)
    return {"started": results, "count": len(targets)}


def teardown(client: Dict[str, Any], *, delete_files: bool = True) -> None:
    stop(client)
    if delete_files:
        try:
            shutil.rmtree(_profile_dir(client), ignore_errors=True)
        except Exception:
            pass
