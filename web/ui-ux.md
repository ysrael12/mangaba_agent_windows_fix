# Análise de UI/UX — Mangaba Dashboard

> **Público-alvo:** Não técnico (operadores, gestores, usuários finais).
> **Objetivo:** Simplificar, reduzir carga cognitiva, guiar sem atrapalhar.

---

## 1. Problemas Estruturais

### 1.1 Sobrecarga de Navegação

A sidebar principal expõe **~23 links** de navegação, organizados em 7 seções.

```
Início | Começar | Criar agente
── Aprender ──
Documentação | Exemplos
── Configurar a IA ──
Modelos | Chaves | Habilidades | Plugins | Memória
── Agentes e canais ──
Perfis | Roteamento | Frota | Clientes & API | Agentes no Teams
── Usar ──
Chat | Sessões | Sessões Globais
── Automatizar ──
Agendamentos | Kanban
── Acompanhar ──
Análise | Observabilidade | Logs
── Ajustar ──
Configuração
```

**Problema:** Um usuário não técnico quer fazer 2-3 coisas: _conversar_, _criar um agente_, _ver o que aconteceu_. O restante é ruído.

**Recomendação:**

Criar dois modos de UI:

| Modo | Nav items | Público |
|------|-----------|---------|
| **Simples** (padrão) | Chat, Início, Minhas Sessões, Configurações | operador, gestor |
| **Dev** | todos os 23+ | dev |

No modo simples, agrupar tudo o resto atrás de um único link "Mais opções" no final da sidebar.
O `RoleSwitcher` já existe (`operador`/`gestor`/`dev`) — simplificar para apenas 2 opções visíveis:

| Role atual | Label na UI | Modo |
|------------|-------------|------|
| `operador` | Simples | sidebar enxuta |
| `gestor` | Simples | sidebar enxuta (mesmo que operador) |
| `dev` | Dev | sidebar completa |

---

### 1.2 Jargão Técnico em Interfaces de Usuário

Muitos termos que um público não técnico não reconhece:

| Termo atual | Problema | Sugestão |
|-------------|----------|----------|
| Perfis | "Perfil de quê?" | Agentes |
| Roteamento | "O que isso roteia?" | Canais de conversa |
| Frota | "Frota de quê?" | Agentes em equipe |
| Habilidades | Genérico demais | Habilidades (se for o termo do produto) |
| Plugins | Técnico | Extensões |
| Agendamentos | OK, mas vago | Tarefas agendadas |
| Kanban | Palavra estrangeira | Quadro de tarefas |
| Observabilidade | Extremamente técnico | Monitoramento |
| Logs | Técnico | Registros |
| Chaves | Genérico | Chaves de API |
| Sessões Globais | "Global como assim?" | Histórico completo |
| Triagem (Kanban) | Jargão de produção | Análise inicial |
| Especificar / Decompor | Jargão de engenharia | Detalhar com IA |
| Provider::model | Formato técnico | Nome do modelo + provedor amigável |

---

## 2. Problemas de Jornada e Fluxo

### 2.1 HomePage razoável, mas ainda confusa

A HomePage tem:
- `AgentStatus` no topo (gateway state, plataformas, sessões ativas — dados de infra)
- Seção "Comece aqui" com steps → ok
- Seção "Jornada inicial" com 4 cards → ok
- Seção "Por que usar o Mangaba?" → ok após o primeiro uso, vira espaço perdido

**Problema:** `AgentStatus` mostra dados de infraestrutura. A home tem conteúdo promocional ("Por que usar") que só faz sentido na primeira visita.

**Recomendação:**
- Modo simples: home mostra **OnboardingChecklist como hero** + atalhos grandes (Chat, Sessões)
- `AgentStatus` → modo dev apenas
- Seção "Por que usar" → esconder após o primeiro checklist completo

### 2.2 Onboarding Checklist bom, mas subutilizado

O `OnboardingChecklist` (componente) é o melhor ponto de partida para não-técnicos.

**Recomendação:** Torná-lo a experiência **default** na HomePage
- O banner atual é pequeno e perto do topo. Expandir para ocupar o centro
- Passos mais orientados a "jornada" que "configuração"

