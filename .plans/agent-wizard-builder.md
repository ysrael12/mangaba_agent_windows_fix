# Mangaba Agent Builder — Wizard de Slides + Dashboard Pós-Criação

## Overview

Substituir o formulário longo de criação de agente por um padrão de UX em
"slides" (stepper linear imersivo, uma decisão por tela) e, ao concluir, levar
o usuário direto para um dashboard minimalista do agente recém-criado. Perfil
do usuário é implicitamente `dev-admin` — sem telas de permissão.

Decisão de escopo (confirmada com o usuário): **um único profile** (`default`).
Não construímos isolamento multi-agente/multi-profile nesta rodada — os
endpoints de canais, skills e toolsets já são singletons globais no backend
(ver Fase 1) e isso passa a ser o comportamento correto, não uma lacuna.
"Agent ID" no Slide 3 é o nome de exibição do agente default, não a criação de
um novo profile via `api.createProfile`.

Regra geral: a Fase de Wizard (slides 1–9) **não usa dados mockados** — cada
slide grava no backend real assim que confirmado. A Fase 4 (dashboard
pós-criação) começa com dados mockados apenas para validar a estrutura visual
antes de conectar aos dados reais do draft/backend (pedido explícito do
usuário).

---

## Fase 1 — Achados do codebase (resumo)

- Stack: Vite + React 19 + `react-router-dom` v7 + Tailwind v4. Sem
  Redux/Zustand — estado global via Context API; estado de página em
  `useState` local. `@tanstack/react-query` existe mas é usado pontualmente.
- UI kit: pacote interno `@dheiver2/ui` (vendorizado em
  `src/vendor/dheiver2-ui`) — `Button`, `Switch`, `Checkbox`, `Select`,
  `ListItem`, `Spinner`, `Badge`, `Tabs`, `Segmented` — mais um conjunto local
  shadcn-like em `src/components/ui/*` (`card`, `input`, `label`,
  `separator`, `confirm-dialog`).
- Tela atual `/criar` (`CreateAgentPage.tsx`) já é um wizard de 3 passos
  (template → canal → teste) — bem mais simples que os 9 slides do spec, mas
  o padrão `StepDot` é reaproveitável para o novo `SlideWizardLayout`.
- Componentes reaproveitáveis por slide:
  - **Model**: `ModelPickerDialog.tsx` (provider→model, modo standalone) +
    `api.getModelOptions/getChatModels/setProfileModel`.
  - **DryRun / Skill console**: `ChatPage.tsx` — chat via WebSocket
    `/api/chat`, streaming token-a-token, componente isolado reaproveitável.
  - **Identity**: `api.getProfileSoul/updateProfileSoul` já existem.
  - **RAG**: `api.getRagStatus/reindexRag/enableRag` existem mas são
    específicos do crawler de `mangaba.ia.br` — sem upload de arquivo.
  - **Tools**: `SkillsPage.tsx` + `api.getSkills/toggleSkill/getToolsets` +
    `AutoField.tsx` (renderiza `Switch` para booleans).
  - **Channels**: `CreateAgentPage.tsx` já faz Telegram/Discord/WhatsApp/Teams
    (`validateChannel/connectChannel` etc.) + `PlatformsCard.tsx`/`FleetPage`.
- Gaps confirmados por auditoria de backend (`mangaba_cli/web_server.py`,
  `cron/jobs.py`, `plugins/memory/mangaba_rag/`, `tools/mcp_oauth_manager.py`,
  `mangaba_cli/mcp_config.py`):
  1. **RAG upload**: não existe ingestão genérica de documento — o índice é
     único, global, e alimentado só pelo crawler de `mangaba.ia.br`. Sem
     chromadb/faiss/vector-store no repo; o índice atual é TF-IDF + cosseno
     (numpy) em JSON.
  2. **MCP cliente**: `mcp_config.py` já sabe adicionar servidores MCP
     arbitrários (`cmd_mcp_add`), mas só via CLI — zero rotas REST. Nenhum
     preset OAuth para Google Drive/Calendar ou Microsoft 365 existe.
  3. **Cron NL**: `parse_schedule()` (`cron/jobs.py`) só aceita cron 5-campos,
     `"every <duração>"` ou timestamp ISO — nenhuma linguagem natural.
     Não há endpoint de dry-run; validar uma expressão hoje significa criar o
     job de verdade.

