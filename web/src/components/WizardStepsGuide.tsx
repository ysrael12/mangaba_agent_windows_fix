import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SLIDE_DEFS } from "@/components/wizard/slideDefs";
import { cn } from "@/lib/utils";

export function WizardStepsGuide() {
  return (
    <section
      aria-label="Guia de Configuração"
      className="rounded-2xl border border-current/15 p-6"
    >
      <h2 className="text-base font-semibold text-midground mb-4">
        Guia de Configuração do Agente
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Siga os 10 passos para criar um agente personalizado:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SLIDE_DEFS.map((slide) => (
          <div
            key={slide.id}
            className="flex items-start gap-3 rounded-xl border border-current/10 p-3 hover:border-midground/30 transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-midground/15 text-xs font-semibold text-midground">
              {slide.id}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">
                {slide.title}
              </p>
              <p className="text-xs text-text-tertiary line-clamp-2">
                {slide.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to="/criar"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-midground/30 bg-midground/10",
            "px-4 py-2 text-sm font-medium text-midground",
            "transition-colors hover:bg-midground/20",
          )}
        >
          Criação de Funcionários Agênticos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
