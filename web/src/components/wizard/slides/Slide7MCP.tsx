import { useEffect, useState } from "react";
import { Loader2, Plug, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { McpServerInfo } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";

// Sempre válido — MCP é uma automação opcional.
export function slide7IsValid(): boolean {
  return true;
}

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

export function Slide7MCP() {
  const { draft, updateDraft } = useAgentDraft();
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testState, setTestState] = useState<Record<string, TestState>>({});

  const refresh = async () => {
    const r = await api.listMcpServers();
    setServers(r.servers);
    updateDraft({
      mcp_connections: r.servers.map((s) => ({
        id: s.name,
        name: s.name,
        url: s.url,
        connected: false,
      })),
    });
  };

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addServer = async () => {
    setError(null);
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await api.addMcpServer({ name: name.trim(), url: url.trim() });
      setName("");
      setUrl("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const removeServer = async (serverName: string) => {
    setError(null);
    try {
      await api.deleteMcpServer(serverName);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const testServer = async (serverName: string) => {
    setTestState((prev) => ({ ...prev, [serverName]: { status: "testing" } }));
    try {
      const r = await api.testMcpServer(serverName);
      if (r.ok) {
        const n = r.tools?.length ?? 0;
        setTestState((prev) => ({
          ...prev,
          [serverName]: { status: "ok", message: `${n} ferramenta${n === 1 ? "" : "s"} encontrada${n === 1 ? "" : "s"}` },
        }));
        updateDraft({
          mcp_connections: draft.mcp_connections.map((c) =>
            c.name === serverName ? { ...c, connected: true } : c,
          ),
        });
      } else {
        setTestState((prev) => ({ ...prev, [serverName]: { status: "error", message: r.error } }));
      }
    } catch (e) {
      setTestState((prev) => ({
        ...prev,
        [serverName]: { status: "error", message: e instanceof Error ? e.message : String(e) },
      }));
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
      <p className="text-sm text-text-secondary">
        Conecte um servidor MCP externo pela URL. Presets dedicados para Google
        Drive/Calendar e Microsoft 365 (com login OAuth) ainda não estão
        disponíveis — use a URL de um servidor MCP já publicado.
      </p>

      <div className="flex flex-col gap-2 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="mcp-name">Nome</Label>
          <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: minha-planilha" />
        </div>
        <div className="grid flex-[2] gap-1.5">
          <Label htmlFor="mcp-url">URL do servidor MCP</Label>
          <Input
            id="mcp-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/mcp"
          />
        </div>
        <Button onClick={addServer} disabled={adding || !name.trim() || !url.trim()}>
          {adding ? <Spinner /> : "Conectar"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        {servers.length === 0 ? (
          <p className="text-sm italic text-text-tertiary">Nenhum servidor MCP conectado ainda.</p>
        ) : (
          servers.map((s) => {
            const t = testState[s.name] ?? { status: "idle" as const };
            return (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <Plug className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{s.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{s.url || s.command}</span>
                  {t.status === "ok" && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> {t.message}
                    </span>
                  )}
                  {t.status === "error" && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3 w-3" /> {t.message}
                    </span>
                  )}
                </span>
                <Button outlined size="sm" onClick={() => testServer(s.name)} disabled={t.status === "testing"}>
                  {t.status === "testing" ? <Spinner /> : "Testar"}
                </Button>
                <Button ghost size="icon" onClick={() => removeServer(s.name)} aria-label={`Remover ${s.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
