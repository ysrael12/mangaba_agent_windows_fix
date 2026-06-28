import { UserCog } from "lucide-react";
import { ROLE_ORDER, ROLE_META, useUserRole } from "@/lib/userRole";

/**
 * Seletor de perfil de usuário na sidebar. Filtra as abas por tipo de usuário
 * (Operador / Gestor / Dev). O perfil é salvo por navegador (localStorage).
 */
export function RoleSwitcher() {
  const [role, setRole] = useUserRole();
  return (
    <label className="flex items-center gap-2 rounded-lg border border-current/10 px-3 py-2 text-sm text-text-tertiary">
      <UserCog className="h-4 w-4 shrink-0" />
      <span className="sr-only">Perfil de usuário</span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        className="flex-1 cursor-pointer bg-transparent text-left text-text-secondary outline-none"
        title={ROLE_META[role].hint}
        aria-label="Perfil de usuário (filtra as abas)"
      >
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r}>
            {ROLE_META[r].label}
          </option>
        ))}
      </select>
    </label>
  );
}
