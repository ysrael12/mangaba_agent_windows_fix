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
