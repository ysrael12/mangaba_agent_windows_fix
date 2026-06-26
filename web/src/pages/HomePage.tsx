import { ArrowRight, BookOpen, Cpu, MessageSquare, Radio, Users, Zap } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    title: "1. Defina o cérebro",
    description: "Escolha o modelo de IA que responderá às suas mensagens.",
    path: "/models",
    icon: Cpu,
    action: "Ir para modelos",
  },
  {
    title: "2. Conecte um canal",
    description: "Adicione Telegram, Discord ou outro canal para enviar e receber mensagens.",
    path: "/routing",
    icon: Radio,
    action: "Conectar canal",
  },
  {
    title: "3. Crie um agente",
    description: "Monte um perfil com personalidade e comportamento próprio.",
    path: "/profiles",
    icon: Users,
    action: "Criar agente",
  },
  {
    title: "4. Converse",
    description: "Use o chat para testar e ajustar o agente imediatamente.",
    path: "/chat",
    icon: MessageSquare,
    action: "Abrir chat",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Ações rápidas",
    description: "Comece com o essencial: modelo, canal e perfil.",
    icon: Zap,
    path: "/chat",
    action: "Ir para o chat",
  },
  {
    title: "Acompanhar tarefas",
    description: "Delegue trabalho ao Kanban e veja o progresso em um só lugar.",
    icon: BookOpen,
    path: "/kanban",
    action: "Abrir Kanban",
  },
  {
    title: "Rever configurações",
    description: "Confira as chaves, plugins e memória do seu agente.",
    icon: Users,
    path: "/config",
    action: "Ir para configurações",
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Bem-vindo ao Mangaba
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Gerencie agentes e canais sem sair do painel.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Abra o chat, conecte um canal, crie um agente e automatize tarefas
              em poucos cliques. O terminal só é necessário para iniciar o
              dashboard; depois disso, tudo acontece aqui mesmo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => navigate("/chat")}>Começar pelo chat</Button>
              <Button ghost onClick={() => navigate("/docs")}>Ler o guia rápido</Button>
            </div>
          </div>
          <div className="grid gap-3">
            {STEPS.slice(0, 3).map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-3xl border border-border bg-background p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-midground/10 text-midground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_minmax(280px,1fr)]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Próximo passo
              </p>
              <h2 className="mt-3 text-2xl font-semibold">Como começar em menos de 5 minutos</h2>
            </div>
            <div className="rounded-2xl bg-midground/10 px-3 py-2 text-sm font-semibold text-midground">
              Fácil e visual
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.path}
                  onClick={() => navigate(step.path)}
                  className="group flex w-full flex-col gap-3 rounded-3xl border border-border p-4 text-left transition hover:border-midground/60 hover:bg-midground/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-midground group-hover:text-midground">
                    {step.action} <ArrowRight className="inline-block h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {QUICK_ACTIONS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <Button onClick={() => navigate(card.path)} className="w-full">
                    {card.action}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Por que usar o Mangaba?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="font-semibold">Tudo visual</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure modelos, agentes, canais e automações com cliques.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="font-semibold">Fácil de testar</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Converse instantaneamente e ajuste o comportamento do agente.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="font-semibold">Automação segura</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use Kanban e cron para delegar tarefas e manter o controle.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
