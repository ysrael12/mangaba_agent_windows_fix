"""Static security scanner for a Mangaba install — ``mangaba security-scan``.

Inspired by ECC's AgentShield: instead of *managing* secrets (that's
``mangaba secrets``) or flagging compromised *packages* (that's
``security_advisories``), this scans the agent's OWN surface for
self-inflicted risk:

1. **Leaked secrets in git-tracked files** — the #1 footgun. If ``.env`` or
   any tracked file contains an API key / bot token, it's findable forever in
   git history. CRITICAL.
2. **``.env`` file permissions** — world/group readable secrets. HIGH.
3. **MCP servers** — plaintext ``http://`` URLs (token sent in clear) or
   command-based servers running arbitrary binaries. MEDIUM/HIGH.
4. **Gateway hooks / quick_commands** — shell strings with injection-prone
   substitution. MEDIUM.

Design: stdlib + rich only, so it runs even on a broken install. Exit code is
non-zero when any CRITICAL/HIGH finding exists, so it works as a git
pre-commit hook (``mangaba security-scan --staged --quiet``).
"""

from __future__ import annotations

import math
import os
import re
import stat
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from mangaba_cli.config import get_env_path, get_project_root, load_config

console = Console()


# ---------------------------------------------------------------------------
# Secret detection patterns
# ---------------------------------------------------------------------------
# (name, compiled regex, severity). Ordered most-specific first.
SECRET_PATTERNS = [
    ("Telegram bot token", re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b"), "CRITICAL"),
    ("OpenAI / Anthropic key", re.compile(r"\bsk-[A-Za-z0-9-]{20,}\b"), "CRITICAL"),
    ("OpenAI project key", re.compile(r"\bsk-proj-[A-Za-z0-9_-]{20,}\b"), "CRITICAL"),
    ("AWS access key id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), "CRITICAL"),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), "CRITICAL"),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), "CRITICAL"),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "CRITICAL"),
    ("Composio API key", re.compile(r"\bcomp_[A-Za-z0-9]{20,}\b"), "HIGH"),
    ("Private key block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"), "CRITICAL"),
    ("Generic bearer/secret assignment",
     re.compile(r"(?i)(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['\"](?P<val>[A-Za-z0-9_\-./+]{16,})['\"]"),
     "HIGH"),
]

# Env-var names that are legitimately secrets; ``KEY=`` empty is fine, only a
# value triggers a finding (handled by the value-presence check below).
SECRET_ENV_HINTS = re.compile(r"(?i)(TOKEN|SECRET|API_KEY|PASSWORD|PASSWD|ACCESS_KEY)")

# Placeholder values that are NOT real secrets.
PLACEHOLDER_RE = re.compile(
    r"(?i)^(your[_-]?|<|xxx|changeme|example|placeholder|dummy|test|sk-\.\.\.|\.\.\.|\$\{)",
)

# Substrings that mark a matched token as an obvious fixture/example, not a
# live credential (canonical AWS example key, "test/fake/dummy" tokens, repeated
# digit/letter runs, ellipses used to elide).
FAKE_TOKEN_RE = re.compile(
    r"(?i)(example|placeholder|dummy|sample|fake|redact|your[_-]?|xxxx|\.\.\.|"
    r"1234567|abcdef|0000|test[_-]?(token|key|secret)|no[_-]?key|required|"
    r"none|null|change[_-]?me|"
    r"(token|secret|key|value|here|route)$)",
)

# Path fragments whose hits are framework noise, not the user's secrets.
NOISE_PATH_RE = re.compile(
    r"(^|/)(tests?|fixtures?|__tests__|examples?)(/|$)|"
    r"(^|/)(test_|conftest|redact)|_test\.|\.example|\.sample",
)


def _is_fake_secret(token: str) -> bool:
    """True if a matched token is clearly an example/fixture, not live."""
    if _looks_placeholder(token):
        return True
    if FAKE_TOKEN_RE.search(token):
        return True
    # The captured secret body (after a `sk-`/`ghp_` style prefix) should look
    # high-entropy; fixtures like `sk-ant-test-token` are low-entropy words.
    body = re.sub(r"^(sk-proj-|sk-ant-|sk-|gh[pousr]_|AIza|xox[baprs]-|comp_|AKIA|ASIA)", "", token)
    if body and _shannon_entropy(body) < 3.0:
        return True
    return False

# File extensions worth scanning for inline secrets.
SCANNABLE_SUFFIXES = {
    ".py", ".js", ".ts", ".sh", ".yaml", ".yml", ".json", ".toml",
    ".env", ".md", ".txt", ".cfg", ".ini", "",
}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist",
             "build", ".direnv", "site-packages", ".egg-info"}


