import { useEffect, useState } from "react";
import { Brain, Folder, Wrench, Radio, Settings, Copy, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Checkbox } from "@dheiver2/ui/ui/components/checkbox";
import { StatusDot } from "@/components/StatusDot";
import { AgentChat } from "@/components/AgentChat";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface AgentDashboardChannel {
  id: string;
  label: string;
  emoji: string;
  connected: boolean;
}

export interface AgentDashboardData {
  agentId: string;
  online: boolean;
  model: { label: string; provider: string };
  soulPreview: string;
  ragDocCount: number;
  internalToolsCount: number;
  skillsCount: number;
  mcpConnectionsCount: number;
  channels: AgentDashboardChannel[];
}

interface Props {
  data: AgentDashboardData;
  onEdit: () => void;
}

function BentoCard({
  icon: Icon,
  title,
  value,
  description,
  footer,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
  to?: string;
}) {
  const navigate = useNavigate();
  const clickable = Boolean(to);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(to!) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") navigate(to!);
            }
          : undefined
      }
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-current/10 bg-background-base p-5",
        clickable &&
          "cursor-pointer transition-colors hover:border-current/25 hover:bg-current/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midground/40",
      )}
    >
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-xs font-medium uppercase tracking-wider">{title}</span>
        {clickable && <ChevronRight className="h-3.5 w-3.5" />}
      </div>
      <div className="text-sm font-medium text-text-primary">{value}</div>
      {description && (
        <p className="line-clamp-2 text-xs text-text-tertiary">{description}</p>
      )}
      {footer && <div className="mt-auto pt-2">{footer}</div>}
    </div>
  );
}

function BehaviorToggles() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  const toggle = async (key: string, next: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: next }));
    setSaving(key);
    try {
      await api.saveConfig({ [key]: next });
    } catch {
      setConfig((prev) => ({ ...prev, [key]: !next }));
    } finally {
      setSaving(null);
    }
  };

  const toolProgress = Boolean(config.tool_progress);
  const suggestQuestions = Boolean(config.suggest_questions);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-current/10 bg-background-base p-5">
      <div className="flex items-center gap-2 text-text-tertiary">
        <SlidersHorizontal className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Comportamento</span>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
        <span className="flex flex-col">
          Mostrar ferramentas usadas
          <span className="text-xs font-normal text-text-tertiary">
            Veja quais ferramentas o agente usou em cada resposta
          </span>
        </span>
        <Checkbox
          checked={toolProgress}
          onCheckedChange={() => void toggle("tool_progress", !toolProgress)}
          disabled={saving === "tool_progress"}
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
        <span className="flex flex-col">
          Sugerir perguntas
          <span className="text-xs font-normal text-text-tertiary">
            Receba sugestões de perguntas para continuar a conversa
          </span>
        </span>
        <Checkbox
          checked={suggestQuestions}
          onCheckedChange={() => void toggle("suggest_questions", !suggestQuestions)}
          disabled={saving === "suggest_questions"}
        />
      </label>
    </div>
  );
}

export function MinimalDashboardLayout({ data, onEdit }: Props) {
  const connectedChannels = data.channels.filter((c) => c.connected);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-2 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            {data.agentId}
          </h1>
          <div className="flex items-center gap-2">
            <StatusDot active={data.online} />
            <span className="text-sm text-text-secondary">
              {data.online ? "Online e operante" : "Offline"}
            </span>
          </div>
        </div>

        <Button outlined onClick={onEdit} prefix={<Settings className="h-3.5 w-3.5" />}>
          Editar configuração
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BentoCard
          icon={Brain}
          title="Cérebro"
          value={data.model.label}
          description={data.soulPreview}
          to="/configuracoes#modelo"
        />
        <BentoCard
          icon={Folder}
          title="Conhecimento (RAG)"
          value={`${data.ragDocCount} arquivo${data.ragDocCount === 1 ? "" : "s"} vetorizado${data.ragDocCount === 1 ? "" : "s"}`}
          to="/configuracoes#rag"
        />
        <BentoCard
          icon={Wrench}
          title="Músculos"
          value={`${data.internalToolsCount} ferramentas · ${data.skillsCount} skills · ${data.mcpConnectionsCount} MCP`}
          to="/configuracoes#ferramentas"
        />
        <BentoCard
          icon={Radio}
          title="Canais"
          to="/clients"
          value={
            connectedChannels.length === 0 ? (
              <span className="text-text-tertiary">nenhum canal conectado</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectedChannels.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                    title={c.label}
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {c.label}
                  </span>
                ))}
              </div>
            )
          }
          footer={
            connectedChannels.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(connectedChannels[0].id);
                }}
              >
                <Copy className="h-3 w-3" /> copiar token rápido
              </button>
            )
          }
        />
      </section>

      <BehaviorToggles />

      <section className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-current/10 bg-background-base">
        <AgentChat />
      </section>
    </div>
  );
}
