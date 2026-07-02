# Mangaba Model Selection & Bootstrap Integration — Spec

> **For Mangaba:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Decide which backend `bootstrap.sh` should provision by default, and how (or whether) to wire in the two "Mangaba"-branded model options that were proposed, without breaking the zero-config "clone and run" promise `bootstrap.sh` makes today.

**Inputs evaluated:**
- HF model: https://huggingface.co/DHEIVER/Mangaba-AI-Nordeste-4B
- Gateway: `https://walton-undepreciatory-tracee.ngrok-free.dev` (swagger: `mangaba-lite-q4` · Mangaba AI Lite · Q4 · rápido)

---

## 1. Current state (`./bootstrap.sh`)

Step 3/5 installs Ollama and pulls `MANGABA_MODEL:-gemma4:e4b`. Step 4/5 writes
`~/.mangaba/config.yaml` with `provider: ollama`, `base_url: http://localhost:11434/v1`.
Per `README.md` ("Modelo local: escolha pela sua RAM"), `gemma4:e4b` was picked
specifically because the agent loop **requires ≥64K native context to use
tools** (this eliminates qwen2.5 7B/14B, which only has 32K), and it's
validated at 16GB RAM / 100% GPU. This is a deliberate, tested constraint —
not a placeholder.

Separately, `mangaba_cli/agent_templates.py` already points two data-agent
templates (Cívico, Lícia — both call MCP tools) at `model: mangaba-vision-q8`
via a maintainer-hosted OpenAI-compatible gateway, configured with
`provider: custom` + `custom_providers[].discover_models: true` (documented
in `README.md` under "Gateway próprio (OpenAI-compatível) com descoberta de
modelos"). Commit history (`7f68ead`, `a70309d`) shows this was already
tried with a `mangaba-4b` model id that "doesn't exist in the current
endpoint's pool," then corrected to `mangaba-vision-q8` because it's the one
slug confirmed to emit `tool_calls`.

## 2. Findings

### Option A — HF `DHEIVER/Mangaba-AI-Nordeste-4B`
Fetched from the model card:
- Base: Qwen3-4B-Instruct + DoRA adapter (rank 16, 12 layers), Apache-2.0.
- Distributed as **MLX** 4-bit weights (45.5MB adapter) — **Apple Silicon
  only**, via MLX-LM. No GGUF or plain safetensors release found.
- **No documented tool/function-calling support.**
- Fine-tune domain: facts about the Mangaba AI platform and Northeast
  Brazil enterprises — a narrow knowledge fine-tune, not a general agentic
  driver.

Blocking gaps for `bootstrap.sh`:
1. Doesn't load in Ollama (bootstrap's only local-model path) without a
   GGUF conversion + adapter merge that doesn't exist yet.
2. Linux/Windows users get nothing — `bootstrap.sh` explicitly supports
   macOS (brew) and Linux (apt) side by side.
3. Tool-calling is unverified, and this repo's agent loop calls tools on
   every turn (terminal, file, MCP, etc.) — an unconfirmed model here is a
   correctness risk, not just a UX downgrade.

### Option B — Gateway (`walton-undepreciatory-tracee.ngrok-free.dev`)
Fetched from `/openapi.json`, `/api/v1/models`, `/api/v1/health`:
- OpenAI-compatible (`GET /v1/models`, `POST /v1/chat/completions`) plus a
  richer `/api/v1/{slug}/...` surface (chat, generate, image/describe,
  audio). Fits the `provider: custom` + `discover_models` pattern this repo
  already documents — no new provider code needed.
- Pool: `mangaba-max`, `mangaba-pro`, `mangaba-vision-q8` (multimodal),
  `mangaba-lite-q4`. `mangaba-vision-q8` is the one already confirmed
  tool-capable in production (Cívico/Lícia).
- Runs on a **single Apple M4** with an **11GB model-swap budget**: at
  fetch time only 2 of 4 models were loaded (`mangaba-pro` +
  `mangaba-lite-q4`, 9.9/11.0 GB used) — the other two pay a cold-load
  penalty on first request.
- No auth was visible on the inspected endpoints, and the hostname is a
  **free ngrok tunnel** (rotates on restart, no uptime guarantee).
- Single point of failure tied to one person's machine being on and
  tunneled. Right for the maintainer's own templates/dashboard (how it's
  used today); wrong as a baked-in default for every `bootstrap.sh` clone,
  since it doesn't scale beyond the maintainer's own agents and would break
  silently for anyone else the moment that laptop sleeps or the tunnel
  rotates.

