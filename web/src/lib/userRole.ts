/**
 * Perfil único "simples" — sem switcher de roles.
 * Todas as abas ficam visíveis para todos os usuários.
 */
export type UserRole = "simples";
export const ROLE_META: Record<UserRole, { label: string }> = {
  simples: { label: "Simples" },
};
export const ROLE_ORDER: UserRole[] = ["simples"];
export function getRole(): UserRole { return "simples"; }
export function setRole(_role: UserRole): void {}
export function canSee(_active: UserRole, _min?: UserRole): boolean { return true; }
export function useUserRole(): [UserRole, (r: UserRole) => void] {
  return ["simples", () => {}];
}
