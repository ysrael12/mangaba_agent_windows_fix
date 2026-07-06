import { useEffect, useState } from "react";
import { Check, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { CronScheduleResolution } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";

// Sempre válido — o heartbeat é uma automação opcional.
export function slide8IsValid(): boolean {
  return true;
}

function formatNextRun(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function Slide8Heartbeat() {
  const { draft, updateDraft } = useAgentDraft();
  const [whenText, setWhenText] = useState(draft.heartbeat.raw_text);
  const [taskText, setTaskText] = useState("");
  const [resolution, setResolution] = useState<CronScheduleResolution | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [manualSchedule, setManualSchedule] = useState("");
  const [manualResolution, setManualResolution] = useState<CronScheduleResolution | null>(null);
  const [validatingManual, setValidatingManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const text = whenText.trim();
    if (!text) {
      setResolution(null);
      return;
    }
    setInterpreting(true);
    const timer = setTimeout(() => {
      api
        .interpretHeartbeat(text)
        .then((r) => {
          setResolution(r);
          if (r.ok && r.schedule) {
            updateDraft({
              heartbeat: {
                raw_text: whenText,
                schedule: { kind: (r.kind as "cron" | "every" | "once") ?? "cron", expr: r.schedule, display: r.display ?? "" },
              },
            });
          }
        })
        .catch((e) => setResolution({ ok: false, error: e instanceof Error ? e.message : String(e) }))
        .finally(() => setInterpreting(false));
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whenText]);

  const validateManual = async () => {
    if (!manualSchedule.trim()) return;
    setValidatingManual(true);
    try {
      const r = await api.validateCronSchedule(manualSchedule.trim());
      setManualResolution(r);
    } catch (e) {
      setManualResolution({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setValidatingManual(false);
    }
  };

  const effectiveSchedule = resolution?.ok ? resolution.schedule : manualResolution?.ok ? manualSchedule.trim() : null;
  const canCreate = !!effectiveSchedule && taskText.trim().length > 0 && !creating;

  const createAutomation = async () => {
    if (!effectiveSchedule) return;
    setError(null);
    setCreating(true);
    try {
      const job = await api.createCronJob({
        prompt: taskText.trim(),
        schedule: effectiveSchedule,
        name: whenText.trim() || undefined,
      });
      setCreatedName(job.name || job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="heartbeat-when">Quando o agente deve agir sozinho?</Label>
        <Input
          id="heartbeat-when"
          value={whenText}
          onChange={(e) => setWhenText(e.target.value)}
          placeholder="Ex.: todo dia às 9h, toda segunda-feira às 14h, a cada 30 minutos…"
        />
      </div>

      <div className="min-h-[2.5rem]">
        {interpreting && (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Interpretando…
          </p>
        )}
        {!interpreting && resolution?.ok && (
          <p className="flex items-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" /> {resolution.display} · próxima execução:{" "}
            {formatNextRun(resolution.next_run_at)}
          </p>
        )}
        {!interpreting && resolution && !resolution.ok && (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" /> {resolution.error}
            </p>
            <p className="text-xs text-text-tertiary">
              Ou informe a expressão diretamente (cron, `every 30m` ou `2026-02-03T14:00`):
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={manualSchedule}
                onChange={(e) => setManualSchedule(e.target.value)}
                placeholder="0 9 * * *"
                className="font-mono text-xs"
              />
              <Button outlined size="sm" onClick={validateManual} disabled={validatingManual || !manualSchedule.trim()}>
                {validatingManual ? <Spinner /> : "Validar"}
              </Button>
            </div>
            {manualResolution?.ok && (
              <p className="flex items-center gap-2 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> {manualResolution.display} · próxima:{" "}
                {formatNextRun(manualResolution.next_run_at)}
              </p>
            )}
            {manualResolution && !manualResolution.ok && (
              <p className="text-xs text-destructive">{manualResolution.error}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="heartbeat-task">O que o agente deve fazer nesse horário?</Label>
        <textarea
          id="heartbeat-task"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          rows={4}
          placeholder="Ex.: resuma os pedidos do dia anterior e envie um relatório por Telegram."
          className="min-h-[100px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {createdName ? (
        <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-success">
          <Clock className="h-4 w-4" /> Automação "{createdName}" criada — acompanhe em Agendamentos.
        </p>
      ) : (
        <Button onClick={createAutomation} disabled={!canCreate} prefix={creating ? <Spinner /> : undefined}>
          {creating ? "Criando…" : "Criar automação"}
        </Button>
      )}
    </div>
  );
}
