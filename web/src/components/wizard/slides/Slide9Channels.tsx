import { useEffect, useState } from "react";
import { Check, ExternalLink, Copy, Loader2 } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";

// Sempre válido — o agente já é testável pelo chat web mesmo sem nenhum
// canal externo conectado.
export function slide9IsValid(): boolean {
  return true;
}

const CHANNELS = [
  {
    id: "telegram",
    label: "Telegram",
    help: [
      "No Telegram, abra @BotFather e envie /newbot.",
      "Escolha um nome e um @usuário para o bot.",
      "Copie o token que o BotFather enviar e cole abaixo.",
    ],
    link: "https://t.me/BotFather",
  },
  {
    id: "discord",
    label: "Discord",
    help: [
      "Acesse discord.com/developers/applications → New Application.",
      "Em 'Bot', clique Reset Token e copie o token.",
      "Ative 'Message Content Intent' na mesma página.",
    ],
    link: "https://discord.com/developers/applications",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    help: [
      "Em developers.facebook.com, crie um App e adicione o produto WhatsApp.",
      "Em 'API Setup', copie o Token de acesso e o Phone number ID.",
      "Cole os dois abaixo e valide. Depois conecte para receber a URL do webhook.",
    ],
    link: "https://developers.facebook.com/apps/",
  },
  {
    id: "teams",
    label: "Teams",
    help: [
      "Em portal.azure.com, registre um app (Azure AD) e crie um Azure Bot.",
      "Copie o Client ID, o Client Secret e o Tenant ID.",
      "Cole os três, valide e conecte; depois registre o messaging endpoint no Azure Bot.",
    ],
    link: "https://portal.azure.com/",
  },
];

export function Slide9Channels() {
  const { draft, updateDraft } = useAgentDraft();
  const [channel, setChannel] = useState("telegram");
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [secret, setSecret] = useState("");
  const [tenant, setTenant] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name?: string; username?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [waInfo, setWaInfo] = useState<{ webhook_url: string; verify_token: string } | null>(null);
  const [teamsInfo, setTeamsInfo] = useState<{ messaging_endpoint: string; internal_port: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const isWhatsapp = channel === "whatsapp";
  const isTeams = channel === "teams";
  const ch = CHANNELS.find((c) => c.id === channel)!;

  useEffect(() => {
    api
      .getChannelsStatus()
      .then((r) => {
        const connected: typeof draft.channels = {};
        for (const c of r.channels) {
          connected[c.platform] = { connected: c.connected };
        }
        updateDraft({ channels: { ...draft.channels, ...connected } });
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setValidated(null);
    setWaInfo(null);
    setTeamsInfo(null);
    setError(null);
  }, [token, phoneId, secret, tenant, channel]);

  const validate = async () => {
    setValidating(true);
    setError(null);
    try {
      const r = (isWhatsapp
        ? await api.validateWhatsAppCloud(token.trim(), phoneId.trim())
        : isTeams
          ? await api.validateTeams(token.trim(), secret.trim(), tenant.trim())
          : await api.validateChannel(channel, token.trim())) as {
        ok: boolean;
        name?: string;
        username?: string;
        number?: string;
        error?: string;
      };
      if (r.ok) {
        setValidated({ name: r.name, username: isWhatsapp ? r.number : r.username });
      } else {
        setError(r.error || "Credenciais inválidas.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setValidating(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      if (isWhatsapp) {
        const r = await api.connectWhatsAppCloud(token.trim(), phoneId.trim());
        setWaInfo({ webhook_url: r.webhook_url, verify_token: r.verify_token });
      } else if (isTeams) {
        const r = await api.connectTeams(token.trim(), secret.trim(), tenant.trim());
        setTeamsInfo({ messaging_endpoint: r.messaging_endpoint, internal_port: r.internal_port });
      } else {
        await api.connectChannel(channel, token.trim());
      }
      updateDraft({ channels: { ...draft.channels, [channel]: { connected: true } } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard?.writeText(s);
  };

  if (statusLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="flex gap-2">
        {CHANNELS.map((c) => {
          const isConnected = draft.channels[c.id]?.connected;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannel(c.id)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                channel === c.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {c.label}
              {isConnected && <Check className="ml-1.5 inline h-3.5 w-3.5 text-success" />}
            </button>
          );
        })}
      </div>

      <ol className="list-decimal space-y-1 rounded-lg bg-muted/40 p-3 pl-7 text-xs text-muted-foreground">
        {ch.help.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
        <li>
          <a href={ch.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
            Abrir {ch.label} <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      </ol>

      <div className="flex flex-col gap-2">
        <Label htmlFor="channel-token">
          {isWhatsapp ? "Token de acesso (Cloud API)" : isTeams ? "Client ID (Azure AD)" : "Cole o token do bot"}
        </Label>
        <Input
          id="channel-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={
            channel === "telegram"
              ? "123456:ABC-DEF…"
              : isWhatsapp
                ? "EAAG… token da Meta"
                : isTeams
                  ? "00000000-0000-0000-0000-000000000000"
                  : "MTk4…token do Discord"
          }
          className="font-mono text-xs"
        />
        {isWhatsapp && (
          <>
            <Label htmlFor="wa-phone-id">Phone number ID</Label>
            <Input
              id="wa-phone-id"
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              placeholder="ex.: 123456789012345"
              className="font-mono text-xs"
            />
          </>
        )}
        {isTeams && (
          <>
            <Label htmlFor="teams-secret">Client Secret</Label>
            <Input
              id="teams-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="segredo do app Azure"
              className="font-mono text-xs"
            />
            <Label htmlFor="teams-tenant">Tenant ID</Label>
            <Input
              id="teams-tenant"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono text-xs"
            />
          </>
        )}

        <div className="flex justify-end">
          <Button
            outlined
            onClick={validate}
            disabled={
              validating || !token.trim() ||
              (isWhatsapp && !phoneId.trim()) ||
              (isTeams && (!secret.trim() || !tenant.trim()))
            }
          >
            {validating ? <Spinner /> : "Validar"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {validated && (
          <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground">
            <Check className="h-4 w-4 text-primary" />
            {isWhatsapp ? "Número verificado: " : isTeams ? "Credenciais válidas: " : "Bot conectado: "}
            <b>{validated.name}</b>
            {validated.username ? ` (${isWhatsapp ? "" : "@"}${validated.username})` : ""}
          </div>
        )}
      </div>

      {teamsInfo && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
          <p className="font-semibold text-foreground">Registre o endpoint no Azure Bot</p>
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-muted-foreground">Messaging endpoint</span>
            <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono-ui">{teamsInfo.messaging_endpoint}</code>
            <Button size="sm" outlined onClick={() => copy(teamsInfo.messaging_endpoint)} prefix={<Copy className="h-3.5 w-3.5" />}>
              Copiar
            </Button>
          </div>
        </div>
      )}

      {waInfo && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
          <p className="font-semibold text-foreground">Configure o webhook na Meta</p>
          {([["Callback URL", waInfo.webhook_url], ["Verify token", waInfo.verify_token]] as const).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-muted-foreground">{k}</span>
              <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono-ui">{v}</code>
              <Button size="sm" outlined onClick={() => copy(v)} prefix={<Copy className="h-3.5 w-3.5" />}>
                Copiar
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={connect} disabled={!validated || connecting}>
          {connecting ? "Conectando…" : `Conectar ${ch.label}`}
        </Button>
      </div>
    </div>
  );
}
