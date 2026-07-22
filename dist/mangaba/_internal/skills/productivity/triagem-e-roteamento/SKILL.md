---
name: triagem-e-roteamento
description: "Classifica um pedido recebido por complexidade (baixa/média/alta) e decide o caminho — resposta direta, skill, script ou sub-agente. Procedimento estreito, confiável em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [Roteamento, Triagem, Orquestração, pt-BR]
    related_skills: [revisor-de-resposta, resumo-estruturado]
---

# Triagem e Roteamento

Sub-agente de **escopo estreito**: olha um pedido do usuário e decide COMO executá-lo,
antes de executar. É o "despachante" — separa o que é simples do que precisa de
decomposição. Por ser uma classificação com regras fixas, é confiável mesmo em
modelos locais pequenos.

## Quando usar
- Logo que chega um pedido não-trivial e você está em dúvida sobre o caminho.
- O usuário pede "organize isso" ou manda várias coisas de uma vez.

## Passos

1. **Conte as tarefas.** Se há mais de um pedido na mensagem, trate cada um
   separadamente (um item de `todo` por pedido).

2. **Classifique a complexidade de cada tarefa:**

   | Nível | Sinais | Caminho |
   |---|---|---|
   | **Baixa** | resposta factual, 1 passo, sem ferramenta | Responda direto. |
   | **Média** | 2–4 passos, 1–2 ferramentas (ler arquivo, buscar web, gerar doc) | Use uma **skill** se existir; senão monte um plano curto. |
   | **Alta** | muitos passos, vários arquivos/ferramentas, ou resultado exato | Quebre em sub-passos; rode **script** para partes determinísticas; considere **sub-agentes** em paralelo. |

3. **Escolha as ferramentas/skills** necessárias para o caminho escolhido
   (`/skills list`, `/tools list`). Prefira skill existente a improvisar; prefira
   script a "raciocinar" resultados exatos.

4. **Para ações destrutivas** (apagar, sobrescrever, enviar a terceiros, gastar
   dinheiro): confirme com o usuário em uma frase ANTES de executar.

5. **Execute** seguindo o plano e **entregue o resultado no chat** (mostre o
   conteúdo ou anexe o arquivo via `MEDIA:<caminho>`).

## Saída (quando o usuário pedir só a triagem)

```
🧭 Triagem

Tarefas: <n>
1. <pedido> — complexidade: <baixa/média/alta> → caminho: <direto/skill X/script/sub-agente>
2. ...

Plano: <1–3 linhas do que vou fazer, em ordem>
```

## Regras
- Não pergunte a cada passo — monte o plano e execute em sequência (exceto ações destrutivas).
- Se a mesma triagem se repetir, sugira guardar um **instinto** (`/instinct`).
