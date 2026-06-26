import { useEffect, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/i18n";
import { StatusDot } from "@/components/StatusDot";
import { fetchJSON } from "@/lib/api";

interface PlatformInfo {
  platform: string;
  enabled: boolean;
  home_channel?: { chat_id: string; name?: string };
  has_token: boolean;
}

interface FleetMemberWithPlatforms {
  name: string;
  running: boolean;
  platforms?: PlatformInfo[];
}

interface FleetResponse {
  members: FleetMemberWithPlatforms[];
}

function platformEmoji(platform: string): string {
  const map: Record<string, string> = {
    telegram: "✈",
    discord: "🎮",
    slack: "💬",
    whatsapp: "📱",
    email: "📧",
    signal: "🔒",
  };
  return map[platform.toLowerCase()] ?? "🔌";
}

function CellStatus({
  info,
  noTokenLabel,
  hasTokenLabel,
  notConfiguredLabel,
}: {
  info: PlatformInfo | undefined;
  noTokenLabel: string;
  hasTokenLabel: string;
  notConfiguredLabel: string;
}) {
  if (!info) {
    return (
      <span className="text-muted-foreground text-sm">{notConfiguredLabel}</span>
    );
  }
  if (info.has_token) {
    return (
      <Badge tone="success" className="text-xs">
        ✅ {hasTokenLabel}
      </Badge>
    );
  }
  return (
    <Badge tone="warning" className="text-xs">
      ⚠ {noTokenLabel}
    </Badge>
  );
}

export default function RoutingPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<FleetMemberWithPlatforms[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast, showToast } = useToast();

  const { routing: rt } = t;
  const labelTitle = rt.title;
  const labelMatrix = rt.matrix;
  const labelExplanation = rt.explanation;
  const labelAddProfile = rt.addProfile;
  const labelProfileName = rt.profileName;
  const labelCreate = rt.create;
  const labelNoToken = rt.noToken;
  const labelHasToken = rt.hasToken;
  const labelNotConfigured = rt.notConfigured;

  useEffect(() => {
    setLoading(true);
    fetchJSON<FleetResponse>("/api/fleet")
      .then((data) => setMembers(data.members ?? []))
      .catch((e) => showToast(String(e), "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Collect all unique platforms across all members
  const allPlatforms = Array.from(
    new Set(
      members.flatMap((m) => (m.platforms ?? []).map((p) => p.platform)),
    ),
  ).sort();

  const handleCreate = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await fetchJSON("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      showToast(`Profile "${name}" criado com sucesso.`, "success");
      setNewProfileName("");
      setShowAddForm(false);
      // Recarrega a frota
      const data = await fetchJSON<FleetResponse>("/api/fleet");
      setMembers(data.members ?? []);
    } catch (e) {
      showToast(`Erro ao criar profile: ${(e as Error).message}`, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-6">
      <Toast toast={toast} />

      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
        <h1 className="font-mondwest text-display text-lg tracking-[0.08em]">
          {labelTitle}
        </h1>
      </div>

      {/* Routing rules panel */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{labelExplanation}</p>
        </CardContent>
      </Card>

      {/* Add profile */}
      <div className="flex items-center gap-2">
        <Button
          outlined
          size="sm"
          onClick={() => setShowAddForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {labelAddProfile}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Input
              placeholder={labelProfileName}
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              className="flex-1"
            />
            <Button
              onClick={() => void handleCreate()}
              disabled={creating || !newProfileName.trim()}
            >
              {creating ? (
                <Spinner className="mr-2 text-[0.875rem]" />
              ) : null}
              {labelCreate}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Matrix */}
      <div className="flex flex-col gap-2">
        <h2 className="font-mondwest text-display text-sm tracking-[0.08em] text-muted-foreground uppercase">
          {labelMatrix}
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum agente (profile) encontrado.
          </p>
        ) : allPlatforms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum canal configurado em nenhum profile.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Profile
                  </th>
                  {allPlatforms.map((p) => (
                    <th
                      key={p}
                      className="border border-border px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {platformEmoji(p)} {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const platformMap = new Map<string, PlatformInfo>(
                    (m.platforms ?? []).map((p) => [p.platform, p]),
                  );
                  return (
                    <tr key={m.name} className="hover:bg-secondary/20">
                      <td className="border border-border px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusDot active={m.running} className="h-2 w-2" />
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      {allPlatforms.map((p) => (
                        <td
                          key={p}
                          className="border border-border px-3 py-2 text-center"
                        >
                          <CellStatus
                            info={platformMap.get(p)}
                            noTokenLabel={labelNoToken}
                            hasTokenLabel={labelHasToken}
                            notConfiguredLabel={labelNotConfigured}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
