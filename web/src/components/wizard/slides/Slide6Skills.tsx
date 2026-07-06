import { useState } from "react";
import { Check, Wrench } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";

// Sempre válido — a forja de skills é opcional; o wizard não obriga o
// usuário a criar uma skill customizada para publicar o agente.
export function slide6IsValid(): boolean {
  return true;
}

export function Slide6Skills() {
  const { draft, updateDraft } = useAgentDraft();
  const [tool, setTool] = useState("");
  const [instruction, setInstruction] = useState("");
  const [action, setAction] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && instruction.trim().length > 0 && !saving;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const r = await api.forgeSkill({
        name: name.trim(),
        tool: tool.trim(),
        instruction: instruction.trim(),
        action: action.trim(),
      });
      updateDraft({
        skills: [
          ...draft.skills,
          { id: r.name, tool: tool.trim(), instruction: instruction.trim(), action: action.trim() },
        ],
      });
      setName("");
      setTool("");
      setInstruction("");
      setAction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
      {/* Esquerda — construtor de prompt */}
      <div className="flex flex-col gap-4 overflow-y-auto border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
        <div className="grid gap-1.5">
          <Label htmlFor="skill-name">Nome da skill</Label>
          <Input
            id="skill-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Buscar CEP"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="skill-tool">Ferramenta</Label>
          <Input
            id="skill-tool"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            placeholder="Ex.: http_get, base RAG, planilha…"
          />
        </div>

        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="skill-instruction">Instrução</Label>
          <textarea
            id="skill-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={6}
            placeholder="Quando o usuário perguntar sobre X, faça Y…"
            className="min-h-[120px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="skill-action">Ação esperada</Label>
          <Input
            id="skill-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Ex.: Responder com o endereço completo"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={save} disabled={!canSave} prefix={saving ? <Spinner /> : undefined}>
          {saving ? "Salvando…" : "Salvar skill"}
        </Button>
      </div>

      {/* Direita — histórico de skills criadas */}
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 p-6">
          <p className="text-sm text-text-tertiary">
            As skills criadas aqui ficam disponíveis para o agente após a publicação.
          </p>
        </div>

        <div className="max-h-40 shrink-0 overflow-y-auto border-t border-border/60 p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Skills criadas nesta sessão
          </h3>
          {draft.skills.length === 0 ? (
            <p className="text-xs italic text-text-tertiary">Nenhuma ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {draft.skills.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span className="truncate">{s.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
