# Comandos — Mangaba Agent (terminal)

> Rode **um comando por vez**. Não cole linhas com `#` no zsh (vira erro) —
> aqui os comandos estão em blocos limpos, sem comentários na mesma linha.

## 1. Ativar o ambiente (uma vez por terminal)

```
cd /Users/dheiver/Downloads/Projetos/mangaba-agent
```
```
source .venv/bin/activate
```

Depois disso o comando `mangaba` funciona neste terminal.

## 2. Dashboard (web UI em http://localhost:9119)

Subir sem abrir o navegador:
```
mangaba dashboard --no-open
```

Subir e abrir o navegador:
```
mangaba dashboard
```

Subir mais rápido (sem recompilar o frontend):
```
mangaba dashboard --skip-build --no-open
```

Parar:
```
mangaba dashboard --stop
```

Ver se está rodando:
```
mangaba dashboard --status
```

> Deixe o terminal aberto enquanto usa. `Ctrl+C` para parar.

## 3. Gateway (a IA que responde nos canais)

O dashboard já sobe o gateway junto. Para controlá-lo à parte:

```
mangaba gateway status
```
```
mangaba gateway restart
```
```
mangaba gateway stop
```

Rodar em primeiro plano vendo os logs ao vivo:
```
mangaba gateway run
```

## 4. Logs

Ao vivo (Ctrl+C sai):
```
tail -f ~/.mangaba/logs/gateway.log
```

Últimas 50 linhas:
```
tail -50 ~/.mangaba/logs/gateway.log
```

Só as mensagens recebidas:
```
grep -i "inbound message" ~/.mangaba/logs/gateway.log | tail
```

## 5. Trocar o modelo

Ver os modelos do Ollama instalados:
```
curl -s http://localhost:11434/api/tags | python3 -m json.tool | grep '"name"'
```

Editar a config (campo `model.default`):
```
nano ~/.mangaba/config.yaml
```

Aplicar:
```
mangaba gateway restart
```

Modelos úteis (todos rodam os 64k exigidos):
- `qwen2.5:3b-instruct`  → rápido (atual)
- `llama3.2:3b`          → mais rápido ainda
- `qwen2.5:7b-instruct`  → mais qualidade, um pouco mais lento

## 6. Chaves dos canais

Editar tokens (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, etc.):
```
nano ~/.mangaba/.env
```

Aplicar:
```
mangaba gateway restart
```

## 7. Testar envio (direto, sem o agente)

```
mangaba send --to telegram oi
```
```
mangaba send --to discord:#geral teste
```
```
mangaba send --list
```

## 8. Recompilar o frontend (depois de editar web/)

```
cd web && npm run build && cd ..
```

## 8.1 Base de conhecimento (RAG — mangaba.ia.br)

O agente responde com base no conteúdo oficial de **mangaba.ia.br**. A camada
de RAG injeta os trechos relevantes do site em cada resposta — em todos os
canais (chat do dashboard, Telegram, Discord).

Gerenciar pelo dashboard: aba **Memória → Base de conhecimento (RAG)**
(Ativar/Desativar e **Reindexar site**).

Reindexar pelo terminal (após o site mudar):
```
curl -s -X POST http://localhost:9119/api/rag/reindex -H "X-Mangaba-Session-Token: $(curl -s http://localhost:9119/ | grep -o '__MANGABA_SESSION_TOKEN__=\"[^\"]*\"' | cut -d'\"' -f2)"
```

Ligar/desligar manualmente: campo `memory.provider` no `~/.mangaba/config.yaml`
(`mangaba_rag` = ligado, vazio = desligado), depois `mangaba gateway restart`.

## 8.2 Clientes consumindo a API (white-label / multi-tenant)

Seus clientes podem consumir o agente por uma **API OpenAI-compatível**. Cada
cliente tem **chave**, **modelo**, **persona** e **teto diário** próprios —
isolados entre si.

Ligar a API (uma vez, no `~/.mangaba/.env`):
```
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
```
Depois: `mangaba gateway restart`.

> Para expor à internet, troque o host para `0.0.0.0`, ponha atrás de um
> proxy com HTTPS e defina `API_SERVER_KEY` (chave global do operador).

Gerenciar clientes e chaves: aba **Clientes & API** no dashboard (criar,
gerar/revogar chave — a chave aparece **uma vez** —, suspender, ver uso).

**Planos e limites (Fase 2):** cada cliente tem um plano (free/pro/enterprise/
custom) com **req/min** e **teto de tokens/dia**. Ao exceder → `429` com headers
`x-ratelimit-*` e `Retry-After`.

**Isolamento dedicado (Fase 3):** no card do cliente, **Iniciar agente
dedicado** cria um *profile* próprio (`~/.mangaba/profiles/<id>/` com config,
`.env`/credenciais, memória, RAG e persona separados) rodando como um gateway
próprio numa porta dedicada. O roteador (8642) faz proxy automático para o
backend do cliente. **Parar agente** derruba; excluir o cliente remove o profile.

O cliente usa a chave `mk_live_…` como qualquer API OpenAI:
```
curl http://SEU_HOST:8642/v1/chat/completions \
  -H "Authorization: Bearer mk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"mangaba","messages":[{"role":"user","content":"Olá!"}]}'
```

## 8.3 Expor a API na internet (produção)

A API fica só em `127.0.0.1` por padrão. Para abrir ao mundo com segurança:

```
bash scripts/deploy/setup-public.sh   # gera API_SERVER_KEY e configura .env
mangaba gateway restart
```

Suba um proxy HTTPS na frente (HTTPS automático):
```
# edite o domínio em scripts/deploy/Caddyfile.example, depois:
sudo caddy run --config scripts/deploy/Caddyfile.example
```

Regras de ouro:
- Exponha **apenas** o roteador `:8642` (via proxy HTTPS). **Nunca** exponha o
  dashboard `:9119` nem os backends dedicados `:8700+` (ficam em 127.0.0.1).
- O **operador** usa a `API_SERVER_KEY` (admin); os **clientes** usam as chaves
  `mk_live_…` deles.

**Auto-start dos agentes dedicados:** ao iniciar um agente dedicado pelo painel,
ele é marcado para **voltar sozinho no boot**. O dashboard reconcilia na subida
(o LaunchAgent do macÓS já sobe o dashboard). Parar pelo painel desmarca.

## 8.4 Go-live (produção)

Checklist completo para colocar em produção com segurança (chaves, proxy HTTPS,
canais, billing, auto-restart, backups): **`scripts/deploy/go-live.md`**.
WhatsApp oficial: `scripts/deploy/whatsapp-cloud.md`.

## 9. Ajuda

```
mangaba --help
```
```
mangaba gateway --help
```
```
mangaba kanban --help
```

## Dica: colar comandos com `#` sem erro no zsh

```
setopt interactive_comments
```

(some ao fechar o terminal; para fixar, adicione essa linha ao `~/.zshrc`).
