import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Onboarding guiado (não trava): checklist de primeiros passos focado em
// RESULTADOS, com barra de progresso, que detecta o que o usuário já fez.
// Padrão Userpilot/Chameleon. Dispensável (lembrado em localStorage).

const DISMISS_KEY = "mangaba-onboarding-dismissed";

interface Step {
  key: string;
  title: string;
  hint: string;
  path: string;
}

const STEPS: Step[] = [
  { key: "model", title: "Escolher o modelo de IA", hint: "Defina qual IA responde", path: "/models" },
  { key: "channel", title: "Conectar um canal", hint: "Telegram, Discord, etc.", path: "/routing" },
  { key: "memory", title: "Configurar a memória", hint: "O que o agente lembra de você", path: "/memory" },
  { key: "agent", title: "Criar um agente", hint: "Um perfil com personalidade própria", path: "/profiles" },
  { key: "chat", title: "Ter a primeira conversa", hint: "Mande uma mensagem no Chat", path: "/chat" },
  { key: "task", title: "Criar uma tarefa no Kanban", hint: "Trabalho para os agentes", path: "/kanban" },
];

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;

    const detect = async () => {
      const flags: Record<string, boolean> = {};
      const settle = async <T,>(p: Promise<T>): Promise<T | null> => {
        try {
          return await p;
        } catch {
          return null;
        }
      };

      const [status, sessions, fleet, memory, models, boards] = await Promise.all([
        settle(api.getStatus()),
        settle(api.getSessions(1, 0)),
        settle(api.getFleet()),
        settle(api.getMemory()),
        settle(api.getChatModels()),
        settle(api.getKanbanBoards()),
      ]);

      const platforms = (status as { gateway_platforms?: Record<string, unknown> } | null)
        ?.gateway_platforms;
      flags.channel = !!platforms && Object.keys(platforms).length > 0;
      flags.model = !!models?.current;
      flags.memory = !!memory && (memory.memory.chars > 0 || memory.user.chars > 0);
      flags.agent = !!fleet && (fleet.members?.length ?? 0) > 1;
      flags.chat = !!sessions && (sessions.total ?? 0) > 0;
      flags.task =
        !!boards &&
        (boards.boards ?? []).some((b) =>
          Object.values(b.by_status ?? {}).some((n) => (n as number) > 0),
        );

      if (!cancelled) {
        setDone(flags);
        setReady(true);
      }
    };

    void detect();
    return () => {
      cancelled = true;
    };
  }, [dismissed]);

  // Auto-oculta quando o essencial (modelo + canal + 1ª conversa) está feito —
  // usuário já passou do onboarding, não precisa mais do painel.
  const essentialDone = ["model", "channel", "chat"].every((k) => done[k]);

  if (dismissed || !ready || essentialDone) return null;

  const completed = STEPS.filter((s) => done[s.key]).length;
  const total = STEPS.length;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Sparkles className="h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {allDone ? "Tudo pronto! 🎉" : "Primeiros passos"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completed} de {total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={open ? "Recolher" : "Expandir"}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dispensar"
          title="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-2 pb-2 pt-1">
          {STEPS.map((s) => {
            const isDone = !!done[s.key];
            return (
              <button
                key={s.key}
                onClick={() => navigate(s.path)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/40"
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm",
                      isDone ? "text-muted-foreground line-through" : "font-medium",
                    )}
                  >
                    {s.title}
                  </span>
                  {!isDone && (
                    <span className="ml-2 text-xs text-muted-foreground">{s.hint}</span>
                  )}
                </div>
              </button>
            );
          })}
          {allDone && (
            <div className="px-2 pb-1 pt-2">
              <button
                onClick={dismiss}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              >
                Concluir e ocultar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
