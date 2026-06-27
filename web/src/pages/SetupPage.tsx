import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Cpu,
  Radio,
  MessageSquare,
  Users,
  Brain,
  CheckCircle2,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Assistente de "Começar" — fast-track guiado dos passos essenciais para o
// primeiro valor. Detecta o que já foi feito e leva direto à ação. Guia, não
// trava (alinhado às práticas de onboarding dos melhores produtos).

interface Step {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  path: string;
  essential: boolean;
}

const STEPS: Step[] = [
  {
    key: "model",
    icon: <Cpu className="h-5 w-5" />,
    title: "Escolher o modelo de IA",
    description: "Defina qual modelo o agente usa para pensar e responder.",
    actionLabel: "Escolher modelo",
    path: "/models",
    essential: true,
  },
  {
    key: "channel",
    icon: <Radio className="h-5 w-5" />,
    title: "Conectar um canal",
    description: "Ligue o Telegram, Discord ou outro canal (chave em Chaves, ative em Roteamento).",
    actionLabel: "Conectar canal",
    path: "/routing",
    essential: true,
  },
  {
    key: "chat",
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Ter a primeira conversa",
    description: "Mande uma mensagem ao agente e veja a resposta em tempo real.",
    actionLabel: "Abrir o Chat",
    path: "/chat",
    essential: true,
  },
  {
    key: "agent",
    icon: <Users className="h-5 w-5" />,
    title: "Criar um agente (opcional)",
    description: "Um perfil com personalidade própria — útil para vários agentes.",
    actionLabel: "Criar agente",
    path: "/profiles",
    essential: false,
  },
  {
    key: "memory",
    icon: <Brain className="h-5 w-5" />,
    title: "Ajustar a memória (opcional)",
    description: "Diga ao agente o que lembrar sobre você e seu contexto.",
    actionLabel: "Configurar memória",
    path: "/memory",
    essential: false,
  },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const settle = async <T,>(p: Promise<T>): Promise<T | null> => {
      try {
        return await p;
      } catch {
        return null;
      }
    };

    const detect = async () => {
      const [status, sessions, fleet, memory, models] = await Promise.all([
        settle(api.getStatus()),
        settle(api.getSessions(1, 0)),
        settle(api.getFleet()),
        settle(api.getMemory()),
        settle(api.getChatModels()),
      ]);
      const platforms = (status as { gateway_platforms?: Record<string, unknown> } | null)
        ?.gateway_platforms;
      const flags: Record<string, boolean> = {
        model: !!models?.current,
        channel: !!platforms && Object.keys(platforms).length > 0,
        chat: !!sessions && (sessions.total ?? 0) > 0,
        agent: !!fleet && (fleet.members?.length ?? 0) > 1,
        memory: !!memory && (memory.memory.chars > 0 || memory.user.chars > 0),
      };
      if (!cancelled) {
        setDone(flags);
        setLoading(false);
      }
    };
    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetOnboarding = () => {
    try {
      // Mesma chave usada pelo OnboardingChecklist.
      localStorage.removeItem("mangaba-onboarding-dismissed");
    } catch {
      /* ignore */
    }
    // O checklist fica montado fora das rotas; recarregar é o jeito simples
    // e confiável de reexibi-lo.
    window.location.reload();
  };

  const essential = STEPS.filter((s) => s.essential);
  const essentialDone = essential.filter((s) => done[s.key]).length;
  const pct = Math.round((essentialDone / essential.length) * 100);
  const allEssentialDone = essentialDone === essential.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-2xl text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-1">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5" />
        <H2>Começar</H2>
      </div>

      {/* Progresso dos essenciais */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {allEssentialDone
                ? "Pronto para usar! 🎉"
                : "Configuração essencial"}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {essentialDone} de {essential.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {allEssentialDone && (
            <p className="text-xs text-muted-foreground">
              O essencial está feito. Os passos opcionais abaixo deixam seu
              agente mais poderoso.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Passos */}
      <div className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const isDone = !!done[s.key];
          return (
            <Card key={s.key}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isDone
                      ? "bg-success/15 text-success"
                      : "border-2 border-foreground font-mono text-sm font-bold",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{s.icon}</span>
                    <span
                      className={cn(
                        "font-medium",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                </div>
                <Button
                  outlined={isDone}
                  size="sm"
                  onClick={() => navigate(s.path)}
                  className="shrink-0"
                  suffix={<ArrowRight className="h-4 w-4" />}
                >
                  {isDone ? "Revisar" : s.actionLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reset do painel de primeiros passos (o banner dispensável) */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>
          Dispensou o painel "Primeiros passos" e quer ele de volta?
        </span>
        <Button outlined size="sm" onClick={resetOnboarding} suffix={<RotateCw className="h-4 w-4" />}>
          Reativar primeiros passos
        </Button>
      </div>
    </div>
  );
}