---

## Fase 2 — Arquitetura

### A. Estado global — `AgentDraftContext`

Context API + `useReducer` (consistente com o padrão do projeto —
`PageHeaderProvider`/`SystemActions` —, sem adicionar Zustand/Redux).

```ts
type AgentDraft = {
  model_config: { provider: string; model: string };
  identity: { agent_name: string; soul: string };
  knowledge_files: { name: string; status: "pending" | "indexed" | "error" }[];
  internal_tools: Record<string, boolean>;
  skills: SkillDraft[];
  mcp_connections: McpConnectionDraft[];
  heartbeat: { raw_text: string; schedule: CronScheduleDraft | null };
  channels: Record<string, { token?: string; connected: boolean }>;
};
```

Persistido em `sessionStorage` (`mangaba:agent-draft`) só para sobreviver a
refresh de página — não é fonte de verdade: cada slide grava no backend real
ao ser confirmado, o draft é só o estado de navegação da UI.

### B. `SlideWizardLayout`

Container com `currentSlide` (1–9): header com progress dots (reaproveita o
padrão `StepDot` de `CreateAgentPage.tsx`), footer fixo com `Voltar`/`Avançar`.
`Avançar` roda uma validação declarativa por slide (`canAdvance(draft)`) e,
quando o slide grava algo no backend, só habilita após o `await` resolver.

### C. Sequência de slides

| # | Slide | Endpoint real | Situação |
|---|---|---|---|
| 1 | ModelCognitiveSlide | `getModelOptions` + `setProfileModel("default", model)` | existe |
| 2 | DryRunSlide | WebSocket `/api/chat` (via `ChatPage`) | existe |
| 3 | AgentIdentitySlide | `updateProfileSoul("default", soul)` + novo `PUT /api/agent/identity` (display_name) | soul existe; display_name é novo (trivial) |
| 4 | KnowledgeRagSlide | novo `POST /api/rag/upload` (multipart) | não existe — construir |
| 5 | InternalToolsSlide | `getSkills/toggleSkill` + `getToolsets` | existe |
| 6 | SkillsForgeSlide | `ChatPage` isolado (console) + `toggleSkill`/config de skill | existe em boa parte |
| 7 | McpAutomationsSlide | novo `GET/POST/DELETE /api/mcp/servers` (envelopando `mcp_config.py`) | não existe — construir |
| 8 | DynamicHeartbeatSlide | novo parser PT-BR → schedule + `POST /api/cron/jobs?dry_run=true` | não existe — construir |
| 9 | ChannelsSlide | `validateChannel/connectChannel` + WhatsApp/Teams | existe |

### D. Backend necessário (sem mock)

1. **RAG upload** — `POST /api/rag/upload` em `mangaba_cli/web_server.py` +
   `plugins/memory/mangaba_rag/`: multipart (`.txt/.md/.pdf`), extrai texto,
   reaproveita o mesmo esquema TF-IDF+cosseno já usado pelo crawler (sem nova
   dependência pesada). Chunks entram no mesmo índice JSON com
   `source: "upload"`.
2. **MCP** — `GET/POST/DELETE /api/mcp/servers` + `POST
   /api/mcp/servers/{name}/test`, envelopando `mcp_config.py`
   (`cmd_mcp_add`/`_get_mcp_servers`/etc.). V1 é "conectar servidor MCP
   genérico via URL/command"; presets dedicados de Google/Microsoft (OAuth,
   client id/secret, consentimento) ficam para um incremento seguinte —
   registrado aqui para não ser esquecido.
