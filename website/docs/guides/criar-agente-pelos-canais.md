---
sidebar_position: 30
title: "Criar e configurar agentes pelos canais"
description: "Tutorial completo: do clone ao bot no Telegram, e como configurar o agente inteiro pelo próprio chat (modelo, ferramentas, personalidade, agendamentos)."
---

# Criar e configurar agentes pelos canais

Este guia mostra, do zero, como colocar um agente Mangaba no Telegram (ou Discord, Slack…) e **configurá-lo quase inteiramente pelo próprio chat** — sem voltar ao terminal.

> Os exemplos usam **Ollama local** (grátis, privado). Para mais capacidade, troque por um modelo na nuvem com `/model` (ver abaixo).

---

## Parte 1 — Do clone ao bot no ar

### 1. Criar o bot no Telegram
1. No Telegram, fale com o **@BotFather** → `/newbot`.
2. Escolha nome e username (terminado em `bot`).
3. Guarde o **token** que ele devolve.

### 2. Instalar com um comando
```bash
git clone https://github.com/dheiver2/mangaba-agent.git
cd mangaba-agent
./telegram.sh
```

O `telegram.sh` instala tudo (pré-requisitos, Ollama, modelo), pede **só o token**, **detecta seu user ID** automaticamente (você manda um "oi" ao bot) e sobe o gateway.

Pronto — fale com o bot no Telegram.

> Para escolher um ou mais dos **13 canais** suportados, use `./setup-channels.sh` (ou `./bootstrap.sh`). Ele cobre: Telegram, WhatsApp, Discord, Slack, Email, Signal, Matrix, Mattermost, SMS (Twilio), DingTalk, Feishu/Lark, WeCom e WeChat — cada um pede só as credenciais essenciais e grava no `.env`.

---

## Parte 2 — Configurar o agente pelo chat

Ative os comandos administrativos nos canais (uma vez, no `~/.mangaba/config.yaml`):

```yaml
gateway:
  expose_admin_commands: true
```

Reinicie o gateway. Agora os comandos abaixo funcionam **dentro do Telegram**.

### Ver a configuração
```
/config
```
Mostra modelo, provider, contexto, plataformas e personalidade ativos.

### Trocar o modelo (o "cérebro")
```
/model                       # menu
/model qwen3:4b              # outro modelo local
/model openrouter/anthropic/claude-sonnet-4-6   # nuvem (requer OPENROUTER_API_KEY)
```

### Ligar/desligar ferramentas
```
/tools list                 # ver o que está ligado
/tools enable web           # ligar pesquisa web
/tools disable browser      # desligar automação de navegador
```

### Habilidades (skills)
```
/skills list                # listar habilidades disponíveis
/skills <categoria>         # filtrar (ex: devops, email)
```

### Ajustar comportamento
```
/personality formal         # tom da conversa
/reasoning high             # esforço de raciocínio
/goal "ser meu assistente de produtividade"   # objetivo permanente
```

### Memória (o que ele sabe de você)
Mande no chat, em linguagem natural:
```
Lembre-se: prefiro respostas curtas e em tópicos. Trabalho com IA na saúde.
```

---

## Parte 3 — Automatizar tarefas (agendamentos)

O `/cron` cria tarefas que **rodam sozinhas** e entregam o resultado **no seu chat**.

```
/cron list                                   # ver agendamentos
/cron add 0 9 * * * :: me mande o resumo do dia
/cron add 0 18 * * 5 :: faça o relatório da semana
/cron remove <id>                            # remover
/cron pause <id>                             # pausar
/cron resume <id>                            # retomar
```

A sintaxe é `/cron add <agenda> :: <o que fazer>`. O `::` separa o horário do prompt.

Formato da agenda (`minuto hora dia mês dia-da-semana`):

| Agenda | Quando |
|---|---|
| `0 9 * * *` | todo dia às 9h |
| `0 18 * * 5` | toda sexta às 18h |
| `0 */2 * * *` | a cada 2 horas |

> O gateway precisa estar rodando para os agendamentos dispararem. Veja [Rodar como serviço 24/7](#parte-5--manter-o-bot-sempre-no-ar).

---

## Parte 4 — Dar personalidade (o "funcionário")

Tudo isso agora é feito **pelo chat**, sem editar arquivos.

Defina a identidade (nome, cargo, jeito) com `/soul`:
```
/soul set Você é a Aria, assistente de escritório do Dheiver. Responde sempre em pt-BR, profissional e proativa. Foco: documentos, planilhas, emails e agendamentos.
/soul show
```

Defina regras de trabalho com `/rules`:
```
/rules set Responda sempre em português do Brasil. Seja direto e objetivo.
/rules show
```

Mande `/new` para a nova identidade valer.

### Parâmetros avançados e segredos pelo chat

`/set` grava qualquer valor — e roteia tokens/chaves automaticamente para o `.env`:

```
/set model.context_length 65536        # vai para config.yaml
/set model.base_url http://localhost:11434/v1
/set TELEGRAM_BOT_TOKEN <token>        # vai para o .env (apague a msg depois!)
```

> 🔒 Ao enviar um segredo pelo chat, **apague a mensagem** em seguida — o valor fica no histórico do Telegram. Rode `/restart` para aplicar.

---

## Parte 5 — Manter o bot sempre no ar

Para o bot não morrer ao fechar o terminal:

```bash
./scripts/mangaba-gateway install     # instala como serviço (launchd/systemd)
./scripts/mangaba-gateway status      # ver se está no ar
./scripts/mangaba-gateway restart     # após mudar config
```

Mantenha o **Ollama** rodando (`brew services start ollama` ou o app do Ollama). Para 24/7 sem depender do seu computador, rode o gateway + Ollama num **VPS**.

---

## Referência rápida — comandos no canal

| Comando | Função |
|---|---|
| `/config` | ver configuração |
| `/model` | trocar modelo |
| `/tools` | ligar/desligar ferramentas |
| `/skills` | listar habilidades |
| `/cron` | agendar tarefas |
| `/personality` | tom da conversa |
| `/goal` | objetivo permanente |
| `/new` | nova sessão |
| `/whoami` | seu nível de acesso |
| `/help` | todos os comandos |

---

## Limites com modelo local

Modelos pequenos (`qwen3:4b`, `qwen2.5:7b`) lidam bem com tarefas diretas (conversa, resumo, áudio, um comando). Tarefas agentivas complexas (encadear web + arquivo + sub-agente) pedem um modelo na nuvem — troque com `/model` quando precisar de mais força.
