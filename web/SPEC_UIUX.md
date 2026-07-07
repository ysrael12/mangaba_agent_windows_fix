# SPEC: Interface Perfeita (Modo Simples + Dev)

> Baseada na análise `ui-ux.md` e no estado real do código.
> **Objetivo:** Discussão e acordo antes da implementação.

---

## 0. Diagnóstico: Proposta vs Realidade

| ui-ux.md diz | Realidade | Impacto |
|---|---|---|
| "RoleSwitcher já existe" | `RoleSwitcher.tsx` **não existe** | Criar do zero |
| "RouteGuard já existe" | `RouteGuard.tsx` **não existe** | Criar do zero |
| "ChatPage precisa de Markdown" | `ChatPage.tsx` **não existe** — chat é via PTY/WebSocket (`xterm.js`) | Melhorias vão no terminal, não em React |
| "HomePage tem AgentStatus" | `HomePage.tsx` **não existe** — `/` redireciona para `/criar` (wizard) | Criar HomePage do zero |
| "OnboardingChecklist existe" | `OnboardingChecklist.tsx` **não existe** | Criar do zero |
| "EnvPage separada" | Env vars já estão dentro do `ConfigPage` (categoria `__env__`) | Reconciliar: manter integrado ou separar? |
| "userRole deve virar simples/dev" | Stub tem `"simples"`; **teste espera** `operador/gestor/dev` | Proposta: manter 3 roles internamente, UI mostra só 2 |
| "NavItem tem minRole" | `NavItem` **não tem** `minRole` | Adicionar campo |
| "Route minRole existe" | `buildRoutes()` **não tem** role gating | Adicionar `RouteGuard` |
| "Sidebar é componente separado" | Sidebar é **inline em App.tsx** (862 linhas) | Extrair para componente próprio |
| "23 itens na sidebar" | Hoje são **10 itens** em `BUILTIN_NAV_REST` | Número menor, mas ainda excessivo |

---

## 1. UserRole — Proposta de Implementação

### 1.1 Decisão: 3 roles internamente, 2 na UI

Manter `operador | gestor | dev` internamente (preserva o teste existente em `userRole.test.ts`). O `RoleSwitcher` mostra apenas **"Simples"** (mapeia operador+gestor) e **"Dev"** (mapeia dev).

```typescript
// src/lib/userRole.ts
export type UserRole = "operador" | "gestor" | "dev";
export const ROLE_META = {
  operador: { label: "Simples", rank: 0, hint: "Uso diário" },
  gestor:   { label: "Simples", rank: 1, hint: "Uso diário" },
  dev:      { label: "Dev",     rank: 2, hint: "Acesso completo" },
};
export const ROLE_ORDER: UserRole[] = ["operador", "gestor", "dev"];

export function getRole(): UserRole;
export function setRole(role: UserRole): void;  // localStorage + evento
export function canSee(active: UserRole, min?: UserRole): boolean;
export function useUserRole(): [UserRole, (r: UserRole) => void];
```

- `getRole()` lê `localStorage("mangaba-perfil")`; default `"operador"`
- `setRole()` persiste + dispara `window.dispatchEvent(new Event("mangaba:role-change"))`
- `canSee()` compara ranks: `ROLE_META[active].rank >= ROLE_META[min].rank`
- O hook `useUserRole()` escuta `mangaba:role-change` para re-render reativo

### 1.2 NavItem + minRole

```typescript
// App.tsx
interface NavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  labelKey?: string;
  path: string;
  section?: string;
  minRole?: UserRole;  // NOVO — default "operador" se omitido
}
```

### 1.3 Distribuição de abas (espelho do teste: 5/12/24)

| minRole | Abas | Itens |
|---------|------|-------|
| `operador` | Início, Chat, Sessões, Análise, Exemplos | **5** |
| `gestor` | + Criar agente, Perfis, Roteamento, Frota, Teams, Agendamentos, Kanban | **+7 = 12** |
| `dev` | + Setup, Docs, Modelos, Chaves, Habilidades, Plugins, Memória, Clientes, Sessões Globais, Observabilidade, Logs, Configuração | **+12 = 24** |