3. **Cron NL→schedule** — parser determinístico (regex, PT-BR) para padrões
   comuns ("todo dia às 9h", "toda segunda-feira às 14h", "a cada 30
   minutos", "amanhã às 10h") convertendo para os 3 formatos que
   `parse_schedule()` já aceita. Adiciona `dry_run: bool` em `POST
   /api/cron/jobs` (ou `/api/cron/validate`) para preview do próximo horário
   sem persistir.

---

## Fase 3 — Plano de implementação (frontend, incremental)

1. `AgentDraftContext` (provider + reducer + persistência em sessionStorage).
2. `SlideWizardLayout` (motor do stepper, navegação, progress dots).
3. Slides 1–4 (`Slide1Model`, `Slide2DryRun`, `Slide3Identity`, `Slide4RAG`) —
   1/2/3 ligam a endpoints existentes; 4 depende do backend de upload (D.1).
4. Slides 5–9 (`Slide5Tools`, `Slide6Skills` split-screen, `Slide7MCP`,
   `Slide8Heartbeat`, `Slide9Channels`) — 7 e 8 dependem de D.2 e D.3.
5. Transição final: `POST` de confirmação → `navigate('/dashboard/agent/:id',
   { replace: true })`.

Revisão pedida ao final de cada sub-passo, como no pedido original.

---

## Fase 4 — Dashboard minimalista pós-criação (o "Aha! moment")

Ao clicar em "Concluir & Deploy" no Slide 9, o roteador leva o usuário para o
dashboard do agente recém-criado. Como o agente acabou de nascer, não há
dados históricos de uso — a UI deve ser extremamente minimalista, focada em
visibilidade das configurações ativas e teste imediato.

### 4.1 Filosofia visual

- Whitespace generoso — margens/paddings amplos, baixa carga cognitiva.
- Sem gráficos vazios — nada de linha/barra zerada; tipografia limpa, ícones,
  contadores simples.
- Foco na ação — destaque visual para "Conversar com o Agente" e status de
  conectividade.

### 4.2 Estrutura do layout (`/dashboard/agent/:id`)

**A. Header (identidade e status)**
- Título grande com o `Agent ID`.
- Badge de status piscante (`🟢 Online e Operante`).
- Botão sutil "Editar Configuração" → volta ao Wizard no Slide 1, carregando
  o estado salvo.

**B. Grid bento minimalista (o DNA do agente)** — no máximo 4 cards, bordas
suaves:
1. **Cérebro** — LLM rodando + primeira linha da Soul (truncada).
2. **Conhecimento (RAG)** — ícone de pasta + contagem de docs indexados.
3. **Músculos (Tools/Skills/MCP)** — contadores (Ferramentas Internas /
   Skills / Conexões MCP).
4. **Canais** — ícones dos canais ativos, link/copiar token rápido.

**C. Painel de ação e observabilidade em tempo real**
- `QuickChatConsole` — chat minimalista embutido para o dev-admin testar o
  agente.
- Ao lado, feed de log ultra-simplificado em tempo real (quando o agente
  evoca uma Skill ou busca no RAG durante a conversa).

### 4.3 Implementação técnica

- `MinimalDashboardLayout.tsx` — wrapper principal (header + bento grid +
  painel de ação).
- `BentoSummaryCard.tsx` — card genérico (ícone + título + valor principal).
- Rota: redirecionamento do fim do Slide 9 usa `navigate('/dashboard/agent/
  ${newAgentId}', { replace: true })` — `replace` evita que "Voltar" do
  navegador devolva ao Slide 9 depois de concluído.

**Primeira entrega (pedida explicitamente):** layout base de
`MinimalDashboardLayout` com dados mockados, para avaliação visual antes de
conectar aos estados reais do Wizard/backend.

---

## Ordem de rollout sugerida

1. Fase 4 — layout visual mockado (validação de UX antes de tudo, feito
   agora).
2. Fase 3 passo 1–2 — `AgentDraftContext` + `SlideWizardLayout`.
3. Fase 3 passo 3 — Slides 1/2/3 (endpoints já existentes).
4. Backend D.1 (RAG upload) → Slide 4.
5. Fase 3 passo 4 parte 1 — Slide 5, 6, 9 (endpoints já existentes).
6. Backend D.2 (MCP REST) → Slide 7.
7. Backend D.3 (cron NL + dry-run) → Slide 8.
8. Conectar `MinimalDashboardLayout` aos dados reais + botão "Editar" voltando
   ao Wizard com estado carregado.
