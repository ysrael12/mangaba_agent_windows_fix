# Multi-Agent Wizard — Destravar a criação de N agentes isolados

## Overview

Hoje o **Agent Builder** (wizard de 10 slides em `/criar`) configura sempre um
**único agente**: o profile `default`, que mora na raiz `~/.mangaba`. Cada slide
grava no backend real, mas todos os writes vão para o mesmo home global. "Criar
Novo Agente" na tela final não cria um agente novo — ele dá `reset()` no draft e
**reconfigura/sobrescreve o mesmo `default`**.

Esta spec descreve o trabalho para transformar o wizard num criador de **N
agentes isolados**, sem reescrever o produto: o motor multi-agente (profiles +
Fleet + gateways independentes) **já existe e funciona** no backend — falta o
wizard usá-lo.

> Esta spec sucede e complementa `.plans/agent-wizard-builder.md`, que
> deliberadamente escolheu "um único profile (`default`)" no primeiro corte. O
> objetivo agora é levantar essa restrição de escopo.

---

## Diagnóstico — o que já existe vs. o que falta

### Já pronto (verificado em runtime, ver Anexo A)

- **Profiles são pastas auto-contidas.** `mangaba_cli/profiles.py::get_profile_dir`:
  - `default` → `~/.mangaba` (a própria raiz).
  - `<nome>` → `~/.mangaba/profiles/<nome>/`, cada um com o seu `config.yaml`,
    `.env`, `SOUL.md` e `skills/`.
- **CRUD de profiles via REST:** `POST/GET/PATCH/DELETE /api/profiles`
  (`web_server.py:4449+`). `create_profile(clone_from="default")` clona a raiz.
- **Fleet enxerga qualquer profile automaticamente** — `GET /api/fleet`
  (`web_server.py:819`) só varre `profiles/`. `POST /api/fleet/{name}/{action}`
  sobe/derruba um **gateway por profile** (processo isolado).
- **Endpoints por-profile que já funcionam:** `soul`, `model`, `teams`
  (`web_server.py:4582–4737`).
- **Persistência é 100% arquivos** sob `~/.mangaba` (config.yaml / .env /
  SOUL.md / índice RAG JSON / cron/jobs.json). SQLite só guarda histórico
  (sessões, traces, kanban) — fora do fluxo de criação.

### O que falta

1. **Frontend:** o wizard nunca chama `api.createProfile`. O identificador está
   fixo — `const AGENT_ID = "default"` em `Slide3Identity.tsx` e
   `AgentWizardPage.tsx`.
2. **Backend:** 6 endpoints do wizard são **globais** (escrevem sempre no home
   ativo) e não aceitam dimensão de profile: identity, RAG, skills toggle,
   skills forge, MCP, e os canais Telegram/Discord/WhatsApp.

---

## Objetivo e escopo

**Objetivo:** ao concluir o wizard, nasce um profile novo, isolado, visível na
Fleet e ligável independentemente — sem afetar os demais agentes.

**Fora de escopo (por ora):**
- UI de gerenciamento avançado de N agentes além do que a Fleet já oferece.
- Multi-tenancy de clientes (white-label `/api/clients/*` já é outro eixo).
- Migração de dados históricos entre profiles.

**Decisão de nomenclatura:** o "Nome do agente" do Slide 4 (`display_name`)
continua sendo rótulo de exibição. O **profile id** (slug em disco) é derivado
dele (`slugify`) ou gerado, e é o que trafega nos endpoints. Um não substitui o
outro.

---

## Arquitetura da mudança — 3 camadas

### Camada A — Endpoints que **já são** por-profile (só trocar o argumento)

O wizard só precisa parar de mandar `"default"` e passar o profile id do draft.

| Slide | Endpoint (existe hoje) |
|-------|------------------------|
| 1 · Modelo | `PUT /api/profiles/{name}/model` |
| 4 · Soul | `PUT /api/profiles/{name}/soul` |
| 9 · Heartbeat | `createCronJob(..., profile)` (o param já existe, default `"default"`) |
| 10 · Teams | `POST /api/profiles/{name}/teams/connect` (1 bot/porta por agente) |

### Camada B — Endpoints **globais** que ganham dimensão de profile

