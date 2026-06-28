// Assistente "Criar agente em minutos" — fluxo único e guiado, sem terminal:
//   1) escolher um agente pronto (aplica a persona ao agente principal)
//   2) conectar um canal (Telegram/Discord) com validação AO VIVO do token
//   3) testar no chat
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Rocket, MessageSquare, Loader2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { AgentTemplate } from "@/lib/api";

type Step = 1 | 2 | 3;

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
];

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "border-2 border-primary text-primary"
              : "border border-border text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span className={`text-sm ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState<Step>(1);

  // Passo 1 — template
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Passo 2 — canal
  const [channel, setChannel] = useState<string>("telegram");
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState(""); // WhatsApp Cloud
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name?: string; username?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [waInfo, setWaInfo] = useState<{ webhook_url: string; verify_token: string } | null>(null);
  const isWhatsapp = channel === "whatsapp";

  useEffect(() => {
    api.getAgentTemplates().then((r) => setTemplates(r.templates)).catch(() => {});
  }, []);

  // reset validação ao trocar token/canal
  useEffect(() => {
    setValidated(null);
    setWaInfo(null);
  }, [token, phoneId, channel]);

  const applyTemplate = async () => {
    if (!chosen) return;
    setApplying(true);
    try {
      const tpl = await api.getAgentTemplate(chosen);
      await api.updateProfileSoul("default", tpl.persona);
      showToast(`Personalidade "${tpl.label}" aplicada ao seu agente.`, "success");
      setStep(2);
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    } finally {
      setApplying(false);
    }
  };

  const validate = async () => {
    setValidating(true);
    setValidated(null);
    try {
      const r = (isWhatsapp
        ? await api.validateWhatsAppCloud(token.trim(), phoneId.trim())
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
        showToast(r.error || "Credenciais inválidas.", "error");
      }
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    } finally {
      setValidating(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      if (isWhatsapp) {
        const r = await api.connectWhatsAppCloud(token.trim(), phoneId.trim());
        setWaInfo({ webhook_url: r.webhook_url, verify_token: r.verify_token });
        showToast("Credenciais salvas. Configure o webhook na Meta para concluir.", "success");
      } else {
        await api.connectChannel(channel, token.trim());
        showToast("Canal conectado! O agente está subindo…", "success");
        setStep(3);
      }
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    } finally {
      setConnecting(false);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard?.writeText(s);
    showToast("Copiado.", "success");
  };

  const ch = CHANNELS.find((c) => c.id === channel)!;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-1">
      <Toast toast={toast} />
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-primary" />
        <H2>Criar agente em minutos</H2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StepDot n={1} active={step === 1} done={step > 1} label="Agente pronto" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <StepDot n={2} active={step === 2} done={step > 2} label="Conectar canal" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <StepDot n={3} active={step === 3} done={false} label="Testar" />
      </div>

      {/* Passo 1 */}
      {step === 1 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Escolha um agente pronto para o seu negócio. A personalidade dele será aplicada ao seu agente principal (você pode ajustar depois em Perfis).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setChosen(tpl.id)}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                    chosen === tpl.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span className="text-xl" aria-hidden>{tpl.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{tpl.label}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{tpl.description}</span>
                  </span>
                  {chosen === tpl.id && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={applyTemplate} disabled={!chosen || applying}>
                {applying ? "Aplicando…" : "Continuar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 2 */}
      {step === 2 && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    channel === c.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
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
              <label className="text-xs font-medium text-foreground">
                {isWhatsapp ? "Token de acesso (Cloud API)" : "Cole o token do bot"}
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={
                  channel === "telegram"
                    ? "123456:ABC-DEF…"
                    : isWhatsapp
                      ? "EAAG… token da Meta"
                      : "MTk4…token do Discord"
                }
                className="rounded-md border border-input bg-background px-3 py-2 font-mono-ui text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {isWhatsapp && (
                <>
                  <label className="text-xs font-medium text-foreground">Phone number ID</label>
                  <input
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="ex.: 123456789012345"
                    className="rounded-md border border-input bg-background px-3 py-2 font-mono-ui text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </>
              )}
              <div className="flex justify-end">
                <Button
                  outlined
                  onClick={validate}
                  disabled={validating || !token.trim() || (isWhatsapp && !phoneId.trim())}
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
                </Button>
              </div>
              {validated && (
                <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {isWhatsapp ? "Número verificado: " : "Bot conectado: "}
                  <b>{validated.name}</b>
                  {validated.username ? ` (${isWhatsapp ? "" : "@"}${validated.username})` : ""}
                </div>
              )}
            </div>

            {/* Painel do webhook (WhatsApp Cloud) após conectar */}
            {waInfo && (
              <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Último passo: configure o webhook na Meta
                </p>
                <p className="text-muted-foreground">
                  No painel da Meta (App → WhatsApp → Configuration → Webhook), cole:
                </p>
                {([
                  ["Callback URL", waInfo.webhook_url],
                  ["Verify token", waInfo.verify_token],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-muted-foreground">{k}</span>
                    <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono-ui">{v}</code>
                    <Button size="sm" outlined onClick={() => copy(v)} prefix={<Copy className="h-3.5 w-3.5" />}>Copiar</Button>
                  </div>
                ))}
                <p className="text-muted-foreground">
                  Assine o campo <b>messages</b>. A URL precisa ser pública (HTTPS) — use o proxy de exposição.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button ghost onClick={() => setStep(1)}>Voltar</Button>
              {isWhatsapp && !waInfo ? (
                <Button onClick={connect} disabled={!validated || connecting}>
                  {connecting ? "Salvando…" : "Conectar"}
                </Button>
              ) : isWhatsapp && waInfo ? (
                <Button onClick={() => setStep(3)}>Concluí no Meta → testar</Button>
              ) : (
                <Button onClick={connect} disabled={!validated || connecting}>
                  {connecting ? "Conectando…" : "Conectar e continuar"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 3 */}
      {step === 3 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Seu agente está no ar! 🎉</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ele já responde no {ch.label}. Teste agora mesmo pelo chat ou mande uma mensagem ao bot.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate("/chat")} prefix={<MessageSquare className="h-4 w-4" />}>
                Testar no chat
              </Button>
              <Button outlined onClick={() => navigate("/profiles")}>
                Ajustar o agente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
