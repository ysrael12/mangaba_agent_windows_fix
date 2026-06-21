---
sidebar_position: 31
title: "Catálogo de tarefas por complexidade"
description: "O que pedir ao agente nos canais — tarefas de baixa, média e alta complexidade usando todos os recursos do repositório (ferramentas, skills, cron, sub-agentes)."
---

# Catálogo de tarefas por complexidade

Este catálogo mostra **o que o usuário pode pedir ao agente direto no canal** (Telegram, Discord…), usando todos os recursos do Mangaba: 81+ ferramentas, 89+ habilidades, agendamento, sub-agentes e mais.

> No chat, digite `/exemplos`, `/exemplos baixa`, `/exemplos media` ou `/exemplos alta` para ver esta lista a qualquer momento.

---

## 🟢 Baixa complexidade

Uma ação, resposta direta. Funciona bem até com modelo local pequeno.

| Tarefa | Como pedir | Recurso |
|---|---|---|
| Resumir texto | `resuma este texto: <texto>` | LLM |
| Traduzir | `traduza para inglês: <frase>` | LLM |
| Entender áudio | mande uma **mensagem de voz** | transcrição (Whisper) |
| Criar arquivo | `crie notas.txt com minha lista` | `file_tools` |
| Rodar comando | `rode: df -h e explique` | `terminal` |
| Ler PDF | `leia documento.pdf e diga o total` | `code_execution` + pypdf |
| Lembrete agendado | `/cron add 0 8 * * * :: bom dia com 3 prioridades` | `cron` |

---

## 🟡 Média complexidade

Duas ou três ferramentas encadeadas, ou uma habilidade. Pede um modelo decente (`qwen2.5:7b` ou nuvem).

| Tarefa | Como pedir | Recursos |
|---|---|---|
| Pesquisar + resumir + salvar | `pesquise notícias de IA hoje, resuma e salve em noticias.md` | `web_tools` + `file_tools` |
| Analisar dados | `leia vendas.csv, some por mês e gere um resumo` | `code_execution` |
| Analisar imagem | `descreva esta imagem` (+ foto) | `vision` |
| Gerar planilha | `gere uma planilha de orçamento de 12 meses` | `code_execution` |
| Briefing agendado | `/cron add 0 9 * * 1 :: monte meu plano da semana` | `cron` |
| Usar habilidade | `/skills research` e depois peça a pesquisa | `skills` |

---

## 🔴 Alta complexidade

Múltiplas etapas, sub-agentes paralelos, habilidades combinadas, trabalho de fundo. **Rende muito mais com modelo na nuvem** (`/model openrouter/...`).

| Tarefa | Como pedir | Recursos |
|---|---|---|
| Delegar em paralelo | `delegue a sub-agentes: 1) pesquisar X, 2) resumir, 3) prós/contras — junte no final` | `delegate_tool` |
| Pesquisa profunda | `faça uma pesquisa profunda sobre <tema> com fontes e conclusão` | `web_tools` + skill `research` |
| Objetivo contínuo | `/goal ser meu assistente de produtividade` | `goal` |
| Quadro de projeto | `monte um kanban do projeto e me atualize o progresso` | `kanban_tools` |
| Tarefa longa em fundo | `/background <tarefa longa>` | background runner |
| Relatório recorrente | `/cron add 0 18 * * 5 :: gere o relatório semanal e me envie` | `cron` + entrega no canal |
| Combinar modelos | `use mistura de agentes para revisar este plano` | `mixture_of_agents_tool` |

---

## Dicas para tirar o máximo

- **Descubra os recursos no chat:** `/tools list` (ferramentas) e `/skills list` (habilidades).
- **Suba o nível do modelo para tarefas difíceis:** `/model openrouter/anthropic/claude-sonnet-4-6`.
- **Automatize o que repete:** transforme qualquer tarefa acima em `/cron` para rodar sozinha.
- **Combine:** uma tarefa de alta complexidade costuma ser várias de baixa/média encadeadas — descreva o objetivo final e deixe o agente orquestrar.
