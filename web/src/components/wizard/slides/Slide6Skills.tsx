import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Cloud, Loader2, Search, Sparkles, Wrench, X } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type ClawHubSkillResult } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { cn } from "@/lib/utils";

export function slide6IsValid(): boolean {
  return true;
}

export function Slide6Skills() {
  const { draft, updateDraft } = useAgentDraft();

  // — formulário de forja manual
  const [tool, setTool] = useState("");
  const [instruction, setInstruction] = useState("");
  const [action, setAction] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [forgeError, setForgeError] = useState<string | null>(null);

  // — geração assistida (IA propõe uma skill a partir da identidade do
  // funcionário agêntico + perfil de quem está criando)
  const [genPrompt, setGenPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const generate = async () => {
    setGenError(null);
    setGenerating(true);
    try {
      const r = await api.generateSkill({
        prompt: genPrompt.trim(),
        identity: {
          agent_name: draft.identity.agent_name,
          soul: draft.identity.soul,
        },
        creator_info: {
          name: draft.creator_info.name,
          role: draft.creator_info.role,
          context: draft.creator_info.context,
        },
      });
      setName(r.name);
      setTool(r.tool);
      setInstruction(r.instruction);
      setAction(r.action);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const canSave = name.trim().length > 0 && instruction.trim().length > 0 && !saving;

  const save = async () => {
    setForgeError(null);
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
          {
            id: r.name,
            tool: tool.trim(),
            instruction: instruction.trim(),
            action: action.trim(),
            source: "forge",
            slug: r.name,
          },
        ],
      });
      setName("");
      setTool("");
      setInstruction("");
      setAction("");
    } catch (e) {
      setForgeError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // — status do ClawHub
  const [clawhubConnected, setClawhubConnected] = useState<boolean | null>(null);

  useEffect(() => {
    api.checkClawhubStatus().then((s) => setClawhubConnected(s.connected)).catch(() => setClawhubConnected(false));
  }, []);

  // — busca no ClawHub
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClawHubSkillResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const installedSlugs = new Set(
    draft.skills.filter((s) => s.source === "clawhub").map((s) => s.slug),
  );

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearchError(null);
    try {
      const res = await api.searchClawHub(q, 20);
      setResults(res.results);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q || clawhubConnected === false) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch, clawhubConnected]);

  const install = async (slug: string) => {
    setInstalling(slug);
    setSearchError(null);
    try {
      const r = await api.installClawHubSkill(slug);
      const meta = results.find((s) => s.slug === slug);
      updateDraft({
        skills: [
          ...draft.skills,
          {
            id: r.name,
            tool: "",
            instruction: meta?.description ?? "",
            action: "",
            source: "clawhub",
            slug,
            description: meta?.description,
          },
        ],
      });
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(null);
    }
  };

  const removeInstalled = async (slug: string) => {
    try {
      await api.deleteSkill(slug);
    } catch {
      // se falhar, remove do draft mesmo assim
    }
    updateDraft({
      skills: draft.skills.filter((s) => s.slug !== slug),
    });
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
      {/* ── Esquerda: construtor manual ───────────────────────────── */}
      <div className="flex flex-col gap-4 overflow-y-auto border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <Label htmlFor="skill-gen-prompt" className="flex items-center gap-1.5 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Gerar com IA
          </Label>
          <p className="text-xs text-text-tertiary">
            O modelo propõe uma skill com base no nome/personalidade do funcionário agêntico e no
            perfil de quem está criando — descreva o que ela deve fazer (opcional) e revise antes
            de salvar.
          </p>
          <div className="flex gap-2">
            <Input
              id="skill-gen-prompt"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="Ex.: algo pra organizar pedidos de clientes"
              className="text-sm"
            />
            <Button
              onClick={generate}
              disabled={generating}
              prefix={generating ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
            >
              {generating ? "Gerando…" : "Gerar"}
            </Button>
          </div>
          {genError && <p className="text-sm text-destructive">{genError}</p>}
        </div>

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

        <div className="flex flex-1 flex-col gap-1.5">
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

        {forgeError && <p className="text-sm text-destructive">{forgeError}</p>}

        <Button onClick={save} disabled={!canSave} prefix={saving ? <Spinner /> : undefined}>
          {saving ? "Salvando…" : "Salvar habilidade"}
        </Button>
      </div>

      {/* ── Direita: busca no Catálogo + habilidades adquiridas ──── */}
      <div className="flex min-h-0 flex-col">
        {/* Banner de desconexão */}
        {clawhubConnected === false && (
          <div className="flex items-start gap-2 border-b border-border/60 bg-warning/10 px-4 py-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Conecte-se ao Catálogo para adquirir habilidades. Configure sua conta em{" "}
              <a
                href="https://clawhub.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                clawhub.ai
              </a>
              .
            </span>
          </div>
        )}

        {/* Busca */}
        <div className="relative border-b border-border/60 p-4">
          <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no Catálogo…"
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-3">
          {/* Skills instaladas */}
          {draft.skills.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Adquiridas ({draft.skills.length})
              </h3>
              <div className="flex flex-col gap-1.5">
                {draft.skills.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs text-text-secondary"
                  >
                    {s.source === "clawhub" ? (
                      <Cloud className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Wrench className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    )}
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    <span className="flex-1 truncate font-medium text-text-primary">{s.id}</span>
                    <Badge tone={s.source === "clawhub" ? "secondary" : "outline"}>
                      {s.source === "clawhub" ? "Catálogo" : "Adquirida"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removeInstalled(s.slug ?? s.id)}
                      className="ml-1 rounded p-0.5 text-text-tertiary hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultados do Catálogo */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {query ? `Resultados para "${query}"` : "Em alta no Catálogo"}
            </h3>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            )}

            {searchError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {searchError}
              </p>
            )}

            {!loading && !searchError && results.length === 0 && (
              <p className="py-8 text-center text-xs italic text-text-tertiary">
                Nenhuma habilidade encontrada.
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="flex flex-col gap-2">
                {results.map((skill) => {
                  const isInstalled = installedSlugs.has(skill.slug);
                  return (
                    <div
                      key={skill.slug}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                        isInstalled
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:border-border",
                      )}
                    >
                      <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {skill.name}
                          </span>
                          {skill.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} tone="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                          {skill.description}
                        </p>
                        {skill.stats && (
                          <div className="mt-1 flex gap-3 text-[10px] text-text-tertiary">
                            {skill.stats.downloads != null && (
                              <span>⬇ {skill.stats.downloads.toLocaleString()}</span>
                            )}
                            {skill.stats.stars != null && (
                              <span>⭐ {skill.stats.stars}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isInstalled ? (
                          <Badge tone="success" className="whitespace-nowrap text-[11px]">
                            ✔ Adquirida
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            outlined
                            onClick={() => install(skill.slug)}
                            disabled={installing === skill.slug}
                            prefix={
                              installing === skill.slug ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : undefined
                            }
                          >
                            {installing === skill.slug ? "…" : "Adquirir"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