@dataclass
class Finding:
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW
    rule: str
    location: str
    detail: str
    remediation: str = ""


_SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
_SEV_COLOR = {"CRITICAL": "bold red", "HIGH": "red", "MEDIUM": "yellow", "LOW": "cyan"}


def _shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def _looks_placeholder(value: str) -> bool:
    v = value.strip().strip("'\"")
    return not v or PLACEHOLDER_RE.match(v) is not None


def _mask(value: str) -> str:
    v = value.strip().strip("'\"")
    if len(v) <= 8:
        return v[0] + "***" if v else ""
    return f"{v[:4]}…{v[-4:]} ({len(v)} chars)"


# ---------------------------------------------------------------------------
# 1. Git-tracked secrets
# ---------------------------------------------------------------------------
def _git_tracked_files(root: Path, staged_only: bool) -> Optional[List[Path]]:
    """Files git knows about. None if not a git repo."""
    try:
        if staged_only:
            out = subprocess.run(
                ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                cwd=root, capture_output=True, text=True, check=True,
            ).stdout
        else:
            out = subprocess.run(
                ["git", "ls-files"],
                cwd=root, capture_output=True, text=True, check=True,
            ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return [root / line for line in out.splitlines() if line.strip()]


def _scan_text_for_secrets(text: str, location: str, is_env: bool = False) -> List[Finding]:
    findings: List[Finding] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        if len(line) > 4000:
            continue
        for name, pat, sev in SECRET_PATTERNS:
            m = pat.search(line)
            if not m:
                continue
            hit = m.group(0)
            # For assignment-style rules, judge the value, not the whole match.
            value = m.groupdict().get("val") or hit
            if _is_fake_secret(value):
                continue
            findings.append(Finding(
                severity=sev, rule=f"secret:{name}",
                location=f"{location}:{lineno}",
                detail=f"{name} — {_mask(hit)}",
                remediation="Remova do arquivo, rode `git rm --cached`, "
                            "REVOGUE a credencial e mova para .env (gitignored).",
            ))
        # KEY=value entropy check — only in real .env files, and only for
        # bare literal values (no code-ish parens/spaces).
        key_part = line.split("=", 1)[0] if "=" in line else ""
        if (is_env and "=" in line and re.fullmatch(r"[A-Z][A-Z0-9_]{2,}", key_part.strip())
                and SECRET_ENV_HINTS.search(key_part)):
            val = line.split("=", 1)[1].strip()
            if (val and not _looks_placeholder(val) and not re.search(r"[()\s]", val)
                    and _shannon_entropy(val) > 3.5 and len(val) >= 16):
                findings.append(Finding(
                    severity="HIGH", rule="secret:high-entropy-env",
                    location=f"{location}:{lineno}",
                    detail=f"valor de alta entropia em chave sensível — {_mask(val)}",
                    remediation="Confirme que não é credencial real exposta.",
                ))
    return findings


def check_git_secrets(root: Path, staged_only: bool, include_noise: bool = False) -> List[Finding]:
    findings: List[Finding] = []
    tracked = _git_tracked_files(root, staged_only)
    if tracked is None:
        return findings

    tracked_names = {p.name for p in tracked}
    # .env tracked at all → CRITICAL regardless of content
    for p in tracked:
        rel = p.relative_to(root) if p.is_relative_to(root) else p
        if p.name == ".env" or p.name.startswith(".env."):
            if p.name.endswith(".example") or p.name.endswith(".sample"):
                continue
            findings.append(Finding(
                severity="CRITICAL", rule="git:env-tracked",
                location=str(rel),
                detail=".env está rastreado pelo git — segredos vão para o histórico.",
                remediation="`git rm --cached .env`, confirme que está no .gitignore, "
                            "e REVOGUE qualquer credencial já commitada.",
            ))

    for p in tracked:
        if not p.exists() or p.is_dir():
            continue
        if p.suffix not in SCANNABLE_SUFFIXES and p.name != ".env":
            continue
        if p.name.endswith((".example", ".sample", ".lock")):
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        rel_str = str(p.relative_to(root)) if p.is_relative_to(root) else str(p)
        if not include_noise and NOISE_PATH_RE.search(rel_str):
            continue
        try:
            if p.stat().st_size > 2_000_000:
                continue
            text = p.read_text(errors="ignore")
        except OSError:
            continue
        rel = p.relative_to(root) if p.is_relative_to(root) else p
        is_env = p.name == ".env" or p.name.startswith(".env")
        findings.extend(_scan_text_for_secrets(text, str(rel), is_env=is_env))
    return findings


# ---------------------------------------------------------------------------
# 2. .env permissions
# ---------------------------------------------------------------------------
def check_env_permissions() -> List[Finding]:
    findings: List[Finding] = []
    try:
        env_path = get_env_path()
    except Exception:
        return findings
    if not env_path or not env_path.exists():
        return findings
    mode = env_path.stat().st_mode
    if mode & (stat.S_IRGRP | stat.S_IROTH | stat.S_IWGRP | stat.S_IWOTH):
        findings.append(Finding(
            severity="HIGH", rule="perms:env-readable",
            location=str(env_path),
            detail=f".env legível/gravável por grupo/outros (modo {oct(mode & 0o777)}).",
            remediation=f"chmod 600 {env_path}",
        ))
    return findings


# ---------------------------------------------------------------------------
# 3. MCP servers
# ---------------------------------------------------------------------------
def check_mcp_servers(config: dict) -> List[Finding]:
    findings: List[Finding] = []
    servers = config.get("mcp_servers") or {}
    for name, cfg in servers.items():
        if not isinstance(cfg, dict):
            continue
        url = cfg.get("url") or ""
        if isinstance(url, str) and url.startswith("http://"):
            findings.append(Finding(
                severity="HIGH", rule="mcp:plaintext-url",
                location=f"mcp_servers.{name}",
                detail=f"servidor MCP via http:// (token em texto claro): {url}",
                remediation="Use https:// ou um servidor local (stdio).",
            ))
        command = cfg.get("command")
        if command and not url:
            findings.append(Finding(
                severity="LOW", rule="mcp:command-server",
                location=f"mcp_servers.{name}",
                detail=f"servidor MCP executa binário local: {command!r} — "
                       "confirme que confia na origem.",
                remediation="Só rode servidores MCP de fontes confiáveis.",
            ))
    return findings


# ---------------------------------------------------------------------------
# 4. Hooks / quick_commands shell injection
# ---------------------------------------------------------------------------
_DANGEROUS_SHELL = re.compile(r"(\beval\b|\$\(|`|\bcurl\b[^|]*\|\s*(?:sh|bash)\b|rm\s+-rf\s+[/~]\s|;\s*rm\b)")


def check_hooks(config: dict) -> List[Finding]:
    findings: List[Finding] = []

    def _scan_cmds(section_name: str, obj) -> None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                _scan_cmds(f"{section_name}.{k}", v)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                _scan_cmds(f"{section_name}[{i}]", v)
        elif isinstance(obj, str):
            if _DANGEROUS_SHELL.search(obj):
                findings.append(Finding(
                    severity="MEDIUM", rule="hook:dangerous-shell",
                    location=section_name,
                    detail=f"padrão de shell arriscado: {obj[:80]!r}",
                    remediation="Evite eval/pipe-to-shell/rm -rf em hooks e quick_commands.",
                ))

    for key in ("hooks", "quick_commands"):
        if key in config:
            _scan_cmds(key, config[key])
    return findings


# ---------------------------------------------------------------------------
# Orchestration + reporting
# ---------------------------------------------------------------------------
def run_scan(staged_only: bool = False, include_noise: bool = False) -> List[Finding]:
    root = get_project_root()
    try:
        config = load_config()
    except Exception:
        config = {}
    findings: List[Finding] = []
    findings.extend(check_git_secrets(root, staged_only, include_noise))
    findings.extend(check_env_permissions())
    findings.extend(check_mcp_servers(config))
    findings.extend(check_hooks(config))
    findings.sort(key=lambda f: _SEV_ORDER.get(f.severity, 9))
    return findings


def _print_report(findings: List[Finding]) -> None:
    if not findings:
        console.print(Panel.fit(
            "[bold green]✓ Nenhum problema de segurança encontrado.[/]",
            title="mangaba security-scan", border_style="green"))
        return

    counts = {}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    summary = "  ".join(
        f"[{_SEV_COLOR[s]}]{counts[s]} {s}[/]"
        for s in ("CRITICAL", "HIGH", "MEDIUM", "LOW") if s in counts
    )

    table = Table(show_header=True, header_style="bold", expand=True)
    table.add_column("Sev", style="bold", width=9)
    table.add_column("Regra", width=22)
    table.add_column("Local", overflow="fold")
    table.add_column("Detalhe", overflow="fold")
    for f in findings:
        table.add_row(
            f"[{_SEV_COLOR[f.severity]}]{f.severity}[/]",
            f.rule, f.location, f.detail)
    console.print(Panel(table, title=f"mangaba security-scan — {summary}",
                        border_style="red"))

    # remediation block (dedup)
    seen = set()
    console.print("\n[bold]Como corrigir:[/]")
    for f in findings:
        if not f.remediation or f.remediation in seen:
            continue
        seen.add(f.remediation)
        console.print(f"  [{_SEV_COLOR[f.severity]}]•[/] {f.remediation}")


_HOOK_SCRIPT = """#!/bin/sh
# Installed by `mangaba security-scan --install-hook`.
# Blocks commits that would leak secrets or commit risky config.
exec mangaba security-scan --staged --quiet
"""


def install_precommit_hook() -> None:
    """Write a .git/hooks/pre-commit that runs the staged scan."""
    root = get_project_root()
    hooks_dir = root / ".git" / "hooks"
    if not hooks_dir.parent.exists():
        console.print("[red]Não é um repositório git (sem .git/).[/]")
        raise SystemExit(1)
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hook = hooks_dir / "pre-commit"
    if hook.exists():
        existing = hook.read_text(errors="ignore")
        if "security-scan" not in existing:
            console.print(f"[yellow]Já existe um pre-commit em {hook}.[/]\n"
                          "Adicione manualmente a linha:\n"
                          "  mangaba security-scan --staged --quiet || exit 1")
            raise SystemExit(1)
        console.print("[green]✓ pre-commit já está instalado.[/]")
        return
    hook.write_text(_HOOK_SCRIPT)
    hook.chmod(0o755)
    console.print(f"[green]✓ Hook instalado em {hook}.[/]\n"
                  "Commits com segredos vazados serão bloqueados.")


def cmd_security_scan(args) -> None:
    """CLI entrypoint for ``mangaba security-scan``."""
    if getattr(args, "install_hook", False):
        install_precommit_hook()
        raise SystemExit(0)
    staged = getattr(args, "staged", False)
    quiet = getattr(args, "quiet", False)
    include_noise = getattr(args, "all", False)
    findings = run_scan(staged_only=staged, include_noise=include_noise)

    blocking = [f for f in findings if f.severity in ("CRITICAL", "HIGH")]
    if quiet:
        if blocking:
            console.print(f"[bold red]✗ security-scan: {len(blocking)} "
                          "problema(s) crítico(s)/alto(s) — commit bloqueado.[/]")
            for f in blocking:
                console.print(f"  [{_SEV_COLOR[f.severity]}]{f.severity}[/] "
                              f"{f.location} — {f.detail}")
    else:
        _print_report(findings)

    raise SystemExit(1 if blocking else 0)
