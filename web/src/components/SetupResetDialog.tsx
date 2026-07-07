import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { clearOnboarding, clearAgentDraft } from "@/lib/setupState";

/**
 * Modal de confirmação para reiniciar o onboarding.
 * O usuário escolhe entre:
 * - Recomeçar tudo (limpa checklist + hints + draft)
 * - Só recomeçar checklist (mantém role, draft)
 */
interface Props {
  open: boolean;
  onClose: () => void;
}

export function SetupResetDialog({ open, onClose }: Props) {
  const [resetting, setResetting] = useState(false);

  if (!open) return null;

  const handleClearOnboarding = async () => {
    setResetting(true);
    clearOnboarding();
    await new Promise((r) => setTimeout(r, 100));
    window.location.reload();
  };

  const handleClearAll = async () => {
    setResetting(true);
    clearOnboarding();
    clearAgentDraft();
    await new Promise((r) => setTimeout(r, 100));
    window.location.href = "/home";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reiniciar setup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-current/15 bg-background-base p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-midground">Reiniciar Setup</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Escolha o que deseja fazer:
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleClearOnboarding}
            disabled={resetting}
            className="w-full rounded-lg border border-current/15 px-4 py-3 text-left text-sm transition-colors hover:bg-current/5 disabled:opacity-50"
          >
            <div className="font-medium text-midground">🔄 Ver checklist novamente</div>
            <div className="mt-1 text-xs text-text-tertiary">
              Limpa as dicas e o checklist. Mantém seu role e draft.
            </div>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={resetting}
            className="w-full rounded-lg border border-current/15 px-4 py-3 text-left text-sm transition-colors hover:bg-current/5 disabled:opacity-50"
          >
            <div className="font-medium text-midground">♻️ Resetar tudo</div>
            <div className="mt-1 text-xs text-text-tertiary">
              Limpa checklist, dicas, e o agente em criação. Volta ao Início.
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button ghost onClick={onClose} disabled={resetting}>
            Cancelar
          </Button>
        </div>

        {resetting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background-base/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-midground" />
              <span className="text-xs text-text-tertiary">Reiniciando…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