**Na UI (RoleSwitcher):**
- "Simples" → `operador` + `gestor` (12 abas)
- "Dev" → `dev` (24 abas)

---

## 2. RoleSwitcher (NOVO componente)

`web/src/components/RoleSwitcher.tsx`

```
┌──────────────────────┐
│ Perfil: [Simples ▾] │
└──────────────────────┘

Dropdown:
┌──────────────────────┐
│ ● Simples            │  "Uso diário"
│ ○ Dev                │  "Acesso completo"
└──────────────────────┘
```

- Posicionado na sidebar, abaixo da busca, acima da navegação
- Usa `useUserRole()` para estado + setter
- "Simples" = setRole("operador"), "Dev" = setRole("dev")
- Tooltip/hint embaixo do label ativo
- Salva em `localStorage("mangaba-perfil")`

### Se operador vs gestor?

Quando `simples` está ativo, o usuário vê abas `operador` + `gestor`. Internamente o sistema escolhe `gestor` se já era `gestor` antes, senão `operador`. Para 99% dos usuários a diferença não importa — o seletor interno é transparente.

---

## 3. RouteGuard (NOVO componente)

`web/src/components/RouteGuard.tsx`

- Props: `minRole: UserRole`, `children: ReactNode`
- Lê o role ativo via `useUserRole()`
- Se `canSee(activeRole, minRole)` for `false`, mostra:

```
┌─────────────────────────────────┐
│ 🔒 Acesso restrito              │
│                                  │
│ Esta página requer o modo Dev.   │
│ Troque seu perfil no menu        │
│ lateral para acessar.            │
│                                  │
│ [Trocar para Dev]                │
└─────────────────────────────────┘
```

- Botão "Trocar para Dev" chama `setRole("dev")`
- Guard é usado em `buildRoutes()` para todas as rotas que tenham `minRole` definido

---

## 4. Sidebar — Extrair para componente

**Problema:** Sidebar é 155 linhas inline em `App.tsx` (468-623), misturada com lógica de roteamento.

**Ação:** Extrair `<AppSidebar>` para `web/src/components/AppSidebar.tsx`

Props:
```typescript
interface AppSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  navItems: { coreItems: NavItem[]; pluginItems: NavItem[] };
}
```

**O que muda na sidebar extraída:**
- Adicionar `<RoleSwitcher />` entre a busca e a navegação
- Filtrar `coreItems` por `canSee(activeRole, item.minRole)`
- Se role = "simples" e houver itens ocultos, mostrar "Mais opções..." no final
- "Mais opções..." abre modal explicando que precisa trocar para Dev (com botão de ação)

---

## 5. HomePage (NOVO componente)

`web/src/pages/HomePage.tsx` — rota `/home`

**Wireframe (modo simples):**
```
┌────────────────────────────────────────────────────────────┐
│ 🎉 Primeiros passos                          3 de 6        │
│ ████████░░░░░░░░░░░░░░░░░░░░░░                             │
│                                                             │
│ ☐ Converse com o agente     → [Abrir Chat]                 │
│ ☐ Conecte um canal          → Telegram, WhatsApp...         │
│ ☐ Crie um agente            → Personalidade própria         │
│ ☐ Crie uma tarefa           → Kanban                       │
│ ☐ Configurar provedor       → Chave de API                 │
│ ☐ Pronto!                   → 🎉                           │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐                   │
│ │ 💬 Chat          │  │ 📋 Minhas Sessões│                  │
│ │ Converse agora   │  │ Histórico       │                   │
│ │ [Abrir Chat]     │  │ [Ver Tudo]      │                   │
│ └─────────────────┘  └─────────────────┘                   │
└────────────────────────────────────────────────────────────┘
```

**O que exibir por role:**
- `operador`/`gestor` (Simples): OnboardingChecklist como hero + cards Chat + Sessões
- `dev`: OnboardingChecklist + cards Chat + Sessões + "Configurações avançadas" (atalhos para /config, /models, /env, /skills)

