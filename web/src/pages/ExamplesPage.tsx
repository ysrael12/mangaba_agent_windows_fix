import { useState } from "react";
import { Lightbulb, Zap, Rocket, Workflow, Atom, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PluginSlot } from "@/plugins";

// ---------------------------------------------------------------------------
// Tipos e dados
// ---------------------------------------------------------------------------

interface Example {
  prompt: string;
  note?: string;
}

interface Group {
  title: string;
  hint?: string;
  examples: Example[];
}

const BASIC: Group[] = [
  {
    title: "Perguntas do dia a dia",
    hint: "Mande direto no Chat, Telegram ou Discord.",
    examples: [
      { prompt: "Explique o que é uma API como se eu tivesse 10 anos." },
      { prompt: "Me dê 5 ideias de nome para uma cafeteria artesanal." },
      { prompt: "Qual a diferença entre RAM e SSD, de forma simples?" },
    ],
  },
  {
    title: "Texto e escrita",
    examples: [
      { prompt: "Resuma este texto em 3 tópicos:\n\n<cole o texto aqui>" },
      { prompt: "Traduza para o inglês, tom profissional:\n\nBom dia, segue em anexo o relatório solicitado." },
      { prompt: "Corrija a gramática e melhore esta frase:\n\n<sua frase>" },
      { prompt: "Escreva um e-mail educado recusando uma reunião de sexta à tarde." },
    ],
  },
  {
    title: "Cálculos e conversões",
    examples: [
      { prompt: "Se eu economizar R$ 300 por mês a 0,8% ao mês, quanto terei em 2 anos?" },
      { prompt: "Converta 5 milhas para km e 75°F para Celsius." },
    ],
  },
];

const MEDIUM: Group[] = [
  {
    title: "Habilidades (busca, pesquisa)",
    hint: "Ative as habilidades na aba Habilidades antes de usar.",
    examples: [
      { prompt: "Pesquise na web as últimas notícias sobre inteligência artificial e me dê um resumo com as fontes." },
      { prompt: "Busque no arXiv os 3 artigos mais recentes sobre 'large language models' e resuma cada um em 2 linhas." },
      {
        prompt: "Liste as issues abertas do repositório anthropics/claude-code.",
        note: "Requer a habilidade do GitHub ativada (e o token, se for repo privado).",
      },
    ],
  },
  {
    title: "Memória de longo prazo",
    hint: "O agente lembra disso entre conversas.",
    examples: [
      { prompt: "Lembre que meu fuso é GMT-3, trabalho com análise de dados e prefiro respostas curtas e diretas." },
      { prompt: "O que você lembra sobre mim?" },
    ],
  },
  {
    title: "Agendamento (Cron)",
    hint: "Crie na aba Cron, no campo Prompt.",
    examples: [
      {
        prompt: "Faça um resumo das principais notícias de tecnologia de hoje e entregue de forma curta.",
        note: "Agendamento sugerido: 0 9 * * * (todo dia às 9h). Entregar para: Telegram.",
      },
      {
        prompt: "Liste as tarefas que vencem hoje e me lembre das 3 mais importantes.",
        note: "Agendamento: 0 8 * * 1-5 (dias úteis às 8h).",
      },
    ],
  },
  {
    title: "Pedidos em várias etapas",
    examples: [
      { prompt: "Pesquise sobre energia solar residencial, compare 3 fontes diferentes e gere um resumo em markdown com prós e contras." },
    ],
  },
];

const ADVANCED: Group[] = [
  {
    title: "Kanban — tarefas para agentes",
    hint: "Crie na aba Kanban → Nova tarefa.",
    examples: [
      {
        prompt: "Refatorar o módulo de autenticação: extrair a validação de token para uma função reutilizável e adicionar testes unitários.",
        note: "Marque 'Entrar em triagem' e depois use Especificar (IA) ou Decompor (IA) no card.",
      },
      {
        prompt: "Pesquisar 5 concorrentes do nosso produto, montar uma tabela comparativa de preços e recursos, e escrever uma análise de 1 página.",
        note: "Bom candidato para Decompor (IA) — vira várias subtarefas.",
      },
    ],
  },
  {
    title: "Automação com entrega",
    hint: "Cron + canal de entrega.",
    examples: [
      {
        prompt: "Toda segunda de manhã: gere um resumo das novidades de IA da semana, com 5 destaques e links, e entregue formatado.",
        note: "Agendamento: 0 8 * * 1 — Entregar para: Telegram ou Discord.",
      },
      {
        prompt: "Todo fim de dia: revise as tarefas concluídas no Kanban e gere um relatório curto do que foi feito.",
        note: "Agendamento: 0 18 * * 1-5.",
      },
    ],
  },
  {
    title: "Multi-agente (perfis)",
    hint: "Crie perfis na aba Perfis e suba na aba Fleet.",
    examples: [
      {
        prompt: "SOUL do perfil 'suporte': Você é um especialista em suporte técnico. Responda sempre em português, confirme o problema antes de sugerir soluções e seja objetivo.",
        note: "Cole isso em Perfis → Editar SOUL do agente 'suporte'.",
      },
      {
        prompt: "SOUL do perfil 'vendas': Você é um consultor de vendas consultivo. Faça perguntas para entender a necessidade antes de recomendar, e nunca pressione o cliente.",
        note: "Dois perfis = dois agentes independentes, cada um com seu token.",
      },
    ],
  },
  {
    title: "Análise de dados e código",
    examples: [
      { prompt: "Analise este CSV e me diga as 3 principais tendências:\n\n<cole os dados ou descreva o arquivo>" },
      { prompt: "Revise este trecho de código, aponte bugs e sugira melhorias:\n\n<cole o código>" },
    ],
  },
];

