# Dashboard + Sidebar + Seletor de Ferramentas — Spec de melhorias de UI

## Overview

O wizard de criação (`/criar`, 10 slides) já coleta todas as "dimensões" de um
agente — engine cognitivo, identidade, RAG, ferramentas internas, skills, MCP,
heartbeat, canais — e persiste tudo via `AgentDraft`
(`web/src/contexts/agent-draft-context.ts`). Só que, depois de criado, o
agente vira uma caixa-preta na UI do dia a dia:

- **Dashboard** (`AgentDashboardPage.tsx` + `MinimalDashboardLayout.tsx`) só
  mostra contagens agregadas (`internalToolsCount`, `skillsCount`,
  `mcpConnectionsCount`) — nenhuma quebra por dimensão, nenhum link direto
  para editar o que gerou aquele número.
- **Sidebar** (`AppSidebar.tsx`, seções definidas em `App.tsx`) tem só duas
  entradas de configuração genéricas ("Capacidades" → `/skills`,
  "Configurações" → `/configuracoes`) — nada mapeia 1:1 para as dimensões do
  wizard (RAG, MCP, heartbeat, canais ficam soltos ou inexistentes fora do
  onboarding).
- **Ferramentas internas** só têm toggle individual (`Slide5Tools`,
  `SkillsPage`) via `GET /api/tools/toolsets` — não existe ação em lote
  ("ativar tudo" / "setup mínimo") nem no backend nem no client.

Esta spec cobre as três melhorias pedidas. Não inclui mudanças no motor
multi-agente (ver `.plans/multi-agent-wizard.md` para isso).

---

## 1. Dashboard — expor as dimensões, não só contagens

**Hoje:** `MinimalDashboardLayout.tsx` renderiza um grid de bento cards com
label + número (ex: "4 ferramentas ativas"). O card não diz *quais*, nem
linka pra tela onde isso foi configurado.

**Proposta:**
- Cada card de dimensão vira clicável e leva à seção correspondente da
  Configurações (ver item 2) ou abre um popover/drawer com o detalhe (ex.:
  card "Ferramentas" mostra a lista de toolsets ativos ao expandir, sem sair
  da página).
- Adicionar cards/seções que hoje não aparecem no dashboard mas existem no
  draft: **Dry-run status** (última execução de teste, `Slide2DryRun`),
  **Heartbeat** (próxima execução agendada, `Slide8Heartbeat` /
  `GET /api/cron` ou equivalente), **Canais conectados** (quais, não só
  contagem — `Slide9Channels`).
- Fonte de dados: reaproveitar os endpoints já usados
  (`getModelInfo`, `getRagFiles`, `getSkills`, `getToolsets`,
  `listMcpServers`, `getChannelsStatus`) — sem endpoint agregado novo
  necessário para o v1. Se a página começar a disparar chamadas demais,
  considerar um `GET /api/dashboard/summary` que agrega no backend (v2).

**Arquivos:** `web/src/pages/AgentDashboardPage.tsx`,
`web/src/components/dashboard/MinimalDashboardLayout.tsx`.

---

## 2. Sidebar — seção "Configurar" por dimensão

**Hoje:** seção "Configurar" tem só "Capacidades" (`/skills`) e
"Configurações" (`/configuracoes`, uma página monolítica com model picker +
OAuth + tema, sem RAG/MCP/heartbeat/canais).

**Proposta:** desdobrar a seção "Configurar" em itens 1:1 com as dimensões do
`AgentDraft`, cada um abrindo a aba correspondente dentro de
`SimpleSettings.tsx` (usar tabs/anchors internos, não páginas novas, pra não
fragmentar navegação):

| Item da sidebar | Dimensão (`AgentDraft`) | Config atual |
|---|---|---|
| Motor cognitivo | `model_config` | já existe em SimpleSettings |
| Identidade / Soul | `identity` | não existe fora do wizard |
| Base de conhecimento (RAG) | `knowledge_files` | não existe fora do wizard |
| Ferramentas | `internal_tools` | `Slide5Tools` / `SkillsPage`, sem home fora do onboarding |
| Skills | `skills` | `/skills` (já existe) |
| Conexões MCP | `mcp_connections` | `Slide7MCP`, sem home fora do onboarding |
| Automação (heartbeat) | `heartbeat` | existe parcialmente em "Agendamentos" |
| Canais | `channels` | `Slide9Channels`, sem home fora do onboarding |

Regra: nada de duplicar lógica do wizard — os componentes de slide devem
virar componentes reutilizáveis (ex.: `Slide4RAG` e um futuro
`RagSettingsPanel` compartilham o mesmo formulário), consumidos tanto pelo
onboarding quanto pela tela de configurações.

**Arquivos:** `web/src/App.tsx` (rotas/seções), `web/src/components/AppSidebar.tsx`,
`web/src/pages/SimpleSettings.tsx` (vira tabbed), componentes de slide
(extrair form de cada um para reuso).

---

## 3. Seletor de ferramentas internas — "ativar tudo" / "setup mínimo"

**Hoje:** `GET /api/tools/toolsets` retorna a lista com `enabled` por
toolset; toggle é individual. Não existe endpoint de toggle em lote — só
`disabled_toolsets` em `config.yaml` (`agent.disabled_toolsets`, lido em
`tools_config.py:1333-1340`), sem PATCH exposto.

**Proposta:**
- **Backend:** novo endpoint `PATCH /api/tools/toolsets` aceitando
  `{ enabled: string[] }` ou uma ação `{ preset: "all" | "minimal" }`, que
  escreve `agent.disabled_toolsets` em `config.yaml` (inverso do enabled).
  Definir "minimal" como um preset fixo no backend (ex.: só toolsets sem
  `configured` pendente / sem custo de API externa) — não fica sujeito à UI.
- **Frontend:** em `Slide5Tools.tsx` e na nova aba de Ferramentas em
  Settings, adicionar dois botões acima da lista: "Ativar tudo" e "Setup
  mínimo", que chamam o novo endpoint e re-fetcham `getToolsets()`.
- Manter o toggle individual como está — os botões só são atalhos que setam
  o conjunto inteiro de uma vez.

**Arquivos:** `mangaba_cli/web_server.py` (endpoint, perto da linha 5363),
`mangaba_cli/tools_config.py` (helper de preset "minimal"),
`web/src/lib/api.ts` (novo client method), `web/src/components/wizard/slides/Slide5Tools.tsx`,
nova aba de Ferramentas em Settings.

---

## Ordem sugerida de execução

1. Extrair os forms dos slides de RAG/MCP/Canais/Heartbeat para componentes
   reutilizáveis (pré-requisito do item 2).
2. Sidebar + Settings em abas (item 2) — maior valor de navegação, destrava o
   resto.
3. Seletor de ferramentas em lote (item 3) — backend + frontend, unidade
   isolada, pode ser feito em paralelo com o item 2.
4. Dashboard com drill-down (item 1) — depende dos links do item 2 existirem
   para o "clique no card leva pra configuração" funcionar.

## Fora de escopo

- Multi-agente / múltiplos profiles (já coberto por
  `.plans/multi-agent-wizard.md`).
- Novo endpoint agregado de dashboard (`/api/dashboard/summary`) — só se v1
  mostrar problema de performance.