---

### 2.3 ChatPage funcional, mas sem personalidade

**Problemas para não-técnicos:**
- Seletor de modelo expõe `provider::model`
- Sem sugestões iniciais de perguntas
- Respostas em `<pre>` (sem rich markdown)
- Sem indicador de ferramentas sendo chamadas

**Recomendação:**
1. Sugestões de conversa — chips de perguntas iniciais
2. Tool calls inline na resposta (já existe `ToolCall`)
3. Seletor de modelo simplificado (nome amigável + selo de capability)
4. Usar `<Markdown>` em vez de `<pre>`

---

## 3. Problemas de Configuração

### 3.1 ConfigPage — editor de config.yaml exposto ao usuário final

**Recomendação:** Criar `SimpleSettingsPage` no modo simples. ConfigPage atual vai para modo dev apenas.

### 3.2 EnvPage — chaves de API cruas e técnicas

**Recomendação:** Criar `SimpleEnvPage` com formulário guiado por provedor. EnvPage atual vai para modo dev.

---

## 4. Problemas de Informação e Feedback

### 4.1 ModelsPage — custos, aux tasks, context window

**Recomendação:** Modelos + aux tasks → modo dev. Modo simples tem seletor no Chat apenas.

### 4.2 SkillsPage — dezenas de switches

**Recomendação:** Modo dev. Usuário simples não mexe em skills individuais.

### 4.3 KanbanPage — termos técnicos

**Recomendação:** Renomear "Triagem" → "Análise", "Decompor" → "Detalhar", "Especificar" → "Descrever".

---

## 5. ARQUITETURA TÉCNICA — Modo Simples vs Dev

### 5.1 O sistema de roles já faz tudo

O código já tem:
- `UserRole = "operador" | "gestor" | "dev"` com hierarquia (0, 1, 2)
- `canSee(activeRole, minRole)` → filtra por rank
- `RouteGuard` com `minRole` → bloqueia rota + mostra aviso para subir perfil
- `useUserRole()` hook reativo → sidebar e guards re-renderizam automaticamente
- Nav items com campo `minRole` → `BUILTIN_NAV_REST` já tem `minRole` em todos

**A arquitetura já está 90% pronta.** O que falta:

1. Ajustar `minRole` dos nav items para separar corretamente Simples vs Dev
2. Simplificar `RoleSwitcher` para mostrar apenas "Simples" e "Dev"
3. Criar páginas simplificadas onde as atuais são técnicas demais

### 5.2 Mapeamento: Nav items × Modos

**Modo Simples (`operador` + `gestor`) — 4~5 itens na sidebar:**

| Item | minRole (novo) | Rota |
|------|----------------|------|
| Início | `operador` | `/home` |
| Chat | `operador` | `/chat` |
| Minhas Sessões | `operador` | `/sessions` |
| Configurações | `operador` | `/configuracoes` (NOVO) |
| ─ Mais opções ─ | `operador` | abre modal com link para trocar perfil |

**Modo Dev (`dev`) — todos os 23+ itens atuais + os novos:**

Tudo que está em `BUILTIN_NAV_REST` hoje com `minRole: "dev"` ou `minRole: "gestor"` permanece.
Itens com `minRole: "operador"` hoje que são técnicos sobem para `minRole: "dev"`.

### 5.3 Mudanças no RoleSwitcher

Atual: 3 opções (Operador / Gestor / Dev)
Novo: 2 opções (Simples / Dev)

```tsx
// userRole.ts — NOVOS valores
export type UserRole = "simples" | "dev";
export const ROLE_META = {
  simples: { label: "Simples", rank: 0, hint: "Uso diário" },
  dev: { label: "Dev", rank: 1, hint: "Acesso completo" },
};
```

**Por que mudar o enum?** Porque `operador` e `gestor` teriam exatamente a mesma sidebar. Manter 3 roles que se comportam igual confunde. Dois caminhos:

| Opção | Prós | Contras |
|-------|------|---------|
| **A)** Renomear para `simples/dev` e unificar operador+gestor | Limpo, 1:1 com a UI | Quebra compatibilidade com localStorage existente |
| **B)** Manter operador/gestor/dev, mapear operador+gestor → sidebar simples | Sem migração de dados | 3 opções no seletor viram 2 comportamentos — confuso |

