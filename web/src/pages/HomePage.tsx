import { type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  History,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

/**
 * Página inicial: checklist de primeiros passos + atalhos principais.
 * No modo Dev mostra também atalhos para as áreas avançadas.
 */
export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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
            title="Criar funcionário agêntico"
            description="Personalize o perfil e as habilidades do seu assistente."
            to="/criar"
            cta="Começar"
          />
        </div>
      </section>
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
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  to: string;
  cta: string;
  featured?: boolean;
}) {
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

