import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { Switch } from "@dheiver2/ui/ui/components/switch";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Button } from "@dheiver2/ui/ui/components/button";
import { api } from "@/lib/api";
import type { SkillInfo, ToolsetInfo } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { cn } from "@/lib/utils";

// Sempre válido — o agente pode ser publicado sem nenhuma skill/ferramenta
// extra ligada (o núcleo do modelo já funciona sozinho).
export function slide5IsValid(): boolean {
  return true;
}

export function Slide5Tools() {
  const { updateDraft } = useAgentDraft();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [toolsets, setToolsets] = useState<ToolsetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [applyingSkills, setApplyingSkills] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadToolsets = () =>
    api.getToolsets().then((t) => {
      setToolsets(t);
      updateDraft({
        internal_tools: Object.fromEntries(t.map((ts) => [ts.name, ts.enabled])),
      });
      return t;
    });

  useEffect(() => {
    Promise.all([api.getSkills(), loadToolsets()])
      .then(([s]) => setSkills(s))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = async (preset: "all" | "minimal") => {
    setApplyingPreset(true);
    setError(null);
    try {
      await api.setToolsetsPreset(preset);
      await loadToolsets();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingPreset(false);
    }
  };

  const applySkillsPreset = async (enable: boolean) => {
    setApplyingSkills(true);
    setError(null);
    try {
      await Promise.all(
        skills
          .filter((s) => s.enabled !== enable)
          .map((s) => api.toggleSkill(s.name, enable)),
      );
      setSkills((prev) => prev.map((s) => ({ ...s, enabled: enable })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingSkills(false);
    }
  };

  const toggle = async (skill: SkillInfo) => {
    const next = !skill.enabled;
    setSkills((prev) => prev.map((s) => (s.name === skill.name ? { ...s, enabled: next } : s)));
    try {
      await api.toggleSkill(skill.name, next);
    } catch (e) {
      setSkills((prev) => prev.map((s) => (s.name === skill.name ? { ...s, enabled: !next } : s)));
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
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text-primary">Habilidades disponíveis</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={applyingSkills}
              onClick={() => applySkillsPreset(false)}
            >
              {applyingSkills ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Setup mínimo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={applyingSkills}
              onClick={() => applySkillsPreset(true)}
            >
              {applyingSkills ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar todas"}
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {skills.length === 0 && (
            <p className="text-sm italic text-text-tertiary">Nenhuma habilidade instalada ainda.</p>
          )}
          {skills.map((skill) => (
            <label
              key={skill.name}
              className="flex items-start gap-3 rounded-xl border border-border/60 p-3"
            >
              <Switch checked={skill.enabled} onCheckedChange={() => toggle(skill)} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">{skill.name}</span>
                <span className="block text-xs text-text-secondary line-clamp-2">
                  {skill.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text-primary">Ferramentas do ecossistema</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={applyingPreset}
              onClick={() => applyPreset("minimal")}
            >
              {applyingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Setup mínimo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={applyingPreset}
              onClick={() => applyPreset("all")}
            >
              {applyingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ativar tudo"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-text-tertiary">
          Ficam disponíveis automaticamente quando a chave de API correspondente
          está configurada em <a href="/env" className="underline">Chaves</a>.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {toolsets.map((ts) => (
            <div
              key={ts.name}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
            >
              <KeyRound
                className={cn(
                  "h-4 w-4 shrink-0",
                  ts.configured ? "text-success" : "text-text-tertiary",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">{ts.label}</span>
                <span className="block truncate text-xs text-text-secondary">{ts.description}</span>
              </span>
              <Badge tone={ts.configured ? "success" : "outline"}>
                {ts.configured ? "configurado" : "sem chave"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