**Recomendação: Opção A** (renomear). Usuários reais são poucos, perder localStorage é aceitável.

### 5.4 Novas páginas para o modo Simples

| Página | Arquivo | Descrição |
|--------|---------|-----------|
| `SimpleSettings` | `src/pages/SimpleSettings.tsx` | 5-10 ajustes essenciais (idioma, tema, modelo) — formulário simples, sem YAML, sem schema |
| `SimpleEnv` | Embedded em `SimpleSettings` ou separado | "Conectar provedor de IA" — dropdown de provedores, cada um com input de chave + link para obter |

As páginas técnicas (`ConfigPage`, `EnvPage`, `SkillsPage`, `ModelsPage`, `KanbanPage`, etc.) mantêm `minRole: "dev"` e só aparecem no modo Dev.

### 5.5 Mapa de rotas atualizado

```typescript
// Rotas do modo simples (minRole: "simples")
const SIMPLE_ROUTES = {
  "/": RootRedirect,
  "/home": SimpleHomePage,       // HomePage simplificada
  "/chat": ChatPage,             // igual (já é simples o suficiente com ajustes)
  "/sessions": SimpleSessionsPage, // SessionsPage com menos dados
  "/configuracoes": SimpleSettingsPage, // NOVA
};

// Rotas do modo dev (minRole: "dev") — tudo que existe hoje + rotas novas
const DEV_ROUTES = {
  ...SIMPLE_ROUTES,              // herda as simples
  "/setup": SetupPage,
  "/models": ModelsPage,
  "/env": EnvPage,
  "/skills": SkillsPage,
  "/plugins": PluginsPage,
  "/memory": MemoryPage,
  "/profiles": ProfilesPage,
  "/routing": RoutingPage,
  "/fleet": FleetPage,
  "/clients": ClientsPage,
  "/teams-agents": TeamsAgentsPage,
  "/sessions/global": GlobalSessionsPage,
  "/cron": CronPage,
  "/kanban": KanbanPage,
  "/analytics": AnalyticsPage,
  "/observability": ObservabilityPage,
  "/logs": LogsPage,
  "/config": ConfigPage,
  "/docs": DocsPage,
  "/examples": ExamplesPage,
  "/criar": CreateAgentPage,
  "/criar/wizard": AgentWizardPage,
  "/dashboard/agent/:id": AgentDashboardPage,
};
```

---

## 6. WIREFRAMES — Modo Simples

### 6.1 Sidebar

```
┌──────────────────────────────┐
│  🅜  Mangaba Agent           │
│      Painel central          │
├──────────────────────────────┤
│  🔍 Buscar…          ⌘K     │
├──────────────────────────────┤
│  Perfil: [Simples ▾]        │
├──────────────────────────────┤
│                              │
│  🏠 Início                   │
│  💬 Chat                     │
│  📋 Minhas Sessões           │
│  ⚙️ Configurações            │
│                              │
│  ─────────────────           │
│  🔧 Mais opções...           │  ← abre modal explicando que
│                              │    precisa mudar para modo Dev
├──────────────────────────────┤
│  🌙  🎨  🌐                 │
│  v1.0.0                      │
└──────────────────────────────┘
```

O link "Mais opções..." no modo simples abre um modal:
> "Algumas funcionalidades avançadas estão ocultas no modo Simples.
>  Troque para o modo Dev no seletor de perfil para acessar:
>  • Modelos detalhados • Chaves de API • Habilidades • Plugins
>  • Kanban • Agendamentos • Configuração YAML • e mais."
>
> [Mudar para Dev]

### 6.2 HomePage (modo simples)

