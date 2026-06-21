---
sidebar_position: 33
title: "Google Workspace via MCP (completo, self-host)"
description: "Conectar Gmail, Calendar, Drive, Sheets, Docs e mais ao Mangaba usando o servidor MCP taylorwilsdon/google_workspace_mcp — privado, rodando localmente."
---

# Google Workspace via MCP (self-host, privado)

Integra o ecossistema Google ao Mangaba via [taylorwilsdon/google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp) — 72 ferramentas (Gmail, Calendar, Drive, Sheets, Docs, Slides, Tasks, Forms, Contacts), rodando **localmente** (seus dados não passam por terceiros).

## 1. Registrar o servidor no Mangaba

O servidor roda via `uvx workspace-mcp`. Para evitar conflito de flags com o CLI do Mangaba, use um wrapper:

```bash
cat > ~/.mangaba/google-ws-mcp.sh << 'EOF'
#!/usr/bin/env bash
exec uvx workspace-mcp --single-user \
  --tools gmail calendar drive sheets docs --transport stdio
EOF
chmod +x ~/.mangaba/google-ws-mcp.sh

mangaba mcp add google-ws --command ~/.mangaba/google-ws-mcp.sh
```

## 2. Credenciais OAuth (uma vez)

O servidor precisa de um app OAuth do Google (é exigência do Google para self-host). No [Google Cloud Console](https://console.cloud.google.com/): crie um projeto, ative as APIs (Gmail, Calendar, Drive, Sheets, Docs), crie uma credencial OAuth do tipo **App para computador** e copie o **Client ID** e **Client Secret**.

Defina-os — pelo terminal **ou pelo próprio chat** com `/set`:

```
/set GOOGLE_OAUTH_CLIENT_ID <client-id>
/set GOOGLE_OAUTH_CLIENT_SECRET <client-secret>
/reload
```

Alternativa: coloque o `client_secret.json` baixado em `~/.google_workspace_mcp/credentials/`.

## 3. Autorizar (primeiro uso)

Na primeira tarefa Google, o servidor abre o navegador para você autorizar sua conta (clique "Permitir"). O token é salvo e reutilizado — você não autoriza de novo.

## 4. Usar

No canal, em linguagem natural:

```
veja meus emails não lidos
crie um evento amanhã às 14h chamado "reunião"
liste os arquivos recentes do meu Drive
leia a planilha <id> intervalo A1:C10
```

## Alternativas mais simples

- **Só email, sem Google Cloud:** use o MCP de email (IMAP/SMTP) com uma Senha de App — veja `skills/email/email_mcp_server.py`.
- **Zero configuração (mas com terceiro):** um MCP hospedado (Composio, Pipedream, Zapier) traz o app OAuth pronto — conexão em 1 clique, sem Google Cloud.
