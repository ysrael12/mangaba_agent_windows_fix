import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { ModelPickerDialog } from "@/components/ModelPickerDialog";
import { api } from "@/lib/api";
import { brandModel } from "@/lib/modelBrand";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import type { AgentDraft } from "@/contexts/agent-draft-context";

export function slide1IsValid(draft: AgentDraft): boolean {
  return !!draft.model_config.model;
}

export function Slide1Model() {
  const { draft, updateDraft } = useAgentDraft();
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft.model_config.model) {
      setLoading(false);
      return;
    }
    api
      .getModelInfo()
      .then((info) => {
        updateDraft({ model_config: { provider: info.provider, model: info.model } });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Modelo atual</p>
          {loading ? (
            <Spinner className="mt-1" />
          ) : (
            <p className="truncate text-base font-medium text-text-primary">
              {draft.model_config.model ? brandModel(draft.model_config.model) : "Nenhum modelo configurado"}
              {draft.model_config.provider && (
                <span className="ml-1.5 text-sm text-text-tertiary">· {draft.model_config.provider}</span>
              )}
            </p>
          )}
        </div>
        <Button outlined onClick={() => setPickerOpen(true)}>
          Trocar modelo
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-sm text-text-secondary">
        Esse é o LLM que vai raciocinar por esse agente em todas as conversas e
        automações. Você pode trocar quando quiser — inclusive depois de publicado.
      </p>

      {pickerOpen && (
        <ModelPickerDialog
          loader={api.getModelOptions}
          alwaysGlobal
          title="Escolher modelo do agente"
          onApply={async ({ provider, model }) => {
            await api.setModelAssignment({ scope: "main", task: "", provider, model });
            updateDraft({ model_config: { provider, model } });
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