```
┌─────────────────────────────────────────────────────────┐
│ 🎉 Primeiros passos                        3 de 6       │
│ ████████░░░░░░░░░░░░░░░░░░░░░░                          │
│                                                          │
│ ☐ Converse com o agente     → Abrir Chat                 │
│ ☐ Conecte um canal          → Telegram, WhatsApp...      │
│ ☐ Ensine seu contexto       → O que o agente lembra     │
│ ☐ Crie um agente            → Personalidade própria     │
│ ☐ Crie uma tarefa           → Automatizar com o Kanban  │
│ ☐ Pronto!                   → 🎉                        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ 💬 Chat          │  │ 📋 Sessões      │               │
│ │ Converse agora   │  │ Veja o histórico│               │
│ │ [Abrir Chat]     │  │ [Ver Tudo]      │               │
│ └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

Sem `AgentStatus`, sem seção "Por que usar", sem hero section — direto ao ponto.

### 6.3 ChatPage (melhorias)

```
┌─────────────────────────────────────────────────────────┐
│ 🅜 Mangaba Agent  ● Conectado    [Claude Sonnet ▾]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ M                                                │ │
│ │ Olá! Como posso ajudar hoje?                       │ │
│ │                                                     │ │
│ │ 💡 Sugestões:                                       │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────────┐        │ │
│ │ │Resuma meu│ │O que você│ │Crie um plano │        │ │
│ │ │e-mail    │ │sabe fazer?│ │de projeto    │        │ │
│ │ └──────────┘ └──────────┘ └──────────────┘        │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Você                                        │ │
│ │ O que é Mangaba Agent?                             │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🅜 Assistente                                  │ │
│ │ **Mangaba Agent** é sua plataforma de agentes...   │ │
│ │                                                     │ │
│ │ 🔧 Pesquisou na web · ✅ 3 páginas lidas           │ │
│ │ 🔧 Leu arquivo · ✅ documentação completa           │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐   │
│ │ Envie uma mensagem...                        [➤] │   │
│ └───────────────────────────────────────────────────┘   │
│ Enter para enviar · Shift+Enter para nova linha          │
└─────────────────────────────────────────────────────────┘
```

Tool calls aparecem inline (não em sidebar separada). Sugestões de conversa no estado vazio.

### 6.4 SimpleSettings

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Configurações                                         │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🌐 Idioma                           [Português ▾]  │ │
│ │   Idioma da interface                                │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎨 Tema                           [Escuro ▾]       │ │
│ │   Aparência do painel                               │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🤖 Modelo do agente          [Claude Sonnet ▾]     │ │
│ │   Qual IA responde suas mensagens                    │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔑 Conectar provedor de IA                          │ │
│ │   Escolha abaixo qual serviço usar:                 │ │
│ │                                                     │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ Selecione um provedor           [▾]           │   │ │
│ │ │ ┌───────────────────────────────────────────┐ │   │ │
│ │ │ │ 🔑 Chave da API: [______________________] │ │   │ │
│ │ │ │ 📎 Como obter uma chave?                  │ │   │ │
│ │ │ └───────────────────────────────────────────┘ │   │ │
│ │ │ [Salvar]                                      │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📊 Sessões antigas: [Manter por 30 dias ▾]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💬 Comportamento do agente                          │ │
│ │ ☑ Mostrar ferramentas sendo usadas durante o chat   │ │
│ │ ☑ Sugerir perguntas iniciais                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Salvar configurações]                                   │
├─────────────────────────────────────────────────────────┤
│ 🔧 Configurações avançadas (modo Dev) —                  │
│ Troque para o perfil Dev no menu lateral                 │
└─────────────────────────────────────────────────────────┘
```

---

## 7. PLANO DE IMPLEMENTAÇÃO

### Fase 1 — Sidebar e Navegação (1-2 dias)

Objetivo: usuario `simples` ve sidebar com 4 items, usuario `dev` ve tudo.

| Arquivo | O que mudar |
|---------|-------------|
| `src/lib/userRole.ts` | Renomear `UserRole` para `"simples" \| "dev"`. Ajustar `ROLE_META`. Remover `gestor`. `getRole()` default → `"simples"` |
| `src/components/RoleSwitcher.tsx` | Simplificar: mostrar só 2 opções (Simples / Dev). Label "Dev" com hint "Acesso completo" |
| `src/App.tsx` | Ajustar `minRole` nos nav items. Itens atuais com `minRole: "operador"` que devem sumir → sobem para `"dev"`. Manter só 4 como `"simples"` |
| `src/components/RouteGuard.tsx` | Ajustar label no aviso de bloqueio para "Simples"/"Dev" |

