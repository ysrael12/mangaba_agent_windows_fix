---
sidebar_position: 34
title: "Bootstrap com gateway próprio (sem Ollama local)"
description: "Como usar MANGABA_PROVIDER=gateway no bootstrap.sh para apontar o Mangaba Agent para um gateway OpenAI-compatível remoto (ex.: seu pool de modelos Mangaba) em vez de instalar Ollama localmente."
---

# Bootstrap com gateway próprio (sem Ollama local)

## O que mudou

Antes, o [`bootstrap.sh`](https://github.com/dheiver2/mangaba-agent/blob/main/bootstrap.sh)
só sabia provisionar um modelo de um jeito: instalar o [Ollama](https://ollama.com)
e baixar um modelo local (`gemma4:e4b` por padrão). Isso é ótimo para o caso
"clonar e rodar em qualquer máquina", mas não ajudava quem já tem (ou opera)
um **gateway OpenAI-compatível próprio** — por exemplo, um pool de modelos
Mangaba servido por outra máquina e exposto via túnel (ngrok, Cloudflare
Tunnel, etc.), como já é usado internamente pelos templates de dados
(Cívico, Lícia) apontando para `mangaba-vision-q8`.

Agora o `bootstrap.sh` aceita um segundo modo, escolhido por variável de
ambiente, que pula o Ollama por completo e configura o `~/.mangaba/config.yaml`
para falar direto com esse gateway.

## Como usar

```bash
MANGABA_PROVIDER=gateway \
MANGABA_GATEWAY_URL=https://seu-endpoint \
./bootstrap.sh
```

| Variável | Obrigatória | Padrão | O que faz |
|---|---|---|---|
| `MANGABA_PROVIDER` | não | `ollama` | `gateway` pula a instalação/pull do Ollama e usa o endpoint remoto |
| `MANGABA_GATEWAY_URL` | **sim**, se `PROVIDER=gateway` | — | Base URL do gateway (sem o `/v1` — o script adiciona) |
| `MANGABA_GATEWAY_KEY` | não | `x` | API key enviada ao gateway, se ele exigir uma |
| `MANGABA_GATEWAY_MODEL` | não | `mangaba-vision-q8` | Modelo padrão selecionado no `config.yaml` |

Se `MANGABA_PROVIDER=gateway` for passado sem `MANGABA_GATEWAY_URL`, o script
aborta imediatamente com um erro claro — nenhuma URL fica hardcoded no
código, já que um túnel pessoal (ex.: ngrok grátis) não é um endpoint público
multi-tenant e mudaria de host a cada reinício para outra pessoa.

Sem passar `MANGABA_PROVIDER`, o comportamento é **exatamente o mesmo de
antes**: instala Ollama e baixa `gemma4:e4b` (ou o que estiver em
`MANGABA_MODEL`).

## O que é escrito em `~/.mangaba/config.yaml`

No passo "4/5 Config do modelo", em vez do bloco apontando para
`http://localhost:11434/v1` (Ollama), o script grava:

```yaml
model:
  provider: custom
  base_url: https://seu-endpoint/v1
  api_key: x
  default: mangaba-vision-q8
custom_providers:
  - name: mangaba-gateway
    base_url: https://seu-endpoint/v1
    api_key: x
    discover_models: true
    default_model: mangaba-vision-q8
```

Esse é o mesmo formato já documentado em
[Gateway próprio (OpenAI-compatível) com descoberta de modelos](https://github.com/dheiver2/mangaba-agent#gateway-pr%C3%B3prio-openai-compat%C3%ADvel-com-descoberta-de-modelos)
no README — com `discover_models: true`, o dashboard e o `/model` listam os
modelos do pool automaticamente via `GET /v1/models`, sem precisar
cadastrar cada slug manualmente.

O passo "3/5 Ollama + modelo local" é substituído por uma mensagem
informativa ("PROVIDER=gateway — usando ..., modelo padrão ...") e nenhuma
chamada a `ollama`/`brew install ollama`/`curl ... install.sh` acontece.

## Por que o modelo padrão exigido é tool-capable

Ao final do passo 4, o script imprime um aviso:

> Agentes que chamam MCP/ferramentas exigem um modelo tool-capable (ex.:
> `mangaba-vision-q8`). Modelos só-chat (ex.: `mangaba-lite-q4`) servem
> apenas para agentes conversacionais.

Isso reflete um problema real já visto no histórico do projeto: os
templates de dados (Cívico, Lícia) originalmente apontavam para
`mangaba-4b`, que não existia no pool do endpoint, e depois para um modelo
que não emitia `tool_calls` corretamente — quebrando a integração com MCP.
`mangaba-vision-q8` é o modelo confirmado tool-capable no pool atual, por
isso é o padrão de `MANGABA_GATEWAY_MODEL`.

## Por que isso é opt-in, e não o novo padrão

O `bootstrap.sh` precisa funcionar para qualquer pessoa que clone o
repositório, em qualquer máquina, sem depender de infraestrutura de
terceiros. Um gateway pessoal atrás de um túnel (como um ngrok grátis) é:

- de **uma única máquina** — se ela desligar ou dormir, o bootstrap falha;
- **sem URL estável** — túneis grátis trocam de host a cada reinício;
- com **capacidade limitada** — pools locais costumam ter orçamento de
  memória para carregar só 1–2 modelos por vez, trocando os demais sob
  demanda.

Por isso o padrão do `bootstrap.sh` continua sendo Ollama + `gemma4:e4b`
(único modelo, hoje, validado para o requisito de ≥64K de contexto nativo
que o agente exige para chamar ferramentas, rodando em macOS e Linux sem
depender de nenhuma máquina externa). O modo `gateway` existe para quem
**optar conscientemente** por usar um endpoint próprio — geralmente o
próprio mantenedor, ou alguém que já tenha um pool de modelos rodando em
outro lugar.

## Ver também

- [Gateway próprio (OpenAI-compatível)](https://github.com/dheiver2/mangaba-agent#gateway-pr%C3%B3prio-openai-compat%C3%ADvel-com-descoberta-de-modelos) — formato genérico de `custom_providers` no README.
- [Modelo local: escolha pela sua RAM](https://github.com/dheiver2/mangaba-agent#modelo-local-escolha-pela-sua-ram) — tabela de modelos Ollama recomendados por hardware.
- `docs/plans/2026-06-30-mangaba-model-selection-and-bootstrap.md` — spec com a avaliação completa das opções de modelo consideradas (Ollama local vs. gateway remoto vs. modelo HF `DHEIVER/Mangaba-AI-Nordeste-4B`) e a decisão de manter Ollama como padrão.
