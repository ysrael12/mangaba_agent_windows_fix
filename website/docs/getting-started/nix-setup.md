---
sidebar_position: 3
title: "Nix & NixOS Setup"
description: "Install and deploy Mangaba Agent with Nix — from quick `nix run` to fully declarative NixOS module with container mode"
---

# Nix & NixOS Setup

Mangaba Agent ships a Nix flake with three levels of integration:

| Level | Who it's for | What you get |
|-------|-------------|--------------|
| **`nix run` / `nix profile install`** | Any Nix user (macOS, Linux) | Pre-built binary with all deps — then use the standard CLI workflow |
| **NixOS module (native)** | NixOS server deployments | Declarative config, hardened systemd service, managed secrets |
| **NixOS module (container)** | Agents that need self-modification | Everything above, plus a persistent Ubuntu container where the agent can `apt`/`pip`/`npm install` |

:::info What's different from the standard install
The `curl | bash` installer manages Python, Node, and dependencies itself. The Nix flake replaces all of that — every Python dependency is a Nix derivation built by [uv2nix](https://github.com/pyproject-nix/uv2nix), and runtime tools (Node.js, git, ripgrep, ffmpeg) are wrapped into the binary's PATH. There is no runtime pip, no venv activation, no `npm install`.

**For non-NixOS users**, this only changes the install step. Everything after (`mangaba setup`, `mangaba gateway install`, config editing) works identically to the standard install.

**For NixOS module users**, the entire lifecycle is different: configuration lives in `configuration.nix`, secrets go through sops-nix/agenix, the service is a systemd unit, and CLI config commands are blocked. You manage mangaba the same way you manage any other NixOS service.
:::

## Prerequisites

- **Nix with flakes enabled** — [Determinate Nix](https://install.determinate.systems) recommended (enables flakes by default)
- **API keys** for the services you want to use (at minimum: an OpenRouter or Anthropic key)

---

## Quick Start (Any Nix User)

No clone needed. Nix fetches, builds, and runs everything:

```bash
# Run directly (builds on first use, cached after)
nix run github:dheiver2/mangaba-agent -- setup
nix run github:dheiver2/mangaba-agent -- chat

# Or install persistently
nix profile install github:dheiver2/mangaba-agent
mangaba setup
mangaba chat
```

After `nix profile install`, `mangaba`, `mangaba-agent`, and `mangaba-acp` are on your PATH. From here, the workflow is identical to the [standard installation](./installation.md) — `mangaba setup` walks you through provider selection, `mangaba gateway install` sets up a launchd (macOS) or systemd user service, and config lives in `~/.mangaba/`.

<details>
<summary><strong>Building from a local clone</strong></summary>

```bash
git clone https://github.com/dheiver2/mangaba-agent.git
cd mangaba-agent
nix build
./result/bin/mangaba setup
```

</details>

---

## NixOS Module

The flake exports `nixosModules.default` — a full NixOS service module that declaratively manages user creation, directories, config generation, secrets, documents, and service lifecycle.

:::note
This module requires NixOS. For non-NixOS systems (macOS, other Linux distros), use `nix profile install` and the standard CLI workflow above.
:::

### Add the Flake Input

```nix
# /etc/nixos/flake.nix (or your system flake)
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    mangaba-agent.url = "github:dheiver2/mangaba-agent";
  };

  outputs = { nixpkgs, mangaba-agent, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        mangaba-agent.nixosModules.default
        ./configuration.nix
      ];
    };
  };
}
```

### Minimal Configuration

```nix
# configuration.nix
{ config, ... }: {
  services.mangaba-agent = {
    enable = true;
    settings.model.default = "anthropic/claude-sonnet-4";
    environmentFiles = [ config.sops.secrets."mangaba-env".path ];
    addToSystemPackages = true;
  };
}
```

That's it. `nixos-rebuild switch` creates the `mangaba` user, generates `config.yaml`, wires up secrets, and starts the gateway — a long-running service that connects the agent to messaging platforms (Telegram, Discord, etc.) and listens for incoming messages.

:::warning Secrets are required
The `environmentFiles` line above assumes you have [sops-nix](https://github.com/Mic92/sops-nix) or [agenix](https://github.com/ryantm/agenix) configured. The file should contain at least one LLM provider key (e.g., `OPENROUTER_API_KEY=sk-or-...`). See [Secrets Management](#secrets-management) for full setup. If you don't have a secrets manager yet, you can use a plain file as a starting point — just ensure it's not world-readable:

```bash
echo "OPENROUTER_API_KEY=sk-or-your-key" | sudo install -m 0600 -o mangaba /dev/stdin /var/lib/mangaba/env
```

```nix
services.mangaba-agent.environmentFiles = [ "/var/lib/mangaba/env" ];
```
:::

:::tip addToSystemPackages
Setting `addToSystemPackages = true` does two things: puts the `mangaba` CLI on your system PATH **and** sets `MANGABA_HOME` system-wide so the interactive CLI shares state (sessions, skills, cron) with the gateway service. Without it, running `mangaba` in your shell creates a separate `~/.mangaba/` directory.
:::

### Container-aware CLI

:::info
When `container.enable = true` and `addToSystemPackages = true`, **every** `mangaba` command on the host automatically routes into the managed container. This means your interactive CLI session runs inside the same environment as the gateway service — with access to all container-installed packages and tools.

- The routing is transparent: `mangaba chat`, `mangaba sessions list`, `mangaba version`, etc. all exec into the container under the hood
- All CLI flags are forwarded as-is
- If the container isn't running, the CLI retries briefly (5s with a spinner for interactive use, 10s silently for scripts) then fails with a clear error — no silent fallback
- For developers working on the mangaba codebase, set `MANGABA_DEV=1` to bypass container routing and run the local checkout directly

Set `container.hostUsers` to create a `~/.mangaba` symlink to the service state directory, so the host CLI and the container share sessions, config, and memories:

```nix
services.mangaba-agent = {
  container.enable = true;
  container.hostUsers = [ "your-username" ];
  addToSystemPackages = true;
};
```

Users listed in `hostUsers` are automatically added to the `mangaba` group for file permission access.

**Podman users:** The NixOS service runs the container as root. Docker users get access via the `docker` group socket, but Podman's rootful containers require sudo. Grant passwordless sudo for your container runtime:

```nix
security.sudo.extraRules = [{
  users = [ "your-username" ];
  commands = [{
    command = "/run/current-system/sw/bin/podman";
    options = [ "NOPASSWD" ];
  }];
}];
```

The CLI auto-detects when sudo is needed and uses it transparently. Without this, you'll need to run `sudo mangaba chat` manually.
:::

### Verify It Works

After `nixos-rebuild switch`, check that the service is running:

```bash
# Check service status
systemctl status mangaba-agent

# Watch logs (Ctrl+C to stop)
journalctl -u mangaba-agent -f

# If addToSystemPackages is true, test the CLI
mangaba version
mangaba config       # shows the generated config
```

### Choosing a Deployment Mode

The module supports two modes, controlled by `container.enable`:

| | **Native** (default) | **Container** |
|---|---|---|
| How it runs | Hardened systemd service on the host | Persistent Ubuntu container with `/nix/store` bind-mounted |
| Security | `NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp` | Container isolation, runs as unprivileged user inside |
| Agent can self-install packages | No — only tools on the Nix-provided PATH | Yes — `apt`, `pip`, `npm` installs persist across restarts |
| Config surface | Same | Same |
| When to choose | Standard deployments, maximum security, reproducibility | Agent needs runtime package installation, mutable environment, experimental tools |

To enable container mode, add one line:

```nix
{
  services.mangaba-agent = {
    enable = true;
    container.enable = true;
    # ... rest of config is identical
  };
}
```

:::info
Container mode auto-enables `virtualisation.docker.enable` via `mkDefault`. If you use Podman instead, set `container.backend = "podman"` and `virtualisation.docker.enable = false`.
:::

---

## Configuration

### Declarative Settings

The `settings` option accepts an arbitrary attrset that is rendered as `config.yaml`. It supports deep merging across multiple module definitions (via `lib.recursiveUpdate`), so you can split config across files:

```nix
# base.nix
services.mangaba-agent.settings = {
  model.default = "anthropic/claude-sonnet-4";
  toolsets = [ "all" ];
  terminal = { backend = "local"; timeout = 180; };
};

# personality.nix
services.mangaba-agent.settings = {
  display = { compact = false; personality = "kawaii"; };
  memory = { memory_enabled = true; user_profile_enabled = true; };
};
```

Both are deep-merged at evaluation time. Nix-declared keys always win over keys in an existing `config.yaml` on disk, but **user-added keys that Nix doesn't touch are preserved**. This means if the agent or a manual edit adds keys like `skills.disabled` or `streaming.enabled`, they survive `nixos-rebuild switch`.

:::note Model naming
`settings.model.default` uses the model identifier your provider expects. With [OpenRouter](https://openrouter.ai) (the default), these look like `"anthropic/claude-sonnet-4"` or `"google/gemini-3-flash"`. If you're using a provider directly (Anthropic, OpenAI), set `settings.model.base_url` to point at their API and use their native model IDs (e.g., `"claude-sonnet-4-20250514"`). When no `base_url` is set, Mangaba defaults to OpenRouter.
:::

:::tip Discovering available config keys
Run `nix build .#configKeys && cat result` to see every leaf config key extracted from Python's `DEFAULT_CONFIG`. You can paste your existing `config.yaml` into the `settings` attrset — the structure maps 1:1.
:::

<details>
<summary><strong>Full example: all commonly customized settings</strong></summary>

```nix
{ config, ... }: {
  services.mangaba-agent = {
    enable = true;
    container.enable = true;

    # ── Model ──────────────────────────────────────────────────────────
    settings = {
      model = {
        base_url = "https://openrouter.ai/api/v1";
        default = "anthropic/claude-opus-4.6";
      };
      toolsets = [ "all" ];
      max_turns = 100;
      terminal = { backend = "local"; cwd = "."; timeout = 180; };
      compression = {
        enabled = true;
        threshold = 0.85;
        summary_model = "google/gemini-3-flash-preview";
      };
      memory = { memory_enabled = true; user_profile_enabled = true; };
      display = { compact = false; personality = "kawaii"; };
      agent = { max_turns = 60; verbose = false; };
    };

    # ── Secrets ────────────────────────────────────────────────────────
    environmentFiles = [ config.sops.secrets."mangaba-env".path ];

    # ── Documents ──────────────────────────────────────────────────────
    documents = {
      "USER.md" = ./documents/USER.md;
    };

    # ── MCP Servers ────────────────────────────────────────────────────
    mcpServers.filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };

    # ── Container options ──────────────────────────────────────────────
    container = {
      image = "ubuntu:24.04";
      backend = "docker";
      hostUsers = [ "your-username" ];
      extraVolumes = [ "/home/user/projects:/projects:rw" ];
      extraOptions = [ "--gpus" "all" ];
    };

    # ── Service tuning ─────────────────────────────────────────────────
    addToSystemPackages = true;
    extraArgs = [ "--verbose" ];
    restart = "always";
    restartSec = 5;
  };
}
```

</details>

### Escape Hatch: Bring Your Own Config

If you'd rather manage `config.yaml` entirely outside Nix, use `configFile`:

```nix
services.mangaba-agent.configFile = /etc/mangaba/config.yaml;
```

This bypasses `settings` entirely — no merge, no generation. The file is copied as-is to `$MANGABA_HOME/config.yaml` on each activation.

### Customization Cheatsheet

Quick reference for the most common things Nix users want to customize:

| I want to... | Option | Example |
|---|---|---|
| Change the LLM model | `settings.model.default` | `"anthropic/claude-sonnet-4"` |
| Use a different provider endpoint | `settings.model.base_url` | `"https://openrouter.ai/api/v1"` |
| Add API keys | `environmentFiles` | `[ config.sops.secrets."mangaba-env".path ]` |
| Give the agent a personality | `${services.mangaba-agent.stateDir}/.mangaba/SOUL.md` | manage the file directly |
| Add MCP tool servers | `mcpServers.<name>` | See [MCP Servers](#mcp-servers) |
| Mount host directories into container | `container.extraVolumes` | `[ "/data:/data:rw" ]` |
| Pass GPU access to container | `container.extraOptions` | `[ "--gpus" "all" ]` |
| Use Podman instead of Docker | `container.backend` | `"podman"` |
| Share state between host CLI and container | `container.hostUsers` | `[ "sidbin" ]` |
| Make extra tools available to the agent | `extraPackages` | `[ pkgs.pandoc pkgs.imagemagick ]` |
| Use a custom base image | `container.image` | `"ubuntu:24.04"` |
| Override the mangaba package | `package` | `inputs.mangaba-agent.packages.${system}.default.override { ... }` |
| Change state directory | `stateDir` | `"/opt/mangaba"` |
| Set the agent's working directory | `workingDirectory` | `"/home/user/projects"` |

---

## Secrets Management

:::danger Never put API keys in `settings` or `environment`
Values in Nix expressions end up in `/nix/store`, which is world-readable. Always use `environmentFiles` with a secrets manager.
:::

Both `environment` (non-secret vars) and `environmentFiles` (secret files) are merged into `$MANGABA_HOME/.env` at activation time (`nixos-rebuild switch`). Mangaba reads this file on every startup, so changes take effect with a `systemctl restart mangaba-agent` — no container recreation needed.

### sops-nix

```nix
{
  sops = {
    defaultSopsFile = ./secrets/mangaba.yaml;
    age.keyFile = "/home/user/.config/sops/age/keys.txt";
    secrets."mangaba-env" = { format = "yaml"; };
  };

  services.mangaba-agent.environmentFiles = [
    config.sops.secrets."mangaba-env".path
  ];
}
```

The secrets file contains key-value pairs:

```yaml
# secrets/mangaba.yaml (encrypted with sops)
mangaba-env: |
    OPENROUTER_API_KEY=sk-or-...
    TELEGRAM_BOT_TOKEN=123456:ABC...
    ANTHROPIC_API_KEY=sk-ant-...
```

### agenix

```nix
{
  age.secrets.mangaba-env.file = ./secrets/mangaba-env.age;

  services.mangaba-agent.environmentFiles = [
    config.age.secrets.mangaba-env.path
  ];
}
```

### OAuth / Auth Seeding

For platforms requiring OAuth (e.g., Discord), use `authFile` to seed credentials on first deploy:

```nix
{
  services.mangaba-agent = {
    authFile = config.sops.secrets."mangaba/auth.json".path;
    # authFileForceOverwrite = true;  # overwrite on every activation
  };
}
```

The file is only copied if `auth.json` doesn't already exist (unless `authFileForceOverwrite = true`). Runtime OAuth token refreshes are written to the state directory and preserved across rebuilds.

---

## Documents

The `documents` option installs files into the agent's working directory (the `workingDirectory`, which the agent reads as its workspace). Mangaba looks for specific filenames by convention:

- **`USER.md`** — context about the user the agent is interacting with.
- Any other files you place here are visible to the agent as workspace files.

The agent identity file is separate: Mangaba loads its primary `SOUL.md` from `$MANGABA_HOME/SOUL.md`, which in the NixOS module is `${services.mangaba-agent.stateDir}/.mangaba/SOUL.md`. Putting `SOUL.md` in `documents` only creates a workspace file and will not replace the main persona file.

```nix
{
  services.mangaba-agent.documents = {
    "USER.md" = ./documents/USER.md;  # path reference, copied from Nix store
  };
}
```

Values can be inline strings or path references. Files are installed on every `nixos-rebuild switch`.

---

## MCP Servers

The `mcpServers` option declaratively configures [MCP (Model Context Protocol)](https://modelcontextprotocol.io) servers. Each server uses either **stdio** (local command) or **HTTP** (remote URL) transport.

### Stdio Transport (Local Servers)

```nix
{
  services.mangaba-agent.mcpServers = {
    filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };
    github = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-github" ];
      env.GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}"; # resolved from .env
    };
  };
}
```

:::tip
Environment variables in `env` values are resolved from `$MANGABA_HOME/.env` at runtime. Use `environmentFiles` to inject secrets — never put tokens directly in Nix config.
:::

### HTTP Transport (Remote Servers)

```nix
{
  services.mangaba-agent.mcpServers.remote-api = {
    url = "https://mcp.example.com/v1/mcp";
    headers.Authorization = "Bearer \${MCP_REMOTE_API_KEY}";
    timeout = 180;
  };
}
```

### HTTP Transport with OAuth

Set `auth = "oauth"` for servers using OAuth 2.1. Mangaba implements the full PKCE flow — metadata discovery, dynamic client registration, token exchange, and automatic refresh.

```nix
{
  services.mangaba-agent.mcpServers.my-oauth-server = {
    url = "https://mcp.example.com/mcp";
    auth = "oauth";
  };
}
```

Tokens are stored in `$MANGABA_HOME/mcp-tokens/<server-name>.json` and persist across restarts and rebuilds.

<details>
<summary><strong>Initial OAuth authorization on headless servers</strong></summary>

The first OAuth authorization requires a browser-based consent flow. In a headless deployment, Mangaba prints the authorization URL to stdout/logs instead of opening a browser.

**Option A: Interactive bootstrap** — run the flow once via `docker exec` (container) or `sudo -u mangaba` (native):

```bash
# Container mode
docker exec -it mangaba-agent \
  mangaba mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth

# Native mode
sudo -u mangaba MANGABA_HOME=/var/lib/mangaba/.mangaba \
  mangaba mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
```

The container uses `--network=host`, so the OAuth callback listener on `127.0.0.1` is reachable from the host browser.

**Option B: Pre-seed tokens** — complete the flow on a workstation, then copy tokens:

```bash
mangaba mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
scp ~/.mangaba/mcp-tokens/my-oauth-server{,.client}.json \
    server:/var/lib/mangaba/.mangaba/mcp-tokens/
# Ensure: chown mangaba:mangaba, chmod 0600
```

</details>

### Sampling (Server-Initiated LLM Requests)

Some MCP servers can request LLM completions from the agent:

```nix
{
  services.mangaba-agent.mcpServers.analysis = {
    command = "npx";
    args = [ "-y" "analysis-server" ];
    sampling = {
      enabled = true;
      model = "google/gemini-3-flash";
      max_tokens_cap = 4096;
      timeout = 30;
      max_rpm = 10;
    };
  };
}
```

---

## Managed Mode

When mangaba runs via the NixOS module, the following CLI commands are **blocked** with a descriptive error pointing you to `configuration.nix`:

| Blocked command | Why |
|---|---|
| `mangaba setup` | Config is declarative — edit `settings` in your Nix config |
| `mangaba config edit` | Config is generated from `settings` |
| `mangaba config set <key> <value>` | Config is generated from `settings` |
| `mangaba gateway install` | The systemd service is managed by NixOS |
| `mangaba gateway uninstall` | The systemd service is managed by NixOS |

This prevents drift between what Nix declares and what's on disk. Detection uses two signals:

1. **`MANGABA_MANAGED=true`** environment variable — set by the systemd service, visible to the gateway process
2. **`.managed` marker file** in `MANGABA_HOME` — set by the activation script, visible to interactive shells (e.g., `docker exec -it mangaba-agent mangaba config set ...` is also blocked)

To change configuration, edit your Nix config and run `sudo nixos-rebuild switch`.

---

## Container Architecture

:::info
This section is only relevant if you're using `container.enable = true`. Skip it for native mode deployments.
:::

When container mode is enabled, mangaba runs inside a persistent Ubuntu container with the Nix-built binary bind-mounted read-only from the host:

```
Host                                    Container
────                                    ─────────
/nix/store/...-mangaba-agent-0.1.0  ──►  /nix/store/... (ro)
~/.mangaba -> /var/lib/mangaba/.mangaba       (symlink bridge, per hostUsers)
/var/lib/mangaba/                    ──►  /data/          (rw)
  ├── current-package -> /nix/store/...    (symlink, updated each rebuild)
  ├── .gc-root -> /nix/store/...           (prevents nix-collect-garbage)
  ├── .container-identity                  (sha256 hash, triggers recreation)
  ├── .mangaba/                             (MANGABA_HOME)
  │   ├── .env                             (merged from environment + environmentFiles)
  │   ├── config.yaml                      (Nix-generated, deep-merged by activation)
  │   ├── .managed                         (marker file)
  │   ├── .container-mode                  (routing metadata: backend, exec_user, etc.)
  │   ├── state.db, sessions/, memories/   (runtime state)
  │   └── mcp-tokens/                      (OAuth tokens for MCP servers)
  ├── home/                                ──►  /home/mangaba    (rw)
  └── workspace/                           (MESSAGING_CWD)
      ├── SOUL.md                          (from documents option)
      └── (agent-created files)

Container writable layer (apt/pip/npm):   /usr, /usr/local, /tmp
```

The Nix-built binary works inside the Ubuntu container because `/nix/store` is bind-mounted — it brings its own interpreter and all dependencies, so there's no reliance on the container's system libraries. The container entrypoint resolves through a `current-package` symlink: `/data/current-package/bin/mangaba gateway run --replace`. On `nixos-rebuild switch`, only the symlink is updated — the container keeps running.

### What Persists Across What

| Event | Container recreated? | `/data` (state) | `/home/mangaba` | Writable layer (`apt`/`pip`/`npm`) |
|---|---|---|---|---|
| `systemctl restart mangaba-agent` | No | Persists | Persists | Persists |
| `nixos-rebuild switch` (code change) | No (symlink updated) | Persists | Persists | Persists |
| Host reboot | No | Persists | Persists | Persists |
| `nix-collect-garbage` | No (GC root) | Persists | Persists | Persists |
| Image change (`container.image`) | **Yes** | Persists | Persists | **Lost** |
| Volume/options change | **Yes** | Persists | Persists | **Lost** |
| `environment`/`environmentFiles` change | No | Persists | Persists | Persists |

The container is only recreated when its **identity hash** changes. The hash covers: schema version, image, `extraVolumes`, `extraOptions`, and the entrypoint script. Changes to environment variables, settings, documents, or the mangaba package itself do **not** trigger recreation.

:::warning Writable layer loss
When the identity hash changes (image upgrade, new volumes, new container options), the container is destroyed and recreated from a fresh pull of `container.image`. Any `apt install`, `pip install`, or `npm install` packages in the writable layer are lost. State in `/data` and `/home/mangaba` is preserved (these are bind mounts).

If the agent relies on specific packages, consider baking them into a custom image (`container.image = "my-registry/mangaba-base:latest"`) or scripting their installation in the agent's SOUL.md.
:::

### GC Root Protection

The `preStart` script creates a GC root at `${stateDir}/.gc-root` pointing to the current mangaba package. This prevents `nix-collect-garbage` from removing the running binary. If the GC root somehow breaks, restarting the service recreates it.

---

## Plugins

The NixOS module supports declarative plugin installation — no imperative `mangaba plugins install` needed.

### Directory Plugins (`extraPlugins`)

For plugins that are just a source tree with `plugin.yaml` + `__init__.py` (e.g., [mangaba-lcm](https://github.com/stephenschoettler/mangaba-lcm)):

```nix
services.mangaba-agent.extraPlugins = [
  (pkgs.fetchFromGitHub {
    owner = "stephenschoettler";
    repo = "mangaba-lcm";
    rev = "v0.7.0";
    hash = "sha256-...";
  })
];
```

Plugins are symlinked into `$MANGABA_HOME/plugins/` at activation time. Mangaba discovers them via its normal directory scan. Removing a plugin from the list and running `nixos-rebuild switch` removes the symlink.

### Entry-Point Plugins (`extraPythonPackages`)

For pip-packaged plugins that register via `[project.entry-points."mangaba_agent.plugins"]` (e.g., [rtk-mangaba](https://github.com/ogallotti/rtk-mangaba)):

```nix
services.mangaba-agent.extraPythonPackages = [
  (pkgs.python312Packages.buildPythonPackage {
    pname = "rtk-mangaba";
    version = "1.0.0";
    src = pkgs.fetchFromGitHub {
      owner = "ogallotti";
      repo = "rtk-mangaba";
      rev = "v1.0.0";
      hash = "sha256-...";
    };
    format = "pyproject";
    build-system = [ pkgs.python312Packages.setuptools ];
  })
];
```

The package's `site-packages` is added to PYTHONPATH in the mangaba wrapper. `importlib.metadata` discovers the entry point at session start.

### Optional Dependency Groups (`extraDependencyGroups`)

For optional extras already declared in mangaba-agent's `pyproject.toml` (e.g., memory providers like `hindsight` or `honcho`), use `extraDependencyGroups` to include them in the sealed venv at build time:

```nix
services.mangaba-agent = {
  extraDependencyGroups = [ "hindsight" ];
  settings.memory.provider = "hindsight";
};
```

This is resolved by uv alongside core dependencies in a single pass — no PYTHONPATH patching, no collision risk. Available groups match the `[project.optional-dependencies]` keys in `pyproject.toml` (e.g., `"hindsight"`, `"honcho"`, `"voice"`, `"matrix"`, `"mistral"`, `"bedrock"`).

**When to use which:**

| Need | Option |
|------|--------|
| Enable a pyproject.toml optional extra | `extraDependencyGroups` |
| Add an external Python plugin not in pyproject.toml | `extraPythonPackages` |
| Add a system binary (pandoc, jq, etc.) | `extraPackages` |
| Add a directory-based plugin source tree | `extraPlugins` |

### Combining Both

A directory plugin with third-party Python dependencies needs both options:

```nix
services.mangaba-agent = {
  extraPlugins = [ my-plugin-src ];          # plugin source
  extraPythonPackages = [ pkgs.python312Packages.redis ];  # its Python dep
  extraPackages = [ pkgs.redis ];            # system binary it needs
};
```

### Using the Overlay

External flakes can override the package directly:

```nix
{
  inputs.mangaba-agent.url = "github:dheiver2/mangaba-agent";
  outputs = { mangaba-agent, nixpkgs, ... }: {
    nixpkgs.overlays = [ mangaba-agent.overlays.default ];
    # Then:
    #   pkgs.mangaba-agent.override { extraPythonPackages = [...]; }
    #   pkgs.mangaba-agent.override { extraDependencyGroups = [ "hindsight" ]; }
  };
}
```

### Plugin Configuration

Plugins still need to be enabled in `config.yaml`. Add them via the declarative settings:

```nix
services.mangaba-agent.settings.plugins.enabled = [
  "mangaba-lcm"
  "rtk-rewrite"
];
```

:::note
A build-time collision check prevents plugin packages from shadowing core mangaba dependencies. If a plugin provides a package already in the sealed venv, `nixos-rebuild` fails with a clear error.
:::

---

## Development

### Dev Shell

The flake provides a development shell with Python 3.12, uv, Node.js, and all runtime tools:

```bash
cd mangaba-agent
nix develop

# Shell provides:
#   - Python 3.12 + uv (deps installed into .venv on first entry)
#   - Node.js 22, ripgrep, git, openssh, ffmpeg on PATH
#   - Stamp-file optimization: re-entry is near-instant if deps haven't changed

mangaba setup
mangaba chat
```

### direnv (Recommended)

The included `.envrc` activates the dev shell automatically:

```bash
cd mangaba-agent
direnv allow    # one-time
# Subsequent entries are near-instant (stamp file skips dep install)
```

### Flake Checks

The flake includes build-time verification that runs in CI and locally:

```bash
# Run all checks
nix flake check

# Individual checks
nix build .#checks.x86_64-linux.package-contents   # binaries exist + version
nix build .#checks.x86_64-linux.entry-points-sync  # pyproject.toml ↔ Nix package sync
nix build .#checks.x86_64-linux.cli-commands        # gateway/config subcommands
nix build .#checks.x86_64-linux.managed-guard       # MANGABA_MANAGED blocks mutation
nix build .#checks.x86_64-linux.bundled-skills      # skills present in package
nix build .#checks.x86_64-linux.config-roundtrip    # merge script preserves user keys
```

<details>
<summary><strong>What each check verifies</strong></summary>

| Check | What it tests |
|---|---|
| `package-contents` | `mangaba` and `mangaba-agent` binaries exist and `mangaba version` runs |
| `entry-points-sync` | Every `[project.scripts]` entry in `pyproject.toml` has a wrapped binary in the Nix package |
| `cli-commands` | `mangaba --help` exposes `gateway` and `config` subcommands |
| `managed-guard` | `MANGABA_MANAGED=true mangaba config set ...` prints the NixOS error |
| `bundled-skills` | Skills directory exists, contains SKILL.md files, `MANGABA_BUNDLED_SKILLS` is set in wrapper |
| `config-roundtrip` | 7 merge scenarios: fresh install, Nix override, user key preservation, mixed merge, MCP additive merge, nested deep merge, idempotency |

</details>

---

## Options Reference

### Core

| Option | Type | Default | Description |
|---|---|---|---|
| `enable` | `bool` | `false` | Enable the mangaba-agent service |
| `package` | `package` | `mangaba-agent` | The mangaba-agent package to use |
| `user` | `str` | `"mangaba"` | System user |
| `group` | `str` | `"mangaba"` | System group |
| `createUser` | `bool` | `true` | Auto-create user/group |
| `stateDir` | `str` | `"/var/lib/mangaba"` | State directory (`MANGABA_HOME` parent) |
| `workingDirectory` | `str` | `"${stateDir}/workspace"` | Agent working directory (`MESSAGING_CWD`) |
| `addToSystemPackages` | `bool` | `false` | Add `mangaba` CLI to system PATH and set `MANGABA_HOME` system-wide |

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `settings` | `attrs` (deep-merged) | `{}` | Declarative config rendered as `config.yaml`. Supports arbitrary nesting; multiple definitions are merged via `lib.recursiveUpdate` |
| `configFile` | `null` or `path` | `null` | Path to an existing `config.yaml`. Overrides `settings` entirely if set |

### Secrets & Environment

| Option | Type | Default | Description |
|---|---|---|---|
| `environmentFiles` | `listOf str` | `[]` | Paths to env files with secrets. Merged into `$MANGABA_HOME/.env` at activation time |
| `environment` | `attrsOf str` | `{}` | Non-secret env vars. **Visible in Nix store** — do not put secrets here |
| `authFile` | `null` or `path` | `null` | OAuth credentials seed. Only copied on first deploy |
| `authFileForceOverwrite` | `bool` | `false` | Always overwrite `auth.json` from `authFile` on activation |

### Documents

| Option | Type | Default | Description |
|---|---|---|---|
| `documents` | `attrsOf (either str path)` | `{}` | Workspace files. Keys are filenames, values are inline strings or paths. Installed into `workingDirectory` on activation |

### MCP Servers

| Option | Type | Default | Description |
|---|---|---|---|
| `mcpServers` | `attrsOf submodule` | `{}` | MCP server definitions, merged into `settings.mcp_servers` |
| `mcpServers.<name>.command` | `null` or `str` | `null` | Server command (stdio transport) |
| `mcpServers.<name>.args` | `listOf str` | `[]` | Command arguments |
| `mcpServers.<name>.env` | `attrsOf str` | `{}` | Environment variables for the server process |
| `mcpServers.<name>.url` | `null` or `str` | `null` | Server endpoint URL (HTTP/StreamableHTTP transport) |
| `mcpServers.<name>.headers` | `attrsOf str` | `{}` | HTTP headers, e.g. `Authorization` |
| `mcpServers.<name>.auth` | `null` or `"oauth"` | `null` | Authentication method. `"oauth"` enables OAuth 2.1 PKCE |
| `mcpServers.<name>.enabled` | `bool` | `true` | Enable or disable this server |
| `mcpServers.<name>.timeout` | `null` or `int` | `null` | Tool call timeout in seconds (default: 120) |
| `mcpServers.<name>.connect_timeout` | `null` or `int` | `null` | Connection timeout in seconds (default: 60) |
| `mcpServers.<name>.tools` | `null` or `submodule` | `null` | Tool filtering (`include`/`exclude` lists) |
| `mcpServers.<name>.sampling` | `null` or `submodule` | `null` | Sampling config for server-initiated LLM requests |

### Service Behavior

| Option | Type | Default | Description |
|---|---|---|---|
| `extraArgs` | `listOf str` | `[]` | Extra args for `mangaba gateway` |
| `extraPackages` | `listOf package` | `[]` | Extra packages available to the agent. Added to the mangaba user's per-user profile so terminal commands, skills, and cron jobs all see them |
| `extraPlugins` | `listOf package` | `[]` | Directory plugin packages to symlink into `$MANGABA_HOME/plugins/`. Each must contain `plugin.yaml` |
| `extraPythonPackages` | `listOf package` | `[]` | Python packages added to PYTHONPATH for entry-point plugin discovery. Build with `python312Packages` |
| `extraDependencyGroups` | `listOf str` | `[]` | pyproject.toml optional extras to include in the sealed venv (e.g. `["hindsight"]`). Resolved by uv — no collisions |
| `restart` | `str` | `"always"` | systemd `Restart=` policy |
| `restartSec` | `int` | `5` | systemd `RestartSec=` value |

### Container

| Option | Type | Default | Description |
|---|---|---|---|
| `container.enable` | `bool` | `false` | Enable OCI container mode |
| `container.backend` | `enum ["docker" "podman"]` | `"docker"` | Container runtime |
| `container.image` | `str` | `"ubuntu:24.04"` | Base image (pulled at runtime) |
| `container.extraVolumes` | `listOf str` | `[]` | Extra volume mounts (`host:container:mode`) |
| `container.extraOptions` | `listOf str` | `[]` | Extra args passed to `docker create` |
| `container.hostUsers` | `listOf str` | `[]` | Interactive users who get a `~/.mangaba` symlink to the service stateDir and are auto-added to the `mangaba` group |

---

## Directory Layout

### Native Mode

```
/var/lib/mangaba/                     # stateDir (owned by mangaba:mangaba, 0750)
├── .mangaba/                         # MANGABA_HOME
│   ├── config.yaml                  # Nix-generated (deep-merged each rebuild)
│   ├── .managed                     # Marker: CLI config mutation blocked
│   ├── .env                         # Merged from environment + environmentFiles
│   ├── auth.json                    # OAuth credentials (seeded, then self-managed)
│   ├── gateway.pid
│   ├── state.db
│   ├── mcp-tokens/                  # OAuth tokens for MCP servers
│   ├── sessions/
│   ├── memories/
│   ├── skills/
│   ├── cron/
│   └── logs/
├── home/                            # Agent HOME
└── workspace/                       # MESSAGING_CWD
    ├── SOUL.md                      # From documents option
    └── (agent-created files)
```

### Container Mode

Same layout, mounted into the container:

| Container path | Host path | Mode | Notes |
|---|---|---|---|
| `/nix/store` | `/nix/store` | `ro` | Mangaba binary + all Nix deps |
| `/data` | `/var/lib/mangaba` | `rw` | All state, config, workspace |
| `/home/mangaba` | `${stateDir}/home` | `rw` | Persistent agent home — `pip install --user`, tool caches |
| `/usr`, `/usr/local`, `/tmp` | (writable layer) | `rw` | `apt`/`pip`/`npm` installs — persists across restarts, lost on recreation |

---

## Updating

```bash
# Update the flake input (run from the directory containing flake.nix)
cd /etc/nixos && nix flake update mangaba-agent

# Rebuild
sudo nixos-rebuild switch
```

In container mode, the `current-package` symlink is updated and the agent picks up the new binary on restart. No container recreation, no loss of installed packages.

---

## Troubleshooting

:::tip Podman users
All `docker` commands below work the same with `podman`. Substitute accordingly if you set `container.backend = "podman"`.
:::

### Service Logs

```bash
# Both modes use the same systemd unit
journalctl -u mangaba-agent -f

# Container mode: also available directly
docker logs -f mangaba-agent
```

### Container Inspection

```bash
systemctl status mangaba-agent
docker ps -a --filter name=mangaba-agent
docker inspect mangaba-agent --format='{{.State.Status}}'
docker exec -it mangaba-agent bash
docker exec mangaba-agent readlink /data/current-package
docker exec mangaba-agent cat /data/.container-identity
```

### Force Container Recreation

If you need to reset the writable layer (fresh Ubuntu):

```bash
sudo systemctl stop mangaba-agent
docker rm -f mangaba-agent
sudo rm /var/lib/mangaba/.container-identity
sudo systemctl start mangaba-agent
```

### Verify Secrets Are Loaded

If the agent starts but can't authenticate with the LLM provider, check that the `.env` file was merged correctly:

```bash
# Native mode
sudo -u mangaba cat /var/lib/mangaba/.mangaba/.env

# Container mode
docker exec mangaba-agent cat /data/.mangaba/.env
```

### GC Root Verification

```bash
nix-store --query --roots $(docker exec mangaba-agent readlink /data/current-package)
```

### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot save configuration: managed by NixOS` | CLI guards active | Edit `configuration.nix` and `nixos-rebuild switch` |
| Container recreated unexpectedly | `extraVolumes`, `extraOptions`, or `image` changed | Expected — writable layer resets. Reinstall packages or use a custom image |
| `mangaba version` shows old version | Container not restarted | `systemctl restart mangaba-agent` |
| Permission denied on `/var/lib/mangaba` | State dir is `0750 mangaba:mangaba` | Use `docker exec` or `sudo -u mangaba` |
| `nix-collect-garbage` removed mangaba | GC root missing | Restart the service (preStart recreates the GC root) |
| `no container with name or ID "mangaba-agent"` (Podman) | Podman rootful container not visible to regular user | Add passwordless sudo for podman (see [Container Mode](#container-mode) section) |
| `unable to find user mangaba` | Container still starting (entrypoint hasn't created user yet) | Wait a few seconds and retry — the CLI retries automatically |
| Tool added via `extraPackages` not found in terminal | Requires `nixos-rebuild switch` to update the per-user profile | Rebuild and restart: `nixos-rebuild switch && systemctl restart mangaba-agent` |
