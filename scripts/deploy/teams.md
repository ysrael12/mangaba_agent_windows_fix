# Publicar no Microsoft Teams (Azure Bot / Bot Framework)

Caminho oficial — o mesmo que produtos como Copilot Studio usam. Conecta o
**agente principal** ao Teams. (Regra: 1 bot do Teams = 1 endpoint = 1 agente;
para vários agentes, repita com um app Azure por agente.)

> Pré-requisitos: API exposta em **HTTPS público** (`scripts/deploy/setup-public.sh`
> + Caddy) e o SDK já instalado (`botbuilder-core`).

## Passo 1 — Registrar o app no Azure
1. **portal.azure.com → Microsoft Entra ID → App registrations → New registration.**
   - Copie o **Application (client) ID** e o **Directory (tenant) ID**.
2. **Certificates & secrets → New client secret** → copie o **Value** (Client Secret).
3. **portal.azure.com → criar recurso "Azure Bot"** (ou "Bot Channels Registration"):
   - Tipo de app: **Multi-tenant** (ou single, conforme seu tenant),
   - App ID: o client ID acima.

## Passo 2 — Conectar no assistente
1. Dashboard → **Criar agente** → passo 2 (Conectar canal) → **Teams**.
2. Cole **Client ID**, **Client Secret** e **Tenant ID** → **Validar**
   (pegamos um token OAuth do Azure; deve aparecer "✅ Credenciais válidas").
3. **Conectar** → o painel mostra o **Messaging endpoint** para registrar no Azure.

## Passo 3 — Apontar o endpoint no Azure
1. O adapter do Teams escuta na porta **TEAMS_PORT** (padrão **3978**), caminho
   **`/api/messages`**.
2. No **proxy HTTPS**, encaminhe um caminho público para essa porta. Ex. (Caddy):
   ```
   handle /api/messages* {
       reverse_proxy 127.0.0.1:3978
   }
   ```
3. No **Azure Bot → Configuration → Messaging endpoint**, cole:
   `https://SEU_DOMINIO/api/messages`
4. No Azure Bot → **Channels**, adicione **Microsoft Teams**.

## Passo 4 — Instalar e testar no Teams
1. Gere/instale o app no Teams (App Studio / Developer Portal for Teams, ou
   "Open in Teams" pelo canal Teams do bot).
2. Fale com o bot em DM ou mencione-o num canal — o agente responde.
3. (Privado) restrinja quem pode usar: `TEAMS_ALLOWED_USERS` no `.env`.

## Variáveis salvas (referência)
```
TEAMS_CLIENT_ID=...
TEAMS_CLIENT_SECRET=...
TEAMS_TENANT_ID=...
TEAMS_PORT=3978            # opcional
TEAMS_ALLOWED_USERS=...    # opcional (restringe)
```

## Vários agentes no Teams
Cada agente = um app Azure + um bot + uma porta/endpoint próprios. Provisione um
profile dedicado por agente (aba Clientes/Perfis), defina `TEAMS_PORT` distinto
no `.env` de cada profile e registre um Azure Bot por agente. Não há "um bot
falando como vários agentes" sem uma camada de roteamento.

## Solução de problemas
- **Validou mas o bot não responde** → o messaging endpoint não está público/
  não aponta para a porta 3978, ou o canal Teams não foi adicionado no Azure Bot.
- **401/403 do Azure ao validar** → client_id/secret/tenant errados ou secret expirado.
- **SDK ausente** → `uv pip install --python .venv/bin/python botbuilder-core`.
