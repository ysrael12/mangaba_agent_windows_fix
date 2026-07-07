/**
 * Gerencia o estado de setup/onboarding.
 * Encapsula todas as chaves de localStorage relacionadas a setup.
 */

const SETUP_KEYS = {
  onboarding: "mangaba:onboarding",
  hints_dismissed: "mangaba:hints-dismissed",
  agent_draft: "mangaba-agent-draft",
  role: "mangaba-perfil",
  last_simple_role: "mangaba-perfil-simples",
} as const;

export interface SetupState {
  onboarding: Record<string, boolean>;
  hints_dismissed: string[];
  agent_draft: unknown;
  role: string;
  last_simple_role: string;
}

/** Carrega o estado completo de setup. */
export function loadSetupState(): SetupState {
  try {
    return {
      onboarding: JSON.parse(localStorage.getItem(SETUP_KEYS.onboarding) || "{}"),
      hints_dismissed: JSON.parse(localStorage.getItem(SETUP_KEYS.hints_dismissed) || "[]"),
      agent_draft: JSON.parse(localStorage.getItem(SETUP_KEYS.agent_draft) || "null"),
      role: localStorage.getItem(SETUP_KEYS.role) || "operador",
      last_simple_role: localStorage.getItem(SETUP_KEYS.last_simple_role) || "operador",
    };
  } catch {
    return {
      onboarding: {},
      hints_dismissed: [],
      agent_draft: null,
      role: "operador",
      last_simple_role: "operador",
    };
  }
}

/** Limpa todo o estado de setup (volta ao zero). */
export function clearSetupState(): void {
  try {
    Object.values(SETUP_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    /* ignore */
  }
}

/** Limpa só o onboarding (mantém role, draft, etc). */
export function clearOnboarding(): void {
  try {
    localStorage.removeItem(SETUP_KEYS.onboarding);
    localStorage.removeItem(SETUP_KEYS.hints_dismissed);
  } catch {
    /* ignore */
  }
}

/** Limpa só o draft do agente (vai para o wizard limpo). */
export function clearAgentDraft(): void {
  try {
    localStorage.removeItem(SETUP_KEYS.agent_draft);
  } catch {
    /* ignore */
  }
}

/** Reseta tudo E volta para a HomePage. */
export async function restartSetup(): Promise<void> {
  clearSetupState();
  // Aguarda um tick para garantir limpeza antes de navegar
  await new Promise((r) => setTimeout(r, 50));
  window.location.href = "/home";
}

/** Reseta onboarding E recarrega a página. */
export async function restartOnboarding(): Promise<void> {
  clearOnboarding();
  await new Promise((r) => setTimeout(r, 50));
  window.location.reload();
}
