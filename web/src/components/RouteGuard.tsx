import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { ROLE_META, canSee, useUserRole, type UserRole } from "@/lib/userRole";

/**
 * Guard de rota por perfil de usuário. Se a rota exige um perfil acima do ativo
 * (ex.: Operador tentando abrir /config pela URL), mostra um aviso amigável com
 * atalho para subir de perfil — em vez de renderizar a página.
 *
 * Observação: é um guardrail de UX (consistência), não segurança — o perfil é
 * uma preferência por navegador. Acesso de verdade depende do token de sessão.
 */
export function RouteGuard({
  minRole,
  children,
}: {
  minRole?: UserRole;
  children: ReactNode;
}) {
  const [role, setRole] = useUserRole();
  if (canSee(role, minRole)) return <>{children}</>;

  const need = minRole ? ROLE_META[minRole].label : "";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-current/5">
        <Lock className="h-6 w-6 text-text-tertiary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary">
          Seção indisponível no perfil {ROLE_META[role].label}
        </h2>
        <p className="max-w-md text-sm text-text-tertiary">
          Esta área requer o perfil <strong>{need}</strong> ou superior. Troque o
          perfil no menu lateral para acessá-la.
        </p>
      </div>
      {minRole && (
        <button
          type="button"
          onClick={() => setRole(minRole)}
          className="rounded-xl border border-current/15 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-current/5"
        >
          Mudar para {need}
        </button>
      )}
    </div>
  );
}