**Implementação:**
- `minRole: "operador"` na rota `/home`
- Adicionar a `BUILTIN_ROUTES_CORE`
- `RootRedirect` (`/`) → redirecionar para `/home` em vez de `/criar`

---

## 6. OnboardingChecklist (NOVO componente)

`web/src/components/OnboardingChecklist.tsx`

- Estado salvo em `localStorage("mangaba:onboarding")`
- 6 passos, cada um com verificação automática:
  1. "Converse com o agente" — detecta se alguma sessão foi criada
  2. "Conecte um canal" — detecta gateway config (telegram, whatsapp etc)
  3. "Crie um agente" — detecta se há mais de 1 perfil
  4. "Crie uma tarefa" — detecta se há tarefas no kanban
  5. "Configurar provedor" — detecta se há API key configurada
  6. "Pronto!" — todos os anteriores completos
- Barra de progresso no topo
- Cada passo: checkbox + label + ação (botão "Abrir/Acessar/Configurar")
- Uma vez completo (6/6), mostra parabéns + esconde "Por que usar" da Home
- Passos com verificação automática (já feitos = riscados + check verde)

---

## 7. SimpleSettings (NOVO componente)

`web/src/pages/SimpleSettings.tsx` — rota `/configuracoes`, `minRole: "operador"`

**Wireframe:**
```
┌────────────────────────────────────────────────────────────┐
│ ⚙️ Configurações                                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ 🌐 Idioma da interface         [Português ▾]               │
│ 🎨 Tema                        [Escuro ▾]                  │
│                                                             │
│ ── Provedor de IA ──                                       │
│                                                             │
│ 🤖 Modelo do agente            [gpt-5.5 ▾]                 │
│ 🔑 Conectar provedor                                       │
│    Status: ✅ Conectado (chatgpt)                          │
│    [Alterar / Desconectar]                                 │
│                                                             │
│ ── Comportamento ──                                        │
│                                                             │
│ ☑ Mostrar ferramentas usadas durante o chat                │
│ ☑ Sugerir perguntas iniciais                               │
│                                                             │
│ ── Sessões ──                                              │
│                                                             │
│ 📊 Manter sessões por        [30 dias ▾]                   │
│                                                             │
│ [Salvar configurações]                                      │
├────────────────────────────────────────────────────────────┤
│ 🔧 Configurações avançadas (modo Dev) —                    │
│ Troque para o perfil Dev no menu lateral                   │
└────────────────────────────────────────────────────────────┘
```

**O que salva:** Usa `api.saveConfig()` existente, mas só modifica os campos visíveis no formulário (idioma, tema, modelo, tool_progress, session_ttl, etc.)

**Provedor de IA (conexão):**
- Mostra status atual: "Conectado como chatgpt" OU "Nenhum provedor configurado"
- Botão "Alterar" → inline expand com dropdown de provedores + input de chave
- Reutiliza lógica de OAuth se disponível

---

## 8. Chat — O Terminal PTY É o Chat

### 8.1 Realidade

Não existe `ChatPage.tsx`. O chat é um terminal xterm.js conectado via WebSocket a um processo `mangaba --tui` gerenciado por `pty_bridge.py`. Isso é **diferente** de um chat React tradicional.

### 8.2 Melhorias possíveis

A. **Sugestões de conversa** — antes de conectar ao PTY (tela inicial do /chat), mostrar chips de perguntas. Implementar como overlay opcional no topo do terminal, que desaparece ao primeiro input.

B. **Seletor de modelo simplificado** — no topo da página /chat, mostrar dropdown com nomes amigáveis (não `provider::model`). Mudar o modelo reinicia o PTY com novo contexto.

C. **Tool calls inline** — o PTY do `mangaba --tui` já mostra tool calls no fluxo de atividade (`┊` lines). Melhorar o parse dessas linhas para exibição mais clara seria um enhancement no backend (spinner), não no frontend.

