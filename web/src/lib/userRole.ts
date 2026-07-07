/**
 * Perfis de usuário — 3 roles internos (operador < gestor < dev), 2 na UI.
 *
 * O RoleSwitcher mostra apenas "Simples" (operador/gestor) e "Dev".
 * Persistência em localStorage("mangaba-perfil"); mudanças disparam o
 * evento "mangaba:role-change" para re-render reativo via useUserRole().
 */
import { useSyncExternalStore } from "react";

export type UserRole = "operador" | "gestor" | "dev";

export const ROLE_META: Record<
  UserRole,
  { label: string; rank: number; hint: string }
> = {
  operador: { label: "Simples", rank: 0, hint: "Uso diário" },
  gestor: { label: "Simples", rank: 1, hint: "Uso diário" },
  dev: { label: "Dev", rank: 2, hint: "Acesso completo" },
};

export const ROLE_ORDER: UserRole[] = ["operador", "gestor", "dev"];

const STORAGE_KEY = "mangaba-perfil";
const CHANGE_EVENT = "mangaba:role-change";

function isRole(value: unknown): value is UserRole {
  return value === "operador" || value === "gestor" || value === "dev";
}

export function getRole(): UserRole {
  // Por padrão, sempre "dev" — usuário não vê roles na UI
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isRole(stored)) return stored;
  } catch {
    /* storage indisponível (SSR/privacidade) — cai no padrão */
  }
  return "dev";
}

export function setRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** `true` se o role ativo pode ver um item com o minRole dado. */
export function canSee(active: UserRole, min?: UserRole): boolean {
  if (!min) return true;
  return ROLE_META[active].rank >= ROLE_META[min].rank;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  // Sincroniza entre abas do navegador também.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useUserRole(): [UserRole, (r: UserRole) => void] {
  const role = useSyncExternalStore(subscribe, getRole, () => "operador" as UserRole);
  return [role, setRole];
}
