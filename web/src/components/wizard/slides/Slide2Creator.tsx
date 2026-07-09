import { useAgentDraft } from "@/contexts/useAgentDraft";
import type { AgentDraft } from "@/contexts/agent-draft-context";
import { Label } from "@/components/ui/label";

export function creatorIsValid(draft: AgentDraft): boolean {
  return draft.creator_info.name.trim().length > 0 || draft.creator_info.context.trim().length > 0;
}

export function Slide2Creator() {
  const { draft, updateDraft } = useAgentDraft();

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="creator-name">Seu nome</Label>
        <input
          id="creator-name"
          value={draft.creator_info.name}
          onChange={(e) =>
            updateDraft({ creator_info: { ...draft.creator_info, name: e.target.value } })
          }
          placeholder="Ex.: Maria Silva"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="creator-role">Sua função</Label>
        <input
          id="creator-role"
          value={draft.creator_info.role}
          onChange={(e) =>
            updateDraft({ creator_info: { ...draft.creator_info, role: e.target.value } })
          }
          placeholder="Ex.: Desenvolvedora, Product Manager, Pesquisador…"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="creator-context">Descreva o objetivo do agente que está criando</Label>
        <textarea
          id="creator-context"
          value={draft.creator_info.context}
          onChange={(e) =>
            updateDraft({ creator_info: { ...draft.creator_info, context: e.target.value } })
          }
          rows={5}
          placeholder="Ex.: Um assistente de vendas que ajuda o time comercial a qualificar leads e sugerir abordagens personalizadas com base no histórico do cliente."
          className="min-h-[120px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