D. **Indicador de conexão** — juntar ao seletor de modelo: bolinha verde "Conectado" / cinza "Desconectado".

### 8.3 Proposta: ChatPage wrapper

Criar `web/src/pages/ChatPage.tsx` como wrapper thin:
- Top bar: seletor de modelo simplificado + status de conexão
- Body: o terminal PTY (via `web/src/components/PtyTerminal.tsx` ou similar)
- Empty state: sugestões de conversa (antes de conectar)

Isso dá ao chat uma "página" que a sidebar pode linkar, sem reimplementar o terminal.

---

## 9. Env Vars — Integrado ou Separado?

### Dilema

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **A)** Manter env vars no ConfigPage (categoria `__env__`) | Já funciona, zero refatoração | Usuário simples vê ConfigPage que é dev-only |
| **B)** Criar SimpleEnv dentro do SimpleSettings | Alinhado com ui-ux.md | Duplicação de código de env vars |
| **C)** Env vars ficam no ConfigPage (dev) + SimpleSettings (simples) tem "Conectar provedor" simplificado | Cada role vê o que precisa | Dois pontos de edição de chave |

**Proposta: C**
- Modo Simples → `/configuracoes` mostra apenas provedor de IA (dropdown + chave OAuth) e uns 5-10 ajustes
- Modo Dev → `/config` e `/env` (ou `__env__` dentro de config) mostram todas as chaves e configurações
- SimpleSettings.NO `api.saveSimpleConfig()` não existe — usamos `api.saveConfig()` para os campos comuns

---

## 10. Mapa de Rotas Final

```
Rotas "simples" (operador + gestor) — minRole: "operador":

  /                     → redirect → /home
  /home                 → HomePage
  /chat                 → ChatPage (wrapper PTY)
  /sessions             → GlobalSessionsPage (já existe)
  /configuracoes        → SimpleSettings (NOVO)

Rotas "dev" adicionais — minRole: "dev":

  /setup                → SetupPage (já existe)
  /criar                → AgentWizardPage (já existe)
  /criar/wizard         → AgentWizardPage (já existe)
  /config               → ConfigPage (já existe)
  /models               → ModelsPage (NÃO existe — criar)
  /env                  → EnvPage (NÃO existe — extrair de ConfigPage.__env__)
  /skills               → SkillsPage (já existe)
  /plugins              → PluginsPage (NÃO existe — criar)
  /memory               → MemoryPage (NÃO existe — criar)
  /profiles             → ProfilesPage (NÃO existe — criar)
  /routing              → RoutingPage (NÃO existe — criar)
  /fleet                → FleetPage (já existe)
  /clients              → ClientsPage (NÃO existe — criar)
  /teams-agents         → TeamsAgentsPage (NÃO existe — criar)
  /sessions/global      → GlobalSessionsPage (já existe)
  /cron                 → CronPage (já existe)
  /kanban               → KanbanPage (já existe)
  /analytics            → AnalyticsPage (NÃO existe — criar)
  /observability        → ObservabilityPage (NÃO existe — criar)
  /logs                 → LogsPage (já existe)
  /docs                 → DocsPage (já existe)
  /dashboard/agent/:id  → AgentDashboardPage (já existe)

Nota: Várias "NÃO existe" podem ser plugins servidos por PluginPage,
não precisam de componente React próprio.
```

---

## 11. Plano de Implementação (6 Fases)

### Fase 1 — UserRole + NavItem (estrutura)

| Arquivo | O que fazer |
|---------|-------------|
| `src/lib/userRole.ts` | Implementar operador/gestor/dev com localStorage, evento, canSee, useUserRole |
| `src/App.tsx` | Adicionar `minRole?: UserRole` em `NavItem`; adicionar `minRole` em todos os `BUILTIN_NAV_REST` |
| `src/App.tsx` | Adicionar `/home` + `/configuracoes` em `BUILTIN_ROUTES_CORE` |
| `src/App.tsx` | Extrair sidebar para `AppSidebar.tsx`; adicionar filtro por role; adicionar "Mais opções..." |

