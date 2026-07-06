import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import type { AgentDraft } from "@/contexts/agent-draft-context";

// Profile único suportado por enquanto — ver .plans/agent-wizard-builder.md.
const AGENT_ID = "default";

export function slide3IsValid(draft: AgentDraft): boolean {
  return draft.identity.agent_name.trim().length > 0;
}

export function Slide3Identity() {
  const { draft, updateDraft } = useAgentDraft();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft.identity.agent_name || draft.identity.soul) {
      setLoading(false);
      return;
    }
    Promise.all([api.getAgentIdentity(), api.getProfileSoul(AGENT_ID)])
      .then(([identity, soul]) => {
        updateDraft({
          identity: { agent_name: identity.display_name, soul: soul.content },
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async (value: string) => {
    setSaving(true);
    try {
      await api.setAgentIdentity(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveSoul = async (value: string) => {
    try {
      await api.updateProfileSoul(AGENT_ID, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="agent-name">Nome do agente</Label>
        <Input
          id="agent-name"
          value={draft.identity.agent_name}
          onChange={(e) =>
            updateDraft({ identity: { ...draft.identity, agent_name: e.target.value } })
          }
          onBlur={(e) => saveName(e.target.value)}
          placeholder="Ex.: Assistente Comercial"
        />
        {saving && <span className="text-xs text-text-tertiary">Salvando…</span>}
      </div>

      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="agent-soul">A Soul — system prompt mestre</Label>
        <textarea
          id="agent-soul"
          value={draft.identity.soul}
          onChange={(e) =>
            updateDraft({ identity: { ...draft.identity, soul: e.target.value } })
          }
          onBlur={(e) => saveSoul(e.target.value)}
          rows={10}
          placeholder="Você é um assistente cordial e objetivo, especializado em…"
          className="min-h-[200px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
