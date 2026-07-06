import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  MinimalDashboardLayout,
  type AgentDashboardData,
} from "@/components/dashboard/MinimalDashboardLayout";
import { api } from "@/lib/api";
import { brandModel } from "@/lib/modelBrand";

const CHANNEL_META: Record<string, { label: string; emoji: string }> = {
  telegram: { label: "Telegram", emoji: "✈" },
  discord: { label: "Discord", emoji: "🎮" },
  whatsapp: { label: "WhatsApp", emoji: "📱" },
  teams: { label: "Teams", emoji: "🧩" },
  email: { label: "E-mail", emoji: "📧" },
};

async function loadDashboardData(agentId: string): Promise<AgentDashboardData> {
  const [health, modelInfo, soul, ragFiles, skills, toolsets, mcp, channelsStatus] =
    await Promise.all([
      api.getHealth().catch(() => null),
      api.getModelInfo().catch(() => null),
      api.getProfileSoul("default").catch(() => ({ content: "", exists: false })),
      api.getRagFiles().catch(() => ({ files: [] })),
      api.getSkills().catch(() => []),
      api.getToolsets().catch(() => []),
      api.listMcpServers().catch(() => ({ servers: [] })),
      api.getChannelsStatus().catch(() => ({ channels: [] })),
    ]);

  const soulFirstLine = soul.content.trim().split("\n")[0] || "Nenhuma soul definida ainda.";

  const channels = [
    { id: "web", label: "Web (chat)", emoji: "💬", connected: true },
    ...channelsStatus.channels.map((c) => ({
      id: c.platform,
      label: CHANNEL_META[c.platform]?.label ?? c.platform,
      emoji: CHANNEL_META[c.platform]?.emoji ?? "🔌",
      connected: c.connected,
    })),
  ];

  return {
    agentId,
    online: !!health?.gateway,
    model: {
      label: modelInfo ? brandModel(modelInfo.model) : "Não configurado",
      provider: modelInfo?.provider ?? "",
    },
    soulPreview: soulFirstLine,
    ragDocCount: ragFiles.files.length,
    internalToolsCount: toolsets.filter((t) => t.enabled).length,
    skillsCount: skills.filter((s) => s.enabled).length,
    mcpConnectionsCount: mcp.servers.length,
    channels,
  };
}

export default function AgentDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agentId = id ?? "default";
  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData(agentId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return <MinimalDashboardLayout data={data} onEdit={() => navigate("/criar/wizard")} />;
}
