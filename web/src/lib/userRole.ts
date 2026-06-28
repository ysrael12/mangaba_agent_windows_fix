import { useCallback, useEffect, useState } from "react";

/**
 * Perfis de usuário para agrupar as abas do dashboard por tipo de usuário.
 * Hierárquico: cada perfil enxerga as abas do seu nível e dos inferiores.
 *   operador (0) ⊂ gestor (1) ⊂ dev (2)
 *
 * O perfil ativo é por navegador (localStorage), trocável no seletor da sidebar.
 */
export type UserRole = "operador" | "gestor" | "dev";

export const ROLE_META: Record<UserRole, { label: string; rank: number; hint: string }> = {
  operador: { label: "Operador", rank: 0, hint: "Uso diário do bot" },
  gestor: { label: "Gestor", rank: 1, hint: "Cria e gerencia agentes" },
  dev: { label: "Dev / Admin", rank: 2, hint: "Acesso completo" },
};

export const ROLE_ORDER: UserRole[] = ["operador", "gestor", "dev"];

const STORAGE_KEY = "mangaba-perfil";
const CHANGE_EVENT = "mangaba:role-change";

export function getRole(): UserRole {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in ROLE_META) return stored as UserRole;
  } catch {
    // SSR / privacy mode
  }
  return "operador"; // padrão = painel enxuto (5 abas); usuário sobe p/ gestor/dev quando precisa
}

export function setRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** True se o perfil ativo pode ver uma aba cujo nível mínimo é `min`. */
export function canSee(active: UserRole, min?: UserRole): boolean {
  if (!min) return true; // sem minRole = visível a todos
  return ROLE_META[active].rank >= ROLE_META[min].rank;
}

/** Hook reativo: re-renderiza quando o perfil muda (em qualquer aba/componente). */
export function useUserRole(): [UserRole, (r: UserRole) => void] {
  const [role, setRoleState] = useState<UserRole>(getRole);
  useEffect(() => {
    const handler = () => setRoleState(getRole());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);
  const update = useCallback((r: UserRole) => setRole(r), []);
  return [role, update];
}