Nav items que viram `minRole: "simples"`:
- `/home` (Início)
- `/chat` (Chat)
- `/sessions` (Minhas Sessões)

Nav items que permanecem `minRole: "dev"`:
- Tudo que já é `minRole: "dev"` hoje
- Itens que eram `minRole: "gestor"` sobem para `"dev"` (visto que `gestor` some)
- Itens que eram `minRole: "operador"` e são técnicos sobem para `"dev"`

---

### Fase 2 — Renomear Jargão (1 dia)

| Arquivo | Mudanças |
|---------|----------|
| `src/App.tsx` | Labels da sidebar: `BUILTIN_NAV_REST` atualizar labels e `labelKey` |
| `src/pages/SessionsPage.tsx` | "Sessões Globais" → "Histórico completo" |
| `src/pages/KanbanPage.tsx` | "Triagem" → "Análise", "Especificar (IA)" → "Descrever", "Decompor (IA)" → "Detalhar" |
| `src/i18n/locales/pt.json` | Ajustar chaves de tradução |
| `src/components/ChatSidebar.tsx` | "tools" → "ferramentas", "model" → "modelo" |

---

### Fase 3 — HomePage Simplificada (1 dia)

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/HomePage.tsx` | Remover `AgentStatus` da home (só mostra no modo dev). Manter OnboardingChecklist como hero. Manter apenas atalhos Chat + Sessões. Remover seção "Por que usar" (ou esconder após primeira vez). |
| `src/components/OnboardingChecklist.tsx` | Ajustar passos para serem mais de "jornada" que "configuração". Manter detecção automática. |

---

### Fase 4 — SimpleSettings + SimpleEnv (2-3 dias)

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/pages/SimpleSettings.tsx` | NOVO | Página com 5-10 ajustes essenciais (idioma, tema, modelo, provedor, comportamento do chat, retenção de sessões). Sem YAML, sem schema, sem busca |
| `src/lib/api.ts` | ESTENDER | Adicionar métodos `getSimpleConfig()`, `saveSimpleConfig()` se necessário (ou reutilizar `getConfig()`/`saveConfig()` e extrair só os campos simples) |
| `src/App.tsx` | EDITAR | Adicionar rota `/configuracoes` com `minRole: "simples"` apontando para `SimpleSettings` |
| `src/pages/ConfigPage.tsx` | EDITAR | Manter `minRole: "dev"` (já está, só verificar) |
| `src/pages/EnvPage.tsx` | EDITAR | Manter `minRole: "dev"` |

---

### Fase 5 — ChatPage Melhorada (2 dias)

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/ChatPage.tsx` | 1. Substituir `<pre>` por `<Markdown>` 2. Adicionar sugestões de conversa no estado vazio 3. Simplificar seletor de modelo (nome amigável, sem `provider::model`) 4. Adicionar indicador de tool calls inline |
| `src/components/ToolCall.tsx` | Adaptar para ser usado inline nas respostas do chat (não só no ChatSidebar) |

---

### Fase 6 — Modo Dev: Rotas e Guards (1 dia)

| Arquivo | Mudanças |
|---------|----------|
| `src/App.tsx` | Garantir que rotas como `/config`, `/models`, `/env`, `/skills`, `/plugins`, `/kanban`, `/cron`, `/analytics`, `/observability`, `/logs` tenham `minRole: "dev"` via `RouteGuard` |
| `src/lib/userRole.ts` | Garantir que `canSee("simples", undefined)` retorne true para rotas sem restrição |

---

## 8. ÁRVORE DE DECISÃO: ONDE CADA TELA APARECE

```
Tela                          Modo Simples    Modo Dev
────                          ─────────────    ────────
Início (/home)                ✅               ✅
Chat (/chat)                  ✅               ✅
Minhas Sessões (/sessions)    ✅               ✅
Configurações (/configuracoes) ✅              ✅ (também link para /config)

