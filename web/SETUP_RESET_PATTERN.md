# Padrão de Reiniciar Setup

Encapsulamento completo do estado de setup/onboarding com opções granulares de reset.

## 📋 Estrutura

### `setupState.ts` — Gerenciador de Estado
Centraliza todas as chaves de localStorage relacionadas a setup:

```typescript
const SETUP_KEYS = {
  onboarding: "mangaba:onboarding",           // Checklist 6 passos
  hints_dismissed: "mangaba:hints-dismissed", // Dicas vistas
  agent_draft: "mangaba-agent-draft",         // Agente em criação
  role: "mangaba-perfil",                     // Role atual (operador/gestor/dev)
  last_simple_role: "mangaba-perfil-simples", // Último role simples
};
```

### API

#### `loadSetupState(): SetupState`
Carrega o estado completo (ou defaults se error).

```typescript
const state = loadSetupState();
console.log(state.onboarding);      // { chat: true, channel: false, ... }
console.log(state.hints_dismissed); // ["first-visit-welcome", ...]
console.log(state.role);            // "operador"
```

#### `clearSetupState(): void`
Limpa TUDO — volta ao estado inicial.

```typescript
clearSetupState();
// Remove: onboarding, hints_dismissed, agent_draft, role, last_simple_role
```

#### `clearOnboarding(): void`
Limpa SÓ checklist + dicas. Mantém role, draft.

```typescript
clearOnboarding();
// Remove: onboarding, hints_dismissed
// Mantém: role, agent_draft, last_simple_role
```

#### `clearAgentDraft(): void`
Limpa SÓ o agente em criação. Wizard volta vazio.

```typescript
clearAgentDraft();
// Remove: agent_draft
// Mantém: tudo mais
```

#### `restartSetup(): Promise<void>`
Limpa tudo E navega para `/home`.

```typescript
await restartSetup();
// 1. clearSetupState()
// 2. Aguarda 50ms
// 3. window.location.href = "/home"
```

#### `restartOnboarding(): Promise<void>`
Limpa checklist/hints E recarrega página.

```typescript
await restartOnboarding();
// 1. clearOnboarding()
// 2. Aguarda 50ms
// 3. window.location.reload()
```

---

## 🎨 UI — SetupResetDialog

Modal com 2 opções de reset:

```
┌─────────────────────────────────────┐
│  ⚠️  Reiniciar Setup                 │
│                                      │
│  Escolha o que deseja fazer:         │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ 🔄 Ver checklist novamente      │ │
│  │ Limpa as dicas e o checklist.   │ │
│  │ Mantém seu role e draft.        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ ♻️ Resetar tudo                 │ │
│  │ Limpa checklist, dicas, e o     │ │
│  │ agente em criação. Volta ao     │ │
│  │ Início.                         │ │
│  └─────────────────────────────────┘ │
│                                      │
│  [Cancelar]                          │
└─────────────────────────────────────┘
```

### Props
```typescript
interface SetupResetDialogProps {
  open: boolean;
  onClose: () => void;
}
```

### Uso
```tsx
import { SetupResetDialog } from "@/components/SetupResetDialog";

function MyPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>
        Reiniciar Setup
      </button>
      <SetupResetDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

---

## 🔗 Integração — SimpleSettings

Localização natural para o reset (settings → restart):

```tsx
import { SetupResetDialog } from "@/components/SetupResetDialog";
import { clearOnboarding } from "@/lib/setupState";

