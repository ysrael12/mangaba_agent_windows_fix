// Status do agente em linguagem humana ("está funcionando?") — traduz health +
// canais para uma frase clara, com o próximo passo quando algo falta.
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { api } from "@/lib/api";

export function AgentStatus() {
  const navigate = useNavigate();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 10_000,
  });
  const channels = useQuery({
    queryKey: ["channels-status"],
    queryFn: () => api.getChannelsStatus(),
    refetchInterval: 15_000,
  });

  const loading = health.isLoading;
  const up = health.data?.gateway ?? false;
  const connected = (channels.data?.channels ?? []).filter((c) => c.connected && c.valid !== false);
  const channelNames = connected
    .map((c) => (c.platform === "telegram" ? "Telegram" : c.platform === "discord" ? "Discord" : c.platform))
    .join(" e ");

  let tone: "ok" | "warn" | "down" | "loading" = "loading";
  let title = "Verificando seu funcionário agêntico…";
  let detail = "";
  let action: { label: string; to: string } | null = null;

  if (!loading) {
    if (!up) {
      tone = "down";
      title = "Seu funcionário agêntico está parado";
      detail = "O cérebro não está rodando. Inicie para começar a responder.";
      action = { label: "Ver agentes", to: "/fleet" };
    } else if (connected.length === 0) {
      tone = "warn";
      title = "Seu agente está ligado, mas sem canal conectado";
      detail = "Conecte o Telegram ou o Discord para ele começar a atender.";
      action = { label: "Conectar canal", to: "/criar" };
    } else {
      tone = "ok";
      title = "Seu agente está no ar e respondendo";
      detail = `Atendendo no ${channelNames}.`;
    }
  }

  const styles = {
    loading: { box: "border-border bg-card", icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> },
    ok: { box: "border-primary/30 bg-primary/5", icon: <CheckCircle2 className="h-5 w-5 text-primary" /> },
    warn: { box: "border-warning/40 bg-warning/5", icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
    down: { box: "border-destructive/40 bg-destructive/5", icon: <XCircle className="h-5 w-5 text-destructive" /> },
  }[tone];

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${styles.box}`}>
      <span className="shrink-0">{styles.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
      {action && (
        <Button size="sm" onClick={() => navigate(action!.to)}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
