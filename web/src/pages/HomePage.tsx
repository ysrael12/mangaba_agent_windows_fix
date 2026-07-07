import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Code,
  FileText,
  History,
  KeyRound,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { OnboardingHint } from "@/components/OnboardingHint";
import { canSee, useUserRole, type UserRole } from "@/lib/userRole";

/**
 * Página inicial: checklist de primeiros passos + atalhos principais.
 * No modo Dev mostra também atalhos para as áreas avançadas.
 */
export default function HomePage() {
  const [role] = useUserRole();
  const [hints, setHints] = useState<string[]>([]);

  useEffect(() => {
    // Mostra hints contextuais baseado no perfil
    try {
      const dismissed = JSON.parse(localStorage.getItem("mangaba:hints-dismissed") || "[]");
      const dismissedSet = new Set(dismissed);
      const toShow: string[] = [];

      if (!dismissedSet.has("first-visit-welcome")) {
        toShow.push("first-visit-welcome");
      }
      if (canSee(role, "gestor") && !dismissedSet.has("can-create-agents")) {
        toShow.push("can-create-agents");
      }
      setHints(toShow);
    } catch {
      /* ignore */
    }
  }, [role]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {hints.includes("first-visit-welcome") && (
        <OnboardingHint
          id="first-visit-welcome"
          title="👋 Bem-vindo ao Mangaba!"
          description="Seu agente de IA está pronto. Comece conversando para entender as capacidades."
          variant="info"
        />
      )}

      {hints.includes("can-create-agents") && (
        <OnboardingHint
          id="can-create-agents"
          title="🚀 Você pode criar agentes personalizados"
          description="Cada agente pode ter sua própria personalidade e habilidades. Explore a criação quando estiver pronto."
          action={{
            label: "Saber mais",
            onClick: () => {},
          }}
          variant="success"
        />
      )}

      <OnboardingChecklist />

      <section aria-label="Ações rápidas" className="flex flex-col gap-4">
        <ShortcutCard
          icon={MessageSquare}
          title="Conversar com o agente"
          description="Comece sua primeira (ou próxima) conversa."
          to="/chat"
          cta="Abrir Chat"
          featured
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ShortcutCard
            icon={History}
            title="Minhas Sessões"
            description="Veja o histórico de conversas."
            to="/sessions"
            cta="Ver tudo"
          />
          <ShortcutCard
            icon={Sparkles}
            title="Criar agente"
            description="Personalize com sua própria IA."
            to="/criar"
            cta="Começar"
            minRole="gestor"
          />
        </div>
      </section>

      {canSee(role, "dev") && (
        <section
          aria-label="Modo avançado"
          className="rounded-2xl border border-current/15 p-6"
        >
          <h2 className="flex items-center gap-2 text-base font-semibold text-midground">
            <KeyRound className="h-5 w-5" />
            Modo Avançado (Dev)
          </h2>
          <p className="mt-2 text-sm text-text-tertiary">
            Você está no modo desenvolvedor. Aqui estão as ferramentas completas:
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DevLink icon={Settings} label="Configuração completa" to="/config" />
            <DevLink icon={Code} label="Conectar serviços" to="/clients" />
            <DevLink icon={Package} label="O que sabe fazer" to="/skills" />
            <DevLink icon={FileText} label="Logs do sistema" to="/logs" />
          </div>
        </section>
      )}
    </div>
  );
}

function ShortcutCard({
  icon: Icon,
  title,
  description,
  to,
  cta,
  featured = false,
  minRole,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  to: string;
  cta: string;
  featured?: boolean;
  minRole?: UserRole;
}) {
  const [role] = useUserRole();
  if (minRole && !canSee(role, minRole)) return null;

  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col gap-2 rounded-2xl border transition-all hover:border-midground/40 hover:shadow-lg",
        featured
          ? "border-midground/20 bg-gradient-to-br from-midground/5 to-background-base p-6 sm:p-7"
          : "border-current/15 p-5",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl",
          featured ? "h-12 w-12 bg-midground/15" : "h-10 w-10 bg-midground/10",
        )}
      >
        <Icon className={cn("text-midground", featured ? "h-6 w-6" : "h-5 w-5")} />
      </span>
      <h3 className={cn("text-midground", featured ? "text-base font-semibold" : "text-sm font-semibold")}>
        {title}
      </h3>
      <p className={cn("text-text-secondary", featured ? "text-sm" : "text-sm")}>
        {description}
      </p>
      <span
        className={cn(
          "mt-auto inline-flex w-fit rounded-lg border border-current/15 px-3 py-1.5 text-xs font-medium text-midground transition-colors hover:bg-midground/10",
          featured && "border-midground/30 bg-midground/10",
        )}
      >
        {cta}
      </span>
    </Link>
  );
}

function DevLink({
  icon: Icon,
  label,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-2 rounded-xl border border-current/10 px-3 py-2 text-sm text-text-secondary transition-all hover:border-midground/20 hover:bg-midground/5 hover:text-midground"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      <span aria-hidden className="absolute inset-0 rounded-xl bg-midground opacity-0 pointer-events-none transition-opacity group-hover:opacity-5" />
    </Link>
  );
}
