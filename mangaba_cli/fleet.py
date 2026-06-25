"""Gerência de frota — ver e controlar N agentes (profiles) de um lugar só.

No Mangaba, cada **profile** é um agente independente (SOUL/modelo/skills/memória
próprios) e roda como **um gateway por profile** (1 processo, N canais). Rodar N
bots já é suportado; o que faltava era **gerenciar a frota** de um ponto: ver
quem está no ar, subir/derrubar/reiniciar, de um comando — e pelos canais.

Design: a camada de *status* é pura e testável (agrega `list_profiles()` +
PID por profile). As *ações* (start/stop/restart) delegam à máquina já provada
do gateway (``terminate_pid``, ``_gateway_run_args_for_profile``), best-effort.
"""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class FleetMember:
    name: str
    path: Path
    running: bool
    pid: Optional[int] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    skills: int = 0
    description: str = ""
    is_default: bool = False


def _pid_for(profile_path: Path) -> Optional[int]:
    try:
        from gateway.status import get_running_pid
        return get_running_pid(profile_path / "gateway.pid", cleanup_stale=False)
    except Exception:
        return None


def collect_fleet() -> List[FleetMember]:
    """Snapshot de todos os agentes (profiles) e o estado do gateway de cada um."""
    try:
        from mangaba_cli.profiles import list_profiles
    except Exception as exc:  # noqa: BLE001
        logger.debug("fleet: list_profiles indisponível: %s", exc)
        return []
    members: List[FleetMember] = []
    for p in list_profiles():
        pid = _pid_for(p.path) if p.gateway_running else None
        members.append(FleetMember(
            name=p.name, path=p.path,
            running=bool(p.gateway_running), pid=pid,
            model=p.model, provider=p.provider,
            skills=getattr(p, "skill_count", 0) or 0,
            description=getattr(p, "description", "") or "",
            is_default=getattr(p, "is_default", False),
        ))
    members.sort(key=lambda m: (not m.running, m.name))  # no ar primeiro
    return members


def find_member(name: str) -> Optional[FleetMember]:
    name = (name or "").strip()
    for m in collect_fleet():
        if m.name == name:
            return m
    return None


def render_fleet(members: List[FleetMember], *, markdown: bool = False) -> str:
    """Texto amigável da frota (serve CLI e canal)."""
    if not members:
        return "Nenhum agente (profile) encontrado."
    up = sum(1 for m in members if m.running)
    head = f"🛰️ Frota: {len(members)} agente(s) · {up} no ar · {len(members) - up} parado(s)"
    lines = [f"*{head}*" if markdown else head, ""]
    for m in members:
        dot = "🟢" if m.running else "⚪"
        model = m.model or "?"
        pid = f" · pid {m.pid}" if m.pid else ""
        name = f"`{m.name}`" if markdown else m.name
        lines.append(f"{dot} {name} — {model}{pid}")
        if m.description:
            lines.append(f"    ↳ {m.description[:80]}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Ações (delegam à máquina existente do gateway). Retornam (ok, mensagem).
# ---------------------------------------------------------------------------
def stop_profile(name: str) -> Tuple[bool, str]:
    m = find_member(name)
    if m is None:
        return False, f"Agente `{name}` não encontrado."
    if not m.running or not m.pid:
        return True, f"Agente `{name}` já estava parado."
    try:
        from gateway.status import terminate_pid
        terminate_pid(m.pid)
        return True, f"🛑 Agente `{name}` (pid {m.pid}) parado."
    except Exception as exc:  # noqa: BLE001
        return False, f"Falha ao parar `{name}`: {exc}"


def start_profile(name: str) -> Tuple[bool, str]:
    m = find_member(name)
    if m is None:
        return False, f"Agente `{name}` não encontrado."
    if m.running:
        return True, f"Agente `{name}` já está no ar (pid {m.pid})."
    try:
        from mangaba_cli.gateway import _gateway_run_args_for_profile
        from mangaba_cli._subprocess_compat import windows_detach_popen_kwargs
        args = _gateway_run_args_for_profile(name)
        kwargs = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
        kwargs.update(windows_detach_popen_kwargs())
        subprocess.Popen(args, **kwargs)  # noqa: S603 — args são internos, sem shell
        return True, f"🚀 Subindo o agente `{name}`… (gateway iniciando)"
    except Exception as exc:  # noqa: BLE001
        return False, f"Falha ao subir `{name}`: {exc}"


def restart_profile(name: str) -> Tuple[bool, str]:
    m = find_member(name)
    if m is None:
        return False, f"Agente `{name}` não encontrado."
    stop_ok, _ = stop_profile(name)
    start_ok, start_msg = start_profile(name)
    if start_ok:
        return True, f"🔄 Agente `{name}` reiniciado."
    return False, start_msg