Trabalho de backend. O **padrão de referência já existe** em
`set_profile_model` (`web_server.py:4625`): resolve `_resolve_profile_dir(name)
/ "config.yaml"` e edita preservando o resto. Replicar esse padrão:

| Slide | Endpoint atual (global) | Mudança |
|-------|-------------------------|---------|
| 4 · Identity | `PUT /api/agent/identity` → `config.yaml` da raiz (`:1807`) | aceitar `?profile=`; gravar `agent.display_name` no `config.yaml` do profile |
| 5 · RAG | `/api/rag/*` → índice único global (`:1663+`) | namespaçar o índice por profile (`profiles/<name>/rag/`); `_load_rag_module` recebe `home` |
| 6 · Tools | `/api/skills/toggle` → `get_disabled_skills(config)` global (`:5143`) | ler/gravar no `config.yaml` do profile |
| 7 · Forge | `/api/skills/forge` → `$MANGABA_HOME/skills/<slug>/` (`:5195`) | escrever em `profiles/<name>/skills/` |
| 8 · MCP | `/api/mcp/servers` → `mcp_config` global (`:5313+`) | envolver `_get_mcp_servers`/`_save_mcp_server` com o home do profile |
| 10 · Canais | `save_env_value(...)` → `.env` da raiz (`:4822`) | gravar no `.env` do profile (o Teams por-profile já mostra o padrão) |

**Contrato de API sugerido:** cada endpoint aceita `?profile=<name>` opcional,
default `"default"` (retrocompatível). Internamente, resolver
`home = get_profile_dir(profile)` e passar esse `Path` às funções de baixo nível
(`get_disabled_skills(config, home)`, `_get_mcp_servers(home)`, etc.), que hoje
assumem o global.

### Camada C — Frontend: alocar e carregar o profile

1. **Alocar cedo.** No início do wizard (Slide 1, ou um passo 0 silencioso),
   criar o agente:
   `const { name } = await api.createProfile({ name: slug, clone_from_default: true })`.
   Guardar em `AgentDraft.agent_id` (`agent-draft-context.ts`).
2. **Derivar o slug** do nome digitado no Slide 4 (`slugify(display_name)`), com
   fallback para um id gerado; validar contra `validate_profile_name` (o backend
   já rejeita nomes reservados/ inválidos).
3. **Trocar `AGENT_ID = "default"`** por `draft.agent_id` em `Slide3Identity.tsx`,
   `AgentWizardPage.tsx` e em toda chamada dos slides.
4. **Passar `agent_id`** em cada request dos slides (Camada A direto; Camada B
   via `?profile=`).
5. **Fim do wizard:** `navigate('/dashboard/agent/${draft.agent_id}')` (o código
   já usa a variável — hoje ela é sempre `"default"`).
6. **"Criar Novo Agente"** deixa de dar `reset()` que sobrescreve — aloca um novo
   slug e recomeça o draft.

---

## Modelo de dados / persistência

Nada de banco novo. Um agente = um diretório:

```
~/.mangaba/                          ← profile "default" (agente raiz)
~/.mangaba/profiles/<slug>/
├── config.yaml                      ← model, agent.display_name, skills desabilitadas, auxiliary, mcp
├── .env                             ← tokens de canais + chaves de API do agente
├── SOUL.md                          ← system prompt mestre
├── skills/<slug>/SKILL.md           ← skills forjadas + instaladas do ClawHub
└── rag/                             ← (novo) índice TF-IDF JSON por profile
```

`create_profile(clone_from="default")` já materializa `config.yaml`, `.env`,
`SOUL.md` e `skills/` copiando do default. Só o diretório `rag/` por profile é
novo (Camada B, RAG).

---

## Compatibilidade e migração

- **Retrocompatível por construção.** `?profile=` default `"default"` → todo
  cliente/uso atual continua escrevendo na raiz como hoje.
- **Sem migração de dados.** O `default` existente permanece o agente raiz. Novos
  agentes nascem em `profiles/`.
- **Gateways:** cada profile ganha o seu gateway sob demanda via
  `POST /api/fleet/{name}/start`. Portas de canal (ex.: Teams base 3978) já são
  alocadas sem colisão por `_alloc_teams_port`.

---

## Plano de rollout incremental

Cada passo é entregável e revisável isoladamente (segue o padrão do
`agent-wizard-builder.md`).

