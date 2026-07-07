import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { canSee, setRole, useUserRole, type UserRole } from "@/lib/userRole";

/**
 * Bloqueia a rota quando o perfil ativo não tem acesso (canSee=false).
 * Mostra um aviso amigável com atalho para trocar para o modo Dev.
 */
export function RouteGuard({
  minRole,
  children,
}: {
  minRole?: UserRole;
  children: ReactNode;
}) {
  const [role] = useUserRole();

  if (canSee(role, minRole)) return <>{children}</>;

  return (
    <div className="flex justify-center py-20">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-current/15 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-midground/10">
          <Lock className="h-6 w-6 text-midground" />
        </span>
        <h2 className="text-lg font-semibold text-midground">Acesso restrito</h2>
        <p className="text-sm text-text-secondary">
          Esta página requer o modo <strong>Dev</strong>. Troque seu perfil no
          menu lateral para acessar.
        </p>
        <Button onClick={() => setRole("dev")}>Trocar para Dev</Button>
      </div>
    </div>
  );
}
