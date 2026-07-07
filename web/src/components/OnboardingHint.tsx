import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Dica contextual (coachmark) que aparece uma vez por tipo.
 * Salva dismiss em localStorage("mangaba:hints-dismissed").
 */
interface HintProps {
  id: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  variant?: "info" | "success" | "warning";
}

export function OnboardingHint({ id, title, description, action, variant = "info" }: HintProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem("mangaba:hints-dismissed");
      const set = raw ? new Set(JSON.parse(raw)) : new Set<string>();
      return set.has(id);
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    try {
      const raw = localStorage.getItem("mangaba:hints-dismissed");
      const set = raw ? new Set(JSON.parse(raw)) : new Set<string>();
      set.add(id);
      localStorage.setItem("mangaba:hints-dismissed", JSON.stringify(Array.from(set)));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  const colors = {
    info: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", colors[variant])}>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="mt-1 text-xs opacity-90">{description}</p>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              dismiss();
            }}
            className="mt-2 inline-flex rounded px-2 py-1 text-xs font-medium hover:opacity-80 transition-opacity"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="mt-0.5 shrink-0 rounded p-1 hover:bg-current/10 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
