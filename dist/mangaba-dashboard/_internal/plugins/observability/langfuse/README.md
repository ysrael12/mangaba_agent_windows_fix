# Langfuse Observability Plugin

This plugin ships bundled with Mangaba but is **opt-in** — it only loads when
you explicitly enable it.

## Enable

```bash
pip install langfuse
mangaba plugins enable observability/langfuse
```

Or check the box in the interactive `mangaba plugins` UI.

## Required credentials

Set these in `~/.mangaba/.env`:

```bash
MANGABA_LANGFUSE_PUBLIC_KEY=pk-lf-...
MANGABA_LANGFUSE_SECRET_KEY=sk-lf-...
MANGABA_LANGFUSE_BASE_URL=https://cloud.langfuse.com   # or your self-hosted URL
```

Without the SDK or credentials the hooks no-op silently — the plugin fails
open.

## Verify

```bash
mangaba plugins list                 # observability/langfuse should show "enabled"
mangaba chat -q "hello"              # then check Langfuse for a "Mangaba turn" trace
```

## Optional tuning

```bash
MANGABA_LANGFUSE_ENV=production       # environment tag
MANGABA_LANGFUSE_RELEASE=v1.0.0       # release tag
MANGABA_LANGFUSE_SAMPLE_RATE=0.5      # sample 50% of traces
MANGABA_LANGFUSE_MAX_CHARS=12000      # max chars per field (default: 12000)
MANGABA_LANGFUSE_DEBUG=true           # verbose plugin logging
```

## Disable

```bash
mangaba plugins disable observability/langfuse
```
