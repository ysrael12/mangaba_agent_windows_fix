import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, PartyPopper, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { SLIDE_DEFS } from "@/components/wizard/slideDefs";

/**
 * Checklist de primeiros passos com verificação automática via API.
 * Cada item corresponde a um slide do wizard de criação.
 * O resultado da última verificação fica em localStorage("mangaba:onboarding")
 * para render imediato; uma nova verificação roda em background a cada mount.
 */

const STORAGE_KEY = "mangaba:onboarding";

type StepId = number;

interface StepDef {
  id: StepId;
  label: string;
  hint: string;
  actionLabel: string;
  actionPath: string;
}

const STEPS: StepDef[] = SLIDE_DEFS.map((s) => ({
  id: s.id,
  label: s.title,
  hint: s.description,
  actionLabel: "Configurar",
  actionPath: "/criar",
}));

type DoneMap = Partial<Record<StepId, boolean>>;

function loadCached(): DoneMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DoneMap;
  } catch {
    /* ignore */
  }
  return {};
}

async function detect(): Promise<DoneMap> {
  const [model, identity, channels, skills, toolsets, rag, mcp, cron, sessions] =
    await Promise.allSettled([
      api.getModelInfo(),
      api.getAgentIdentity(),
      api.getChannelsStatus(),
      api.getSkills(),
      api.getToolsets(),
      api.getRagFiles(),
      api.listMcpServers(),
      api.getCronJobs(),
      api.getSessions(1, 0),
    ]);

  const done: DoneMap = {};

  if (model.status === "fulfilled") {
    done[1] = Boolean(model.value.provider && model.value.model);
  }
  if (identity.status === "fulfilled") {
    done[4] = Boolean(identity.value.display_name);
  }
  if (rag.status === "fulfilled") {
    done[5] = rag.value.files.length > 0;
  }
  if (toolsets.status === "fulfilled") {
    done[6] = toolsets.value.some((t) => t.enabled);
  }
  if (skills.status === "fulfilled") {
    done[7] = skills.value.some((s) => s.enabled);
  }
  if (mcp.status === "fulfilled") {
    done[8] = mcp.value.servers.length > 0;
  }
  if (cron.status === "fulfilled") {
    done[9] = cron.value.length > 0;
  }
  if (channels.status === "fulfilled") {
    done[10] = channels.value.channels.some((c) => c.connected);
  }
  if (sessions.status === "fulfilled") {
    if ((sessions.value.total ?? sessions.value.sessions.length) > 0) {
      done[2] = true;
      done[3] = true;
    }
  }

  return done;
}

export function OnboardingChecklist() {
  const [done, setDone] = useState<DoneMap>(loadCached);

  useEffect(() => {
    let cancelled = false;
    void detect().then((fresh) => {
      if (cancelled) return;
      setDone((prev) => {
        const merged = { ...prev, ...fresh };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = useMemo(
    () => STEPS.filter((s) => done[s.id]).length,
    [done],
  );
  const allDone = completed === STEPS.length;
  const total = STEPS.length + 1;
  const shown = completed + (allDone ? 1 : 0);
  const pct = Math.round((shown / total) * 100);

  return (
    <section
      aria-label="Primeiros passos"
      className="rounded-2xl border border-current/15 p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-midground">
          <PartyPopper className="h-5 w-5" />
          {allDone ? "Tudo pronto!" : "Primeiros passos"}
        </h2>
        <span className="text-sm text-text-tertiary">
          {shown} de {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 h-2 overflow-hidden rounded-full bg-current/10"
      >
        <div
          className="h-full rounded-full bg-midground transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone ? (
        <p className="mt-4 text-sm text-text-secondary">
          🎉 Parabéns — seu funcionário agêntico está configurado e pronto para o dia a dia.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {[...STEPS, null].map((step) => {
            if (step === null) {
              return (
                <li
                  key="__done__"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-text-tertiary"
                >
                  <StepCheckbox checked={false} />
                  <span className="flex-1 text-sm">Pronto!</span>
                  <span aria-hidden>🎉</span>
                </li>
              );
            }
            const isDone = Boolean(done[step.id]);
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2",
                  isDone ? "text-text-tertiary" : "text-text-secondary",
                )}
              >
                <StepCheckbox checked={isDone} />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      isDone && "line-through",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block truncate text-xs text-text-tertiary">
                    {step.hint}
                  </span>
                </span>
                {!isDone && (
                  <Link
                    to={step.actionPath}
                    className="shrink-0 rounded-lg border border-current/15 px-3 py-1 text-xs font-medium text-midground transition-colors hover:bg-midground/10"
                  >
                    {step.actionLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 border-t border-current/10 pt-4">
        <Link
          to="/criar"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-midground/30 bg-midground/10",
            "px-4 py-2 text-sm font-medium text-midground",
            "transition-colors hover:bg-midground/20",
          )}
        >
          Criação de Funcionários Agênticos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function StepCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
        checked
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
          : "border-current/20 text-transparent",
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}