### Fase 2 — RouteGuard + RoleSwitcher (navegação)

| Arquivo | O que fazer |
|---------|-------------|
| `src/components/RouteGuard.tsx` | NOVO — wrapper de rota que bloqueia se `canSee` for false |
| `src/components/RoleSwitcher.tsx` | NOVO — dropdown Simples/Dev com ícone, tooltip, persistência |
| `src/components/AppSidebar.tsx` | NOVO — sidebar extraída + RoleSwitcher + filtro |

### Fase 3 — HomePage + OnboardingChecklist (primeira impressão)

| Arquivo | O que fazer |
|---------|-------------|
| `src/pages/HomePage.tsx` | NOVO — OnboardingChecklist + atalhos Chat/Sessões |
| `src/components/OnboardingChecklist.tsx` | NOVO — 6 passos com verificação + progresso |
| `src/App.tsx` | `RootRedirect` → `/home` |

### Fase 4 — SimpleSettings (configuração simplificada)

| Arquivo | O que fazer |
|---------|-------------|
| `src/pages/SimpleSettings.tsx` | NOVO — 5-10 ajustes, provedor de IA, comportamento, salvamento via `api.saveConfig()` |

### Fase 5 — ChatPage (wrapper)

| Arquivo | O que fazer |
|---------|-------------|
| `src/pages/ChatPage.tsx` | NOVO — seletor de modelo, status, embed do PTY terminal, sugestões |
| `src/components/PtyTerminal.tsx` | Extrair lógica PTY de onde estiver |

### Fase 6 — Labels + EnvPage (polimento)

| Arquivo | O que fazer |
|---------|-------------|
| `src/App.tsx` | Renomear labels: Frota → Agentes, Habilidades → Skills, etc. |
| `src/i18n/pt.ts` | Ajustar chaves `app.nav.*` |
| `src/pages/ConfigPage.tsx` | Manter env vars em `__env__` (dev-only) |
| `src/pages/EnvPage.tsx` | Opcional: extrair env vars para página separada |

---

## 12. Perguntas para Debate

1. **RoleSwitcher**: Manter operador/gestor/dev internamente (preserva teste) vs renomear para simples/dev (mais limpo)?

2. **ChatPage wrapper**: Vale a pena criar um wrapper React para o terminal PTY, ou melhor focar em melhorias no backend (spinner, tool calls, sugestões)?

3. **Env vars**: Separar em `EnvPage.tsx` (rota /env, dev-only) ou manter dentro do `ConfigPage.__env__`? A ui-ux.md sugere separar.

4. **OnboardingChecklist**: Detecção automática de passos (via API) ou manual (usuário marca)?

5. **SimpleSettings**: Reutilizar componentes do ConfigPage (AutoField etc) ou construir formulário customizado?

6. **Páginas que "não existem"**: Algumas (ModelsPage, PluginsPage, etc.) podem ser servidas por plugins ou são páginas planejadas mas nunca criadas. Devemos criar stubs ou deixar 404?

7. **Ordem das fases**: Esta sequência faz sentido ou prefere começar por outra frente?

---

## 13. Verificação Pós-Implementação

- [ ] `userRole.test.ts` passa (3 roles, hierarquia, persistência)
- [ ] Usuário `simples` vê sidebar com 4-5 itens + "Mais opções..."
- [ ] "Mais opções..." abre modal com explicação + botão "Trocar para Dev"
- [ ] Usuário `dev` vê sidebar completa (24 itens)
- [ ] Rota `/config` com role `simples` mostra RouteGuard
- [ ] Rota `/config` com role `dev` mostra ConfigPage
- [ ] HomePage mostra OnboardingChecklist como hero
- [ ] SimpleSettings salva e carrega configurações corretamente
- [ ] ChatPage wrapper mostra seletor de modelo + terminal
- [ ] `vite build` passa sem erros
- [ ] Testes existentes continuam passando