const COMPLEX: Group[] = [
  {
    title: "Orquestração de swarm (Kanban)",
    hint: "Vários agentes trabalhando em paralelo com dependências.",
    examples: [
      {
        prompt: "Objetivo: lançar uma landing page de um app de finanças. Quebre em: pesquisa de referências, copy do herói, estrutura HTML, estilo visual e revisão final — com as dependências corretas (revisão depende de tudo) e distribua entre os agentes disponíveis.",
        note: "Crie em triagem no Kanban → Decompor (IA). Para rodar os workers em paralelo: mangaba kanban swarm (CLI).",
      },
      {
        prompt: "Audite a segurança deste repositório: divida por área (autenticação, validação de entrada, dependências, segredos no código), um agente por área, e um verificador que consolida os achados confirmados.",
        note: "Padrão pesquisador → verificador → sintetizador.",
      },
    ],
  },
  {
    title: "Pesquisa profunda com síntese",
    examples: [
      {
        prompt: "Pesquise o mercado de carros elétricos no Brasil: colete dados de pelo menos 5 fontes, cruze preço, autonomia e tempo de recarga, identifique as 3 principais tendências e gere um relatório executivo de 2 páginas em markdown, com uma tabela comparativa e as fontes citadas.",
        note: "Requer habilidade de busca web ativada.",
      },
    ],
  },
  {
    title: "Automação encadeada (multi-etapa + entrega)",
    hint: "Cron acionando um fluxo completo.",
    examples: [
      {
        prompt: "Toda sexta às 17h: colete as tarefas concluídas no Kanban durante a semana, gere um changelog organizado por tema, poste no Discord #geral e envie um resumo executivo de 5 linhas no Telegram.",
        note: "Cron: 0 17 * * 5. Um prompt, várias entregas.",
      },
      {
        prompt: "Todo dia às 7h: verifique se há issues abertas com a label 'urgente' no repositório, e se houver mais de 3, crie tarefas no Kanban para as mais críticas e me avise no Telegram.",
        note: "Fluxo condicional (só age se passar do limite).",
      },
    ],
  },
  {
    title: "Análise de dados em escala",
    examples: [
      {
        prompt: "Tenho 3 arquivos CSV (vendas, clientes, produtos). Faça o join pela coluna id, detecte anomalias (valores fora do padrão, duplicados, lacunas), calcule os 5 produtos mais lucrativos por região e proponha 3 ações concretas baseadas nos dados.",
      },
    ],
  },
  {
    title: "Pipeline de conteúdo",
    examples: [
      {
        prompt: "A partir deste artigo técnico, gere: (1) um resumo executivo de 3 parágrafos, (2) uma thread de 5 posts para redes sociais, (3) um roteiro de vídeo de 2 minutos e (4) 5 perguntas frequentes com respostas. Mantenha o tom acessível.\n\n<cole o artigo>",
      },
    ],
  },
];

