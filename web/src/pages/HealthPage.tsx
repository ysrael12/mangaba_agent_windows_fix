// Página de diagnóstico — traduz GET /api/health numa visão clara de saúde:
// gateway, modelo principal, providers auxiliares e info do sistema. Mostra
// exatamente o que está falhando (ex.: "modelo não responde no Ollama").
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { api, type ModelDiagnostic } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Ícone + tom para um estado de "responds": true/false/null. */
function statusVisual(responds: boolean | null) {
  if (responds === true)
    return { icon: CheckCircle2, tone: "text-emerald-500", label: "Respondendo" };
  if (responds === false)
    return { icon: XCircle, tone: "text-destructive", label: "Falhou" };
  return { icon: AlertTriangle, tone: "text-muted-foreground", label: "Não configurado" };
}

function ModelDiagnosticRow({ name, diag }: { name: string; diag: ModelDiagnostic }) {
  const v = statusVisual(diag.responds);
  const Icon = v.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 px-4 py-3">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", v.tone)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {diag.model && (
            <span className="truncate text-xs text-muted-foreground">
              {diag.model} · {diag.provider}
            </span>
          )}
        </div>
        {diag.error && (
          <p className="mt-1 text-xs text-destructive break-words">{diag.error}</p>
        )}
        {diag.responds === true && diag.response_time_ms != null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {diag.response_time_ms}ms
            {diag.server_type ? ` · ${diag.server_type}` : ""}
          </p>
        )}
      </div>
      <span className={cn("shrink-0 text-xs font-medium", v.tone)}>{v.label}</span>
    </div>
  );
}

export default function HealthPage() {
  const health = useQuery({
    queryKey: ["health-full"],
    queryFn: () => api.getHealth(),
    refetchInterval: 30_000,
  });

  const data = health.data;
  const auxEntries = data ? Object.entries(data.auxiliary) : [];
  const auxConfigured = auxEntries.filter(([, d]) => d.responds !== null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midground/10">
          <Activity className="h-5 w-5 text-midground" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-midground">Diagnóstico</h1>
          <p className="text-sm text-text-tertiary">
            Saúde do gateway, do modelo e dos serviços auxiliares.
          </p>
        </div>
        <Button
          outlined
          size="sm"
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
          prefix={
            health.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )
          }
        >
          Testar de novo
        </Button>
      </header>

      {health.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {health.isError && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Não foi possível carregar o diagnóstico</p>
            <p className="text-xs text-muted-foreground">
              {health.error instanceof Error ? health.error.message : "Erro desconhecido."}
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Resumo geral */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3",
              data.ok
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-warning/40 bg-warning/5",
            )}
          >
            {data.ok ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0 text-warning" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {data.ok
                  ? "Tudo operante"
                  : "Há algo para resolver"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.ok
                  ? "Gateway no ar e modelo respondendo."
                  : "Veja abaixo qual componente está falhando."}
              </p>
            </div>
          </div>

          {/* Gateway */}
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              <Server className="h-3.5 w-3.5" /> Gateway
            </h2>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
              {data.gateway ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">
                  {data.gateway ? "Rodando" : "Parado"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {data.gateway_state ? `Estado: ${data.gateway_state}` : "Motor de mensagens"}
                  {data.gateway_pid ? ` · PID ${data.gateway_pid}` : ""}
                </p>
              </div>
            </div>
          </section>

          {/* Modelo principal */}
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              <Cpu className="h-3.5 w-3.5" /> Modelo principal
            </h2>
            <ModelDiagnosticRow name="Cérebro do agente" diag={data.model.primary} />
          </section>

          {/* Auxiliares */}
          {auxConfigured.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                <Cpu className="h-3.5 w-3.5" /> Modelos auxiliares ({auxConfigured.length})
              </h2>
              <div className="flex flex-col gap-2">
                {auxConfigured.map(([slot, diag]) => (
                  <ModelDiagnosticRow key={slot} name={slot} diag={diag} />
                ))}
              </div>
              <p className="text-xs text-text-tertiary">
                Slots não listados usam o provider automático (herdando o modelo principal).
              </p>
            </section>
          )}

          {/* Sistema */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Sistema
            </h2>
            <div className="rounded-xl border border-border/60 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Versão da config</span>
                <span className="font-mono text-foreground">{data.system.config_version}</span>
              </div>
              <div className="mt-1 flex justify-between gap-4">
                <span>MANGABA_HOME</span>
                <span className="truncate font-mono text-foreground" title={data.system.mangaba_home}>
                  {data.system.mangaba_home}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
