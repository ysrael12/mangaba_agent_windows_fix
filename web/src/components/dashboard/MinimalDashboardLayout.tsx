import { Brain, Folder, Wrench, Radio, Settings, Copy, Loader2 } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { StatusDot } from "@/components/StatusDot";

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
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-current/10 bg-background-base p-5">
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-sm font-medium text-text-primary">{value}</div>
      {description && (
        <p className="line-clamp-2 text-xs text-text-tertiary">{description}</p>
      )}
      {footer && <div className="mt-auto pt-2">{footer}</div>}
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
        />
        <BentoCard
          icon={Folder}
          title="Conhecimento (RAG)"
          value={`${data.ragDocCount} arquivo${data.ragDocCount === 1 ? "" : "s"} vetorizado${data.ragDocCount === 1 ? "" : "s"}`}
        />
        <BentoCard
          icon={Wrench}
          title="Músculos"
          value={`${data.internalToolsCount} ferramentas · ${data.skillsCount} skills · ${data.mcpConnectionsCount} MCP`}
        />
        <BentoCard
          icon={Radio}
          title="Canais"
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
                onClick={() => navigator.clipboard?.writeText(connectedChannels[0].id)}
              >
                <Copy className="h-3 w-3" /> copiar token rápido
              </button>
            )
          }
        />
      </section>
    </div>
  );
}