const HYPER: Group[] = [
  {
    title: "Sistema autônomo completo",
    hint: "Combina Cron + Kanban + swarm + múltiplos perfis.",
    examples: [
      {
        prompt: "Monte um sistema de inteligência de concorrentes que rode sozinho: todo dia, agentes coletam novidades de 5 concorrentes; um agente detecta o que mudou; outro classifica por relevância (alta/média/baixa); e toda sexta um relatório consolidado é gerado e entregue. Só me notifique fora da agenda se algo de relevância ALTA aparecer.",
        note: "Requer: perfis dedicados (coletor, analista, redator) + Cron diário/semanal + entrega configurada. Monte os perfis em Perfis e os agendamentos em Cron.",
      },
    ],
  },
  {
    title: "Equipe de agentes com handoffs",
    hint: "Pesquisador → arquiteto → implementador → revisor.",
    examples: [
      {
        prompt: "Construa a especificação e o protótipo de uma feature de exportação em PDF: o pesquisador levanta bibliotecas e trade-offs; o arquiteto decide a abordagem e define as subtarefas; os implementadores executam em paralelo; o revisor valida tudo contra os critérios de aceite e bloqueia o que não passar. Cada um passa o resultado pro próximo.",
        note: "No Kanban: tarefa em triagem → Decompor (IA) cria o grafo com dependências → mangaba kanban swarm roda os workers. O verificador entra como tarefa filha de todos.",
      },
    ],
  },
  {
    title: "Loop de melhoria contínua",
    examples: [
      {
        prompt: "Quero um ciclo que melhore um texto até ficar excelente: um agente escreve, outro critica apontando 3 fraquezas concretas, o primeiro reescreve corrigindo, e isso repete até o crítico não achar mais fraquezas relevantes (máximo 4 rodadas). Me entregue a versão final e o histórico das mudanças.",
        note: "Padrão gerar → criticar → refinar até convergir.",
      },
    ],
  },
  {
    title: "Operação multi-projeto (multi-quadro)",
    hint: "Vários quadros Kanban, cada um um projeto.",
    examples: [
      {
        prompt: "Tenho 3 projetos rodando (site, app, marketing). Para cada um, mantenha um quadro separado, distribua as tarefas entre os agentes certos, e toda segunda gere um panorama executivo unificado: o que avançou em cada projeto, o que travou e os próximos passos.",
        note: "Crie um quadro por projeto na aba Kanban; o panorama semanal vira um Cron que lê os quadros.",
      },
    ],
  },
  {
    title: "Base de conhecimento + ação",
    examples: [
      {
        prompt: "Ingira toda a documentação do nosso produto, responda dúvidas de clientes citando a seção exata, e quando identificar uma dúvida recorrente que a doc não cobre bem, abra uma tarefa no Kanban para melhorar aquela parte da documentação.",
        note: "RAG sobre a base + criação automática de tarefas a partir de lacunas detectadas.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function ExampleCard({ example }: { example: Example }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText(example.prompt)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard indisponível — ignora */
      });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
        {example.prompt}
      </pre>
      {example.note && (
        <p className="text-xs text-muted-foreground">{example.note}</p>
      )}
      <div className="flex justify-end">
        <button
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs transition-colors",
            copied ? "text-success" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function GroupBlock({ group }: { group: Group }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold">{group.title}</h3>
        {group.hint && (
          <p className="text-xs text-muted-foreground">{group.hint}</p>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {group.examples.map((ex, i) => (
          <ExampleCard key={i} example={ex} />
        ))}
      </div>
    </div>
  );
}

function Level({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-col gap-7">
      {groups.map((g, i) => (
        <GroupBlock key={i} group={g} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const LEVELS = [
  {
    id: "basic",
    label: "Básico",
    sub: "Perguntas, texto, cálculos",
    icon: Lightbulb,
    groups: BASIC,
  },
  {
    id: "medium",
    label: "Médio",
    sub: "Habilidades, memória, cron",
    icon: Zap,
    groups: MEDIUM,
  },
  {
    id: "advanced",
    label: "Avançado",
    sub: "Kanban, automação, multi-agente",
    icon: Rocket,
    groups: ADVANCED,
  },
  {
    id: "complex",
    label: "Complexo",
    sub: "Swarm, pipelines, fluxos encadeados",
    icon: Workflow,
    groups: COMPLEX,
  },
  {
    id: "hyper",
    label: "Hipercomplexo",
    sub: "Sistemas autônomos, multi-projeto",
    icon: Atom,
    groups: HYPER,
  },
] as const;

type Level = (typeof LEVELS)[number]["id"];

export default function ExamplesPage() {
  const [level, setLevel] = useState<Level>("basic");
  const active = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 gap-0">
      <PluginSlot name="examples:top" />

      {/* Sidebar de nível */}
      <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border p-4 sm:flex">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Nível
        </p>
        {LEVELS.map((l) => {
          const Icon = l.icon;
          const isActive = l.id === level;
          return (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={cn(
                "flex flex-col items-start rounded-md px-3 py-2.5 text-left transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Icon className="size-3.5" />
                {l.label}
              </span>
              <span className={cn("mt-0.5 text-xs", isActive ? "text-background/70" : "text-muted-foreground")}>
                {l.sub}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Tabs mobile */}
      <div className="sm:hidden flex border-b border-border w-full shrink-0">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors",
              level === l.id
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <active.icon className="size-6" />
            <div>
              <h2 className="text-xl font-bold">Exemplos — {active.label}</h2>
              <p className="text-sm text-muted-foreground">
                Copie e cole no Chat, Telegram ou Discord. {active.sub}.
              </p>
            </div>
          </div>
          <Level groups={active.groups} />
        </div>
      </main>

      <PluginSlot name="examples:bottom" />
    </div>
  );
}
