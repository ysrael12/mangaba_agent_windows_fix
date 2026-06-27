import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  KeyRound,
  Copy,
  Ban,
  Code,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { ApiClient, ApiKey } from "@/lib/api";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [model, setModel] = useState("");
  const [persona, setPersona] = useState("");
  const [limit, setLimit] = useState("");
  const [plan, setPlan] = useState("free");
  const [busy, setBusy] = useState(false);
  const { toast, showToast } = useToast();

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createClient({
        name: name.trim(),
        email: email.trim(),
        model: model.trim(),
        persona: persona.trim(),
        plan,
        daily_token_limit: parseInt(limit || "0", 10) || 0,
      });
      setName(""); setEmail(""); setModel(""); setPersona(""); setLimit(""); setPlan("free");
      setOpen(false);
      onCreated();
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} prefix={<Plus className="h-4 w-4" />}>
        Novo cliente
      </Button>
    );
  }

  return (
    <Card>
      <Toast toast={toast} />
      <CardContent className="flex flex-col gap-3 p-4">
        <h3 className="text-base font-semibold">Novo cliente</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome *"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo (vazio = padrão)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plano"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="free">Free (10 req/min · 100K tokens/dia)</option>
            <option value="pro">Pro (60 req/min · 2M tokens/dia)</option>
            <option value="enterprise">Enterprise (600 req/min · ilimitado)</option>
            <option value="custom">Custom (defina abaixo)</option>
          </select>
          <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min={0}
            placeholder="Limite tokens/dia (0 = padrão do plano)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <textarea value={persona} onChange={(e) => setPersona(e.target.value)} rows={2}
          placeholder="Persona / instruções (white-label — ex.: 'Você é o assistente da ACME...')"
          className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        <div className="flex justify-end gap-2">
          <Button outlined size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button size="sm" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "Criando…" : "Criar cliente"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientCard({
  client,
  baseUrl,
  onChanged,
}: {
  client: ApiClient;
  baseUrl: string;
  onChanged: () => void;
}) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const loadKeys = useCallback(() => {
    api.listClientKeys(client.id).then((r) => setKeys(r.keys)).catch(() => setKeys([]));
  }, [client.id]);

  useEffect(() => {
    if (expanded && keys === null) loadKeys();
  }, [expanded, keys, loadKeys]);

  const mintKey = async () => {
    try {
      const k = await api.createClientKey(client.id);
      setNewKey(k.key);
      loadKeys();
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    }
  };

  const revoke = async (keyId: string) => {
    await api.revokeClientKey(keyId);
    loadKeys();
  };

  const toggleSuspend = async () => {
    await api.updateClient(client.id, {
      status: client.status === "active" ? "suspended" : "active",
    });
    onChanged();
  };

  const del = async () => {
    if (!confirm(`Excluir o cliente "${client.name}" e todas as suas chaves?`)) return;
    await api.deleteClient(client.id);
    onChanged();
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast("Copiado.", "success");
  };

  const snippet = (key: string) =>
    `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"mangaba","messages":[{"role":"user","content":"Olá!"}]}'`;

  const overLimit =
    client.daily_token_limit > 0 && (client.used_today ?? 0) >= client.daily_token_limit;

  return (
    <Card>
      <Toast toast={toast} />
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold">{client.name}</h3>
              <Badge tone={client.status === "active" ? "secondary" : "destructive"} className="text-xs">
                {client.status === "active" ? "Ativo" : "Suspenso"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {client.email || "sem e-mail"} · {client.model || "modelo padrão"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="outline" className="text-[10px] uppercase">{client.plan || "free"}</Badge>
              {client.limits ? (
                <span className="text-[11px] text-muted-foreground">
                  {client.limits.rpm ? `${client.limits.rpm} req/min` : "req/min ilimitado"}
                  {" · "}
                  {client.limits.daily_token_limit
                    ? `${fmtTokens(client.limits.daily_token_limit)} tok/dia`
                    : "tokens ilimitados"}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button outlined size="sm" onClick={toggleSuspend} prefix={<Ban className="h-3.5 w-3.5" />}>
              {client.status === "active" ? "Suspender" : "Reativar"}
            </Button>
            <Button outlined size="sm" destructive onClick={del} prefix={<Trash2 className="h-3.5 w-3.5" />}>
              Excluir
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Chaves ativas: <b className="text-foreground">{client.active_keys ?? 0}</b></span>
          <span>
            Uso hoje:{" "}
            <b className={overLimit ? "text-destructive" : "text-foreground"}>
              {fmtTokens(client.used_today ?? 0)}
              {client.daily_token_limit > 0 ? ` / ${fmtTokens(client.daily_token_limit)}` : ""}
            </b>
          </span>
          <span>Conversas hoje: <b className="text-foreground">{client.turns_today ?? 0}</b></span>
        </div>

        {client.persona ? (
          <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground line-clamp-2">
            Persona: {client.persona}
          </p>
        ) : null}

        {newKey && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
            <p className="mb-1 font-semibold text-foreground">
              Chave criada — copie agora, ela não será mostrada de novo:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono-ui">{newKey}</code>
              <Button size="sm" onClick={() => copy(newKey)} prefix={<Copy className="h-3.5 w-3.5" />}>Copiar</Button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">Ver exemplo de uso (curl)</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-background p-2 font-mono-ui text-[11px]">{snippet(newKey)}</pre>
            </details>
            <button onClick={() => setNewKey(null)} className="mt-2 text-muted-foreground underline">fechar</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-muted-foreground underline">
            {expanded ? "Ocultar chaves" : "Gerenciar chaves"}
          </button>
          <Button size="sm" onClick={mintKey} prefix={<KeyRound className="h-3.5 w-3.5" />}>
            Gerar chave
          </Button>
        </div>

        {expanded && (
          <div className="flex flex-col gap-1">
            {keys === null ? (
              <Spinner className="h-4 w-4" />
            ) : keys.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma chave ainda.</p>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-xs">
                  <span className="font-mono-ui">
                    mk_live_…{k.last4}{" "}
                    <Badge tone={k.status === "active" ? "secondary" : "outline"} className="ml-1 text-[10px]">
                      {k.status === "active" ? "ativa" : "revogada"}
                    </Badge>
                  </span>
                  {k.status === "active" && (
                    <button onClick={() => revoke(k.id)} className="text-destructive underline">revogar</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ApiClient[] | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const { toast, showToast } = useToast();

  const load = useCallback(() => {
    api.listClients().then((r) => setClients(r.clients)).catch((e) =>
      showToast(`Erro: ${(e as Error).message}`, "error"),
    );
    api.getApiInfo().then((i) => setBaseUrl(i.base_url)).catch(() => {});
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex w-full max-w-full flex-col gap-4 p-1">
      <Toast toast={toast} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <H2>Clientes & API</H2>
        </div>
        <div className="flex items-center gap-2">
          <Button outlined size="sm" onClick={load} prefix={<RefreshCw className="h-4 w-4" />}>Atualizar</Button>
          <NewClientForm onCreated={load} />
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Code className="h-4 w-4 shrink-0" />
        Seus clientes consomem o agente pela API OpenAI-compatível em{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono-ui text-xs">{baseUrl || "…"}</code>
        . Cada cliente tem chave, modelo, persona e teto próprios.
      </p>

      {clients === null ? (
        <div className="flex justify-center py-16"><Spinner className="text-2xl text-primary" /></div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum cliente ainda. Crie o primeiro com “Novo cliente”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} baseUrl={baseUrl} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