Começar (/setup)              —               ✅
Modelos (/models)             —               ✅
Chaves (/env)                 —               ✅
Habilidades (/skills)         —               ✅
Plugins (/plugins)            —               ✅
Memória (/memory)             —               ✅
Perfis (/profiles)            —               ✅
Roteamento (/routing)         —               ✅
Frota (/fleet)                —               ✅
Clientes & API (/clients)     —               ✅
Agentes no Teams (/teams)     —               ✅
Sessões Globais (/sessions/global) —          ✅
Agendamentos (/cron)          —               ✅
Kanban (/kanban)              —               ✅
Análise (/analytics)          —               ✅
Observabilidade (/observability) —            ✅
Logs (/logs)                  —               ✅
Configuração (/config)        —               ✅
Documentação (/docs)          —               ✅
Exemplos (/examples)          —               ✅
Criar agente (/criar)         —               ✅
Wizard (/criar/wizard)        —               ✅
Dashboard agente (/dashboard/agent/:id) —     ✅
```

---

## 9. PRINCIPAIS ARQUIVOS QUE PRECISAM DE MUDANÇA

### Modificados

| Arquivo | Impacto |
|---------|---------|
| `src/lib/userRole.ts` | Alto — renomear enum, ajustar meta |
| `src/components/RoleSwitcher.tsx` | Baixo — 3 opções → 2 opções |
| `src/components/RouteGuard.tsx` | Baixo — ajustar labels |
| `src/App.tsx` | Médio — reclassificar `minRole`, adicionar/remover rotas |
| `src/pages/HomePage.tsx` | Médio — remover AgentStatus, reordenar seções |
| `src/pages/ChatPage.tsx` | Alto — Markdown, sugestões, tool calls inline, seletor |
| `src/pages/KanbanPage.tsx` | Baixo — renomear labels |
| `src/components/OnboardingChecklist.tsx` | Médio — ajustar steps, layout |

### Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/SimpleSettings.tsx` | Configuração simples para modo simples |

### Removidos/Sem mudança

| Arquivo | Motivo |
|---------|--------|
| `src/pages/ConfigPage.tsx` | Só muda `minRole` em `App.tsx` — já é dev |
| `src/pages/EnvPage.tsx` | Só muda `minRole` em `App.tsx` |
| `src/pages/ModelsPage.tsx` | Só muda `minRole` em `App.tsx` |
| `src/pages/SkillsPage.tsx` | Só muda `minRole` em `App.tsx` |
| Outras pages técnicas | Só mudam `minRole` |

---

## 10. PÓS-IMPLEMENTAÇÃO: VERIFICAÇÃO

1. Usuário `simples` vê sidebar com 4 itens + "Mais opções..."
2. Usuário `simples` que acessa `/config` via URL vê `RouteGuard` com aviso para trocar perfil
3. Usuário `dev` vê sidebar completa com todos os 23+ itens
4. Chat renderiza respostas em Markdown
5. Chat mostra tool calls inline
6. Chat tem sugestões de conversa no estado vazio
7. HomePage sem `AgentStatus` no modo simples
8. SimpleSettings permite ajustar idioma, tema, modelo, provedor de IA
9. OnboardingChecklist aparece na home como elemento principal
10. Todas as traduções pt-BR atualizadas com novos labels
11. RoleSwitcher mostra apenas "Simples" e "Dev"

---

## 11. CONCLUSÃO

A arquitetura atual já tem 90% do necessário: roles hierárquicas, `RouteGuard`, `canSee()`, sidebar dinâmica, lazy loading.

O que separa o dashboard de ser "para todos" vs "para devs" é **classificar cada nav item e rota corretamente**:

```typescript
// ANTES: sidebar mostra 23 itens para operador
minRole: "operador" → 7 itens diferentes
minRole: "gestor"   → 14 itens diferentes
minRole: "dev"      → 23 itens

// DEPOIS: sidebar mostra 4 itens para simples
minRole: "simples"  → 4 itens
minRole: "dev"      → 23+ itens
```

Isso se traduz em mudanças **localizadas** (principalmente `userRole.ts`, `App.tsx` e criação de `SimpleSettings.tsx`). O resto das pages técnicas não precisa ser reescrito — apenas re-classificado.
