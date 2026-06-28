// Observabilidade — trace por turno + nota de qualidade (eval). Tendência 2026:
// traces + evals como parte do desenho do agente.
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, Gauge, ShieldCheck } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { AnimatedNumber } from "@/components/motion";
import { api } from "@/lib/api";
import type { GuardrailsConfig } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

function GuardrailsCard() {
  const { toast, showToast } = useToast();
  const [g, setG] = useState<GuardrailsConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getGuardrails().then(setG).catch(() => {});
  }, []);

  const save = async (next: GuardrailsConfig) => {
    setG(next);
    setSaving(true);
    try {
      await api.setGuardrails(next);
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!g) return null;
  const Toggle = ({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/30"
    >
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`block h-4 w-4 rounded-full bg-background transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );

  return (
    <Card>
      <Toast toast={toast} />
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Guardrail de saída</h3>
          <Badge tone={g.enabled ? "secondary" : "outline"} className="ml-auto text-xs">
            {g.enabled ? "Ativo" : "Desligado"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Inspeciona a resposta antes de enviar: redige PII (CPF, CNPJ, cartão, e-mail, telefone) e, opcionalmente, bloqueia conteúdo inseguro/fora do escopo.
        </p>
        <Toggle on={g.enabled} onClick={() => save({ ...g, enabled: !g.enabled })}
          label="Ativar guardrail" />
        {g.enabled && (
          <>
            <Toggle on={g.redact_pii} onClick={() => save({ ...g, redact_pii: !g.redact_pii })}
              label="Redigir PII" hint="Substitui dados sensíveis por [removido]" />
            <Toggle on={g.mode === "block"} onClick={() => save({ ...g, mode: g.mode === "block" ? "redact" : "block" })}
              label="Bloquear (em vez de redigir)" hint="Recusa a resposta inteira quando encontra PII" />
            <Toggle on={g.llm_check} onClick={() => save({ ...g, llm_check: !g.llm_check })}
              label="Checagem de segurança por IA" hint="1 chamada extra por turno; bloqueia conteúdo tóxico/fora do escopo" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function statusTone(s: string): "secondary" | "outline" | "destructive" {
  return s === "ok" ? "secondary" : s === "partial" ? "outline" : "destructive";
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">
          <AnimatedNumber value={value} />
          {suffix && <span className="ml-1 text-base text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ObservabilityPage() {
  const { toast, showToast } = useToast();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["traces"],
    queryFn: () => api.getTraces(100, 24),
    refetchInterval: 15_000,
  });

  const toggleEval = async () => {
    if (!data) return;
    try {
      const r = await api.setObservabilityEval(!data.eval_enabled);
      showToast(r.eval ? "Avaliação de qualidade ligada." : "Avaliação desligada.", "success");
      refetch();
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    }
  };

  const s = data?.stats;

  return (
    <div className="flex w-full max-w-full flex-col gap-4 p-1">
      <Toast toast={toast} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <H2>Observabilidade</H2>
        </div>
        <div className="flex items-center gap-2">
          <Button outlined size="sm" onClick={() => refetch()} prefix={<RefreshCw className="h-4 w-4" />}>
            Atualizar
          </Button>
          <Button
            size="sm"
            outlined={!data?.eval_enabled}
            onClick={toggleEval}
            disabled={!data}
            prefix={<Gauge className="h-4 w-4" />}
          >
            {data?.eval_enabled ? "Avaliação: ligada" : "Ligar avaliação"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Cada resposta do agente vira um trace (latência, tokens, ferramentas, status).
        Com a avaliação ligada, um modelo-juiz dá uma nota de 1–5 por resposta (custa
        uma chamada extra por turno).
      </p>

      <GuardrailsCard />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="text-2xl text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Turnos (24h)" value={s?.turns ?? 0} />
            <Stat label="Taxa de sucesso" value={s?.success_rate ?? 0} suffix="%" />
            <Stat label="Latência média" value={s?.avg_latency_ms ?? 0} suffix="ms" />
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Nota média</div>
                <div className="text-2xl font-semibold">
                  {s?.avg_score != null ? `${s.avg_score} / 5` : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {s?.scored ? `${s.scored} avaliadas` : "ligue a avaliação"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2">Quando</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2 text-right">Latência</th>
                    <th className="px-3 py-2 text-right">Tokens</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Nota</th>
                    <th className="px-3 py-2">Pergunta</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.traces ?? []).map((t) => (
                    <tr key={t.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {timeAgo(t.ts)}
                      </td>
                      <td className="px-3 py-2 text-xs">{t.platform || "—"}</td>
                      <td className="px-3 py-2 text-xs">{(t.model || "").split("/").slice(-1)[0]}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{t.latency_ms} ms</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {t.input_tokens + t.output_tokens}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge tone={statusTone(t.status)} className="text-[10px]">{t.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center text-xs" title={t.score_reason ?? ""}>
                        {t.score != null ? `${t.score}/5` : "—"}
                      </td>
                      <td className="max-w-[22rem] truncate px-3 py-2 text-xs text-muted-foreground" title={t.user_preview}>
                        {t.user_preview || "—"}
                      </td>
                    </tr>
                  ))}
                  {(data?.traces ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        Ainda sem traces. Converse com o agente para gerar dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