### Baseline — current default (`gemma4:e4b` via Ollama)
Cross-platform, fully offline, no external SPOF, and specifically validated
against the ≥64K-context tool-calling requirement at 16GB RAM. Not
"Mangaba"-branded, but the only one of the three that actually satisfies
`bootstrap.sh`'s constraints (zero-config, cross-platform, tool-capable, no
dependency on a specific reachable machine).

## 3. Decision

Keep local Ollama as `bootstrap.sh`'s default — no change to today's
behavior. Do **not** point `bootstrap.sh` at the ngrok gateway or the HF
MLX adapter by default. Add the gateway as an explicit **opt-in** path
(new env var), reusing the `custom_providers` / `discover_models` pattern
already documented in `README.md`, so people who have (or stand up) a
Mangaba-style OpenAI-compatible pool can point `bootstrap.sh` at it in one
line instead of hand-editing `config.yaml` afterward. Leave the HF MLX
model out of `bootstrap.sh` and out of `agent_templates.py` entirely until
it ships in a tool-calling-capable, Ollama-loadable (GGUF) form.

---

## Task 1: Add opt-in gateway path to `bootstrap.sh`

**Files:** `bootstrap.sh`

- New override, read next to the existing `MODEL` line (~line 31):
  `PROVIDER="${MANGABA_PROVIDER:-ollama}"`.
- When `PROVIDER=gateway`:
  - Skip step "3/5 Ollama + modelo local" entirely (no install, no `ollama
    pull`).
  - In step "4/5 Config do modelo", require `MANGABA_GATEWAY_URL` and fail
    fast with a clear message if unset (never hardcode the maintainer's
    personal ngrok hostname — it is not a public multi-tenant endpoint and
    will silently break for anyone else). Write instead of the
    Ollama block:
    ```yaml
    model:
      provider: custom
      base_url: ${MANGABA_GATEWAY_URL}/v1
      api_key: ${MANGABA_GATEWAY_KEY:-x}
      default: ${MANGABA_GATEWAY_MODEL:-mangaba-vision-q8}
    custom_providers:
      - name: mangaba-gateway
        base_url: ${MANGABA_GATEWAY_URL}/v1
        api_key: ${MANGABA_GATEWAY_KEY:-x}
        discover_models: true
        default_model: ${MANGABA_GATEWAY_MODEL:-mangaba-vision-q8}
    ```
  - Print the same tool-calling caveat already in `README.md`: agents that
    call MCP/tools need a tool-capable model (`mangaba-vision-q8`);
    chat-only models (`mangaba-lite-q4`) are fine for conversational
    agents only.
- Default path (`MANGABA_PROVIDER` unset) must be byte-identical to today's
  behavior: Ollama + `gemma4:e4b`, still overridable with `MANGABA_MODEL=`.

## Task 2: Document the opt-in path

**Files:** `README.md`

- Under "Instalação em 1 Comando", add one line next to the existing
  `MANGABA_MODEL=qwen3:4b ./bootstrap.sh` example:
  `MANGABA_PROVIDER=gateway MANGABA_GATEWAY_URL=https://seu-endpoint ./bootstrap.sh`.
- Link it to the existing "Gateway próprio (OpenAI-compatível) com
  descoberta de modelos" section instead of duplicating the explanation.

## Task 3: Verify no regression to the default path

**Files:** `bootstrap.sh`

- `bash -n bootstrap.sh` after edits.
- Run `BOOTSTRAP_NO_CHANNELS=true ./bootstrap.sh` with no env vars on a
  clean `~/.mangaba/`; diff the resulting `config.yaml` against a
  pre-change run — the `model:` block must be unchanged (still `provider:
  ollama`, `default: gemma4:e4b`).
- Run `MANGABA_PROVIDER=gateway MANGABA_GATEWAY_URL=<test-url>
  BOOTSTRAP_NO_CHANNELS=true ./bootstrap.sh`; confirm the Ollama
  install/pull steps are skipped and `custom_providers` is written
  correctly.

## Explicitly out of scope

- Wiring `DHEIVER/Mangaba-AI-Nordeste-4B` into `bootstrap.sh` or a
  provider plugin. Revisit only once a GGUF (or vLLM-servable
  safetensors) build with confirmed `tool_calls` support ships — at that
  point it's a plain `ollama pull` swap-in via `MANGABA_MODEL=`, no new
  code required.
- Changing the default model away from `gemma4:e4b` — it remains the only
  option of the three meeting the ≥64K-context + tool-calling +
  cross-platform bar bootstrap.sh needs.
- Hardcoding `walton-undepreciatory-tracee.ngrok-free.dev` (or any other
  personal tunnel URL) anywhere in the codebase.
