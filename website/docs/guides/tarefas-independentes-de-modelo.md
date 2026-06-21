---
sidebar_position: 32
title: "Tarefas confiáveis em qualquer modelo"
description: "Como fazer tarefas de baixa, média e alta complexidade funcionarem nos canais independente do modelo — inclusive modelos locais pequenos — usando comandos determinísticos, cron script-only e skills."
---

# Tarefas confiáveis em qualquer modelo

Modelos pequenos (locais, 3B–7B) se atrapalham em tarefas agentivas longas. Mas o Mangaba tem **três mecanismos** que tornam tarefas confiáveis **independente do nome/tamanho do modelo**. Combine-os para que qualquer usuário crie tarefas de qualquer complexidade nos canais.

No chat: `/exemplos confiavel` mostra um resumo disso a qualquer momento.

---

## 1. Comandos determinísticos (`quick_commands`) — zero LLM

Tarefas que rodam um **script fixo** e devolvem a saída direto. **O modelo nem é chamado** — funciona idêntico em qualquer modelo.

No `~/.mangaba/config.yaml`:

```yaml
quick_commands:
  disco:
    type: exec
    command: df -h
  agora:
    type: exec
    command: date "+%d/%m/%Y %H:%M:%S"
  backup:
    type: exec
    command: tar czf ~/backup.tgz ~/projetos && echo "backup ok"
```

No canal: `/disco`, `/agora`, `/backup`. Reinicie o gateway após editar.

> Ideal para: status de sistema, relatórios fixos, scripts utilitários, qualquer coisa repetível.

---

## 2. Cron script-only (`no_agent`) — automação sem LLM

Agendamentos que executam um **script** e entregam o stdout no canal, sem passar pelo modelo. Determinístico e leve.

```bash
mangaba cron create --schedule "0 8 * * *" \
  --script "/home/voce/relatorio.sh" --no-agent --deliver origin
```

> Ideal para: relatórios diários, coletas de dados, backups agendados — sempre iguais, qualquer modelo.

---

## 3. Habilidades (skills) — guiam o modelo passo a passo

Skills trazem um **procedimento escrito**. Em vez de depender da "inteligência" do modelo para planejar, ele segue os passos — o que deixa **até modelos pequenos** muito mais confiáveis em tarefas média/alta.

```
/skills list                 # ver as 89 disponíveis
/skills research             # instalar a de pesquisa
# depois, no chat:
use a skill de pesquisa para investigar <tema> e me dar um resumo com fontes
```

> Ideal para: pesquisa, data-science, devops, email, diagramas — tarefas de média/alta complexidade.

---

## Estratégia por complexidade × modelo

| Complexidade | Modelo pequeno (local) | Modelo grande (nuvem) |
|---|---|---|
| 🟢 Baixa | Direto, ou `quick_commands` | Direto |
| 🟡 Média | **Skill** que guie os passos, ou quebrar em sub-pedidos | Direto |
| 🔴 Alta | `quick_commands`/`cron --no-agent` para a parte fixa + **skill** + dividir em sub-tarefas | Um pedido só (`delegate`, `goal`) |

**Regra prática:** o que é repetível vira **script** (determinístico, qualquer modelo); o que precisa de raciocínio ganha uma **skill** (guia o modelo); o que é único e complexo, **divida em passos** ou use um modelo maior com `/model`.

---

## Trocar de modelo a qualquer hora

Nada acima depende de um modelo específico. Para subir o nível quando precisar:

```
/model openrouter/anthropic/claude-sonnet-4-6   # nuvem, mais potente
/model qwen3:4b                                  # local, leve
```

Os comandos, skills e agendamentos continuam funcionando igual.