1. **Camada C + A (MVP multi-agente).** Wizard aloca profile via `createProfile`
   e roteia **modelo, soul, cron, teams** para ele. Já entrega agentes de verdade
   isolados (o "DNA" essencial), sem tocar em RAG/MCP/skills globais.
   *Critério:* concluir o wizard cria `profiles/<slug>/`, visível na Fleet, com
   modelo/soul próprios; `default` intacto.
2. **Camada B — identity + skills toggle.** Padrão `set_profile_model` copiado
   (baixo risco, só `config.yaml`).
3. **Camada B — canais (Telegram/Discord/WhatsApp).** `.env` por profile +
   restart do gateway daquele profile (não do global).
4. **Camada B — skills forge.** `skills/` por profile.
5. **Camada B — MCP.** Envolver `mcp_config` com o home do profile.
6. **Camada B — RAG.** Índice namespaçado por profile (maior esforço: extrair o
   home do `mangaba_rag`).
7. **Polish.** Dashboard pós-criação lendo dados reais do profile;
   "Criar Novo Agente" alocando slug novo; edição volta ao wizard carregando o
   profile.

---

## Riscos e decisões em aberto

- **Colisão de slug.** Dois agentes com o mesmo nome de exibição. Mitigar com
  sufixo incremental (`vendas-2`) e checagem `profile_exists` antes de criar.
- **Agente órfão.** Se o usuário abandona o wizard após `createProfile`, fica um
  profile vazio. Mitigar: criar o profile só no primeiro write real (lazy), ou
  varredura de profiles sem `SOUL.md`/config para limpeza.
- **`.env` por profile vs. chaves compartilhadas.** Decidir se chaves de API
  (OpenAI etc.) são herdadas do `default` ou reconfiguradas por agente. Sugestão:
  herdar do global como fallback, permitir override no `.env` do profile.
- **RAG namespacing** é o item de maior esforço — o `mangaba_rag` assume índice
  único. Fica por último de propósito.
- **Custo de gateway por agente.** N agentes = N processos gateway. A Fleet já
  gerencia start/stop; definir política de auto-start (hoje default é ligar).

---

## Critérios de aceite

1. Concluir o wizard com nome "Assistente Comercial" cria
   `~/.mangaba/profiles/assistente-comercial/` com `config.yaml`, `SOUL.md`
   e `.env` próprios.
2. `GET /api/fleet` lista o novo agente; `default` e demais permanecem
   inalterados (modelo/soul intactos — ver Anexo A, prova de isolamento).
3. Cada slide (modelo, soul, RAG, tools, skills, MCP, cron, canais) escreve **no
   diretório do profile**, não na raiz.
4. Requests sem `?profile=` continuam escrevendo no `default` (retrocompat).
5. `POST /api/fleet/<slug>/start` sobe um gateway isolado para o novo agente.

---

## Anexo A — Prova de conceito executada (2026-07-08)

Dashboard subido (`mangaba dashboard --skip-build --no-gateway`,
`http://127.0.0.1:9119`). Via API, criado um profile de teste `vendas` clonando
o `default`, configurado modelo + soul isolados, confirmado na Fleet, e removido:

```
POST /api/profiles {name:"vendas", clone_from_default:true}  → ok, profiles/vendas
PUT  /api/profiles/vendas/soul                               → ok (SOUL.md isolado)
PUT  /api/profiles/vendas/model {model:"llama3.1:8b"}        → ok

GET /api/fleet:
  default   model=gemma4:e4b     path=~/.mangaba              (raiz)
  a         model=None           path=~/.mangaba/profiles/a
  vendas    model=llama3.1:8b    path=~/.mangaba/profiles/vendas   ← isolado

Disco  profiles/vendas/config.yaml → model.default: llama3.1:8b
Disco  profiles/vendas/SOUL.md     → "Voce e um assistente comercial..."
Isolamento GET /api/profiles/default/model → gemma4:e4b (intacto)

DELETE /api/profiles/vendas → ok  (Fleet volta a 2)
```

Conclusão: a fundação multi-agente (profiles isolados + Fleet + gateways) está
pronta e funcional. O trabalho desta spec é **Camada C** (wizard chamar
`createProfile` e parar de fixar `"default"`) + **Camada B** (6 endpoints globais
ganharem `?profile=`, replicando o padrão de `set_profile_model`).