export default function SimpleSettings() {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  return (
    <>
      <Section icon={RotateCcw} title="Reiniciar">
        <p>Limpe o checklist, dicas e/ou agente para começar do zero.</p>
        <Button onClick={() => setResetDialogOpen(true)}>
          Reiniciar Setup
        </Button>
      </Section>

      <SetupResetDialog 
        open={resetDialogOpen} 
        onClose={() => setResetDialogOpen(false)} 
      />
    </>
  );
}
```

---

## 📊 Matriz de Reset

| Função | Checklist | Dicas | Draft | Role | Navega? |
|---|---|---|---|---|---|
| `clearSetupState()` | ✓ | ✓ | ✓ | ✓ | — |
| `clearOnboarding()` | ✓ | ✓ | — | — | — |
| `clearAgentDraft()` | — | — | ✓ | — | — |
| `restartSetup()` | ✓ | ✓ | ✓ | ✓ | → /home |
| `restartOnboarding()` | ✓ | ✓ | — | — | reload |

---

## 🎯 Cenários de Uso

### Cenário 1: Usuário vê checklist incompleto, quer começar do zero
```
1. Usuário em /home vê checklist incompleto
2. Entra em /configuracoes
3. Clica "Reiniciar Setup"
4. Modal abre
5. Escolhe "Resetar tudo"
6. Limpa tudo + volta a /home
7. Vê checklist vazio novamente
```

### Cenário 2: Usuário já viu as dicas, quer revê-las
```
1. Usuário em /home
2. Entra em /configuracoes
3. Clica "Reiniciar Setup"
4. Modal abre
5. Escolhe "Ver checklist novamente"
6. Limpa checklist + hints
7. Página recarrega
8. Dicas aparecem de novo (hints_dismissed zerado)
```

### Cenário 3: Usuário quer recomeçar o agente
```
1. Usuário foi criando agente em /criar
2. Quer começar do zero
3. Entra em /configuracoes
4. Clica "Reiniciar Setup"
5. Escolhe "Resetar tudo"
6. clearAgentDraft() faz wizard voltar vazio
7. Clica "Criar agente" novamente → wizard limpo
```

---

## 🔐 Segurança & Robustez

1. **Try/catch em tudo** — localStorage pode falhar, defaults são robustos
2. **Confirmação modal** — evita resets acidentais
3. **Loading state** — usuário vê que algo está acontecendo
4. **Delay 50ms** — garante limpeza antes de navegar/reload
5. **Opções granulares** — usuário não é forçado a limpar tudo

---

## 📝 Extensibilidade

Adicionar novo estado de setup?

```typescript
// setupState.ts
const SETUP_KEYS = {
  // ... existing
  myNewState: "mangaba:my-new-state",  // ← add key
};

// Na LoadSetupState:
return {
  // ... existing
  myNewState: localStorage.getItem(SETUP_KEYS.myNewState) || defaultValue,
};

// Na clearSetupState:
Object.values(SETUP_KEYS).forEach((key) => {
  localStorage.removeItem(key); // ← automatically included
});
```

---

## 🧪 Testes Recomendados

```typescript
// setupState.test.ts (exemplo)
describe("setupState", () => {
  beforeEach(() => localStorage.clear());

  it("loadSetupState retorna defaults quando vazio", () => {
    const state = loadSetupState();
    expect(state.onboarding).toEqual({});
    expect(state.hints_dismissed).toEqual([]);
    expect(state.role).toBe("operador");
  });

  it("clearSetupState remove todas as chaves", () => {
    localStorage.setItem("mangaba:onboarding", "{}");
    clearSetupState();
    expect(localStorage.getItem("mangaba:onboarding")).toBeNull();
  });

  it("clearOnboarding mantém role", () => {
    localStorage.setItem("mangaba-perfil", "gestor");
    clearOnboarding();
    expect(localStorage.getItem("mangaba-perfil")).toBe("gestor");
  });
});
```

---

## ✅ Checklist de Implementação

- [x] `setupState.ts` — gerenciador centralizado
- [x] `SetupResetDialog.tsx` — UI com 2 opções
- [x] Integração em `SimpleSettings.tsx`
- [x] Loading state visual
- [x] Try/catch robustez
- [x] Delay 50ms pré-navegar
- [ ] Tests (criar conforme necessário)
- [ ] i18n se necessário
