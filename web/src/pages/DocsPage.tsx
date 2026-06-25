import { useLayoutEffect, useState } from "react";

import { usePageHeader } from "@/contexts/usePageHeader";
import { cn } from "@/lib/utils";
import { PluginSlot } from "@/plugins";
import { ChevronDown, ChevronRight, MousePointerClick, Zap, Rocket } from "lucide-react";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[0.82em]">
      {children}
    </code>
  );
}

// Realça o nome de uma aba/botão do dashboard para o leitor localizar na tela.
function UI({ children }: { children: string }) {
  return (
    <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.82em] font-medium text-foreground">
      {children}
    </span>
  );
}

function Block({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded border border-border bg-black text-green-400 px-4 py-3 text-xs font-mono leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground font-mono text-xs font-bold">
        {n}
      </div>
      <div className="flex-1 pb-6">
        <h4 className="mb-2 font-semibold">{title}</h4>
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border-l-4 border-foreground bg-muted px-4 py-3 text-sm">
      <span className="font-semibold text-foreground">Dica: </span>
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm">
      <span className="font-semibold text-destructive">Atenção: </span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold hover:bg-muted/40 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-6 pt-2 space-y-5">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nível 1 — Primeiros passos no dashboard
// ---------------------------------------------------------------------------

function BasicDocs() {
  return (
    <div className="space-y-4">
      <Tip>
        Quase tudo no Mangaba é feito clicando no dashboard. O terminal só é
        necessário uma vez, para instalar e abrir o dashboard — depois disso é
        tudo pela interface.
      </Tip>

      <Section title="1. Abrir o dashboard">
        <Step n={1} title="Instalar (uma única vez, no terminal)">
          <p>Requer Python 3.10+. Instale o pacote:</p>
          <Block>{`pipx install mangaba-agent
# ou:  pip install mangaba-agent`}</Block>
        </Step>
        <Step n={2} title="Subir o dashboard">
          <Block>{`mangaba dashboard`}</Block>
          <p>
            Abre automaticamente em <Code>http://localhost:9119</Code>. O
            <strong> gateway (o processo da IA) sobe junto automaticamente</strong> —
            você não precisa iniciá-lo à parte.
          </p>
        </Step>
        <Step n={3} title="Deixar aberto no navegador">
          <p>
            Enquanto o terminal com <Code>mangaba dashboard</Code> estiver
            rodando, o dashboard fica disponível. Para parar, feche o terminal
            ou pressione <Code>Ctrl+C</Code>.
          </p>
        </Step>
      </Section>

      <Section title="2. Conhecer a barra lateral">
        <Step n={1} title="O que é cada aba">
          <p>Tudo é acessado pela barra lateral à esquerda:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><UI>Chat</UI> — conversar direto com o agente</li>
            <li><UI>Sessões</UI> — histórico de todas as conversas</li>
            <li><UI>Modelos</UI> — escolher o modelo de IA</li>
            <li><UI>Habilidades</UI> — ligar/desligar capacidades (busca web, GitHub, etc.)</li>
            <li><UI>Plugins</UI> — instalar extensões</li>
            <li><UI>Cron</UI> — agendar tarefas automáticas</li>
            <li><UI>Perfis: multiagentes</UI> — criar e editar agentes</li>
            <li><UI>Fleet</UI> — ligar/desligar agentes e ver seus canais</li>
            <li><UI>Kanban</UI> — fila de tarefas para vários agentes</li>
            <li><UI>Roteamento</UI> — matriz de qual agente usa qual canal</li>
            <li><UI>Sessões Globais</UI> — conversas de todos os agentes juntas</li>
            <li><UI>Configuração</UI> — todos os parâmetros</li>
            <li><UI>Chaves</UI> — tokens e chaves de API</li>
          </ul>
        </Step>
        <Step n={2} title="Modo dia/noite e idioma">
          <p>
            No rodapé da barra lateral há os botões de tema (sol/lua) e de
            idioma. O dashboard já vem em português.
          </p>
        </Step>
      </Section>

      <Section title="3. Escolher o modelo de IA">
        <Step n={1} title="Abrir a aba Modelos">
          <p>Clique em <UI>Modelos</UI> na barra lateral.</p>
        </Step>
        <Step n={2} title="Selecionar o provedor e o modelo">
          <p>Você tem três caminhos:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Ollama (local, grátis)</strong> — instale o Ollama em <Code>ollama.com</Code>, baixe um modelo, e ele aparece como opção aqui.</li>
            <li><strong>OpenAI / Anthropic (nuvem)</strong> — cole a chave na aba <UI>Chaves</UI> e selecione o modelo aqui.</li>
          </ul>
          <p>Selecione o modelo desejado e salve. A mudança é aplicada na hora.</p>
        </Step>
        <Tip>
          Para uso local e gratuito, modelos como <Code>qwen2.5:7b-instruct</Code>
          ou <Code>llama3.2:3b</Code> são leves e rápidos. O Mangaba exige
          modelos com pelo menos 64k de contexto.
        </Tip>
      </Section>

      <Section title="4. Primeira conversa">
        <Step n={1} title="Abrir o Chat">
          <p>Clique em <UI>Chat</UI> na barra lateral.</p>
        </Step>
        <Step n={2} title="Enviar uma mensagem">
          <p>Digite e pressione Enter:</p>
          <Block>{`Olá! Quem é você e o que você pode fazer?`}</Block>
          <p>A resposta aparece em streaming, token a token.</p>
        </Step>
        <Tip>
          A primeira resposta de um modelo local pode demorar mais (o modelo é
          carregado na memória). As seguintes são bem mais rápidas.
        </Tip>
      </Section>

      <Section title="5. Ver o histórico">
        <Step n={1} title="Abrir Sessões">
          <p>
            Clique em <UI>Sessões</UI>. Cada conversa fica salva com data,
            canal de origem e número de mensagens.
          </p>
        </Step>
        <Step n={2} title="Retomar uma conversa">
          <p>
            Clique numa sessão e use <UI>Retomar no Chat</UI> — o agente lembra
            do contexto completo daquela conversa.
          </p>
        </Step>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nível 2 — Conectar canais e automações pelo dashboard
// ---------------------------------------------------------------------------

function MediumDocs() {
  return (
    <div className="space-y-4">
      <Section title="1. Chaves de API (aba Chaves)">
        <Step n={1} title="Onde ficam as chaves">
          <p>
            Clique em <UI>Chaves</UI>. É aqui que ficam todos os tokens e
            chaves: <Code>TELEGRAM_BOT_TOKEN</Code>, <Code>OPENAI_API_KEY</Code>,
            <Code>DISCORD_BOT_TOKEN</Code>, etc.
          </p>
        </Step>
        <Step n={2} title="Adicionar/editar uma chave">
          <p>
            Preencha o campo da variável, cole o valor e salve. As chaves ficam
            mascaradas; use o botão de revelar se precisar conferir.
          </p>
        </Step>
      </Section>

      <Section title="2. Conectar o Telegram (passo a passo)">
        <Step n={1} title="Criar o bot no Telegram">
          <p>
            No Telegram, procure por <Code>@BotFather</Code> e envie
            <Code>/newbot</Code>. Escolha um nome e um username terminando em
            <Code>bot</Code>. Ao final você recebe o <strong>token</strong>.
          </p>
        </Step>
        <Step n={2} title="Colar o token no dashboard">
          <p>
            Vá em <UI>Chaves</UI>, preencha <Code>TELEGRAM_BOT_TOKEN</Code> com
            o valor recebido e salve.
          </p>
        </Step>
        <Step n={3} title="Habilitar o Telegram">
          <p>
            Vá em <UI>Configuração</UI> e habilite a plataforma Telegram (seção
            de plataformas). Informe o <Code>chat_id</Code> do seu operador, se
            quiser receber avisos.
          </p>
          <Tip>
            Para descobrir seu chat_id, envie qualquer mensagem para
            <Code>@userinfobot</Code> no Telegram.
          </Tip>
        </Step>
        <Step n={4} title="Reiniciar o gateway">
          <p>
            Na barra lateral, seção <UI>Sistema</UI>, clique em
            <UI>Reiniciar gateway</UI>. Pronto — mande uma mensagem ao bot no
            Telegram e ele responde.
          </p>
        </Step>
      </Section>

      <Section title="3. Habilidades (aba Habilidades)">
        <Step n={1} title="Ligar/desligar capacidades">
          <p>
            Clique em <UI>Habilidades</UI>. São dezenas de capacidades
            pré-instaladas (busca web, GitHub, arXiv, etc.). Use o interruptor
            ao lado de cada uma para ativar.
          </p>
        </Step>
        <Step n={2} title="Habilidades que precisam de chave">
          <p>
            Algumas mostram um aviso indicando qual chave configurar — adicione
            em <UI>Chaves</UI> e a habilidade fica pronta.
          </p>
        </Step>
        <Step n={3} title="Testar no Chat">
          <Block>{`Pesquise no arXiv os 3 artigos mais recentes sobre LLMs.`}</Block>
          <p>O agente usa a habilidade automaticamente.</p>
        </Step>
      </Section>

      <Section title="4. Plugins (aba Plugins)">
        <Step n={1} title="Instalar do GitHub">
          <p>
            Clique em <UI>Plugins</UI> → <UI>Instalar via GitHub / URL Git</UI>,
            cole o endereço do repositório e confirme.
          </p>
        </Step>
        <Step n={2} title="Ativar">
          <p>
            Após instalar, o plugin aparece na lista. Clique em <UI>Ativar</UI>.
            Plugins de provedor (modelo/memória) aparecem em
            <UI>Plugins → Provedores</UI>.
          </p>
        </Step>
      </Section>

      <Section title="5. Agendar tarefas (aba Cron)">
        <Step n={1} title="Nova tarefa agendada">
          <p>Clique em <UI>Cron</UI> → <UI>Nova tarefa cron</UI>.</p>
        </Step>
        <Step n={2} title="Preencher">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Nome</strong> — ex. "Resumo diário"</li>
            <li><strong>Prompt</strong> — o que o agente deve fazer</li>
            <li><strong>Agendamento</strong> — expressão cron (ex. <Code>0 9 * * *</Code> = todo dia às 9h)</li>
            <li><strong>Entregar para</strong> — onde o resultado chega (Telegram, Discord, etc.)</li>
          </ul>
        </Step>
        <Step n={3} title="Referência rápida de cron">
          <Block>{`0 9 * * *      → todo dia às 09:00
0 8 * * 1      → toda segunda às 08:00
*/30 * * * *   → a cada 30 minutos
0 9,18 * * *   → às 09:00 e 18:00`}</Block>
        </Step>
      </Section>

      <Section title="6. Criar e editar agentes (aba Perfis: multiagentes)">
        <Step n={1} title="Criar um agente">
          <p>
            Clique em <UI>Perfis: multiagentes</UI> → criar novo perfil. Cada
            perfil é um agente independente, com personalidade, modelo e memória
            próprios.
          </p>
        </Step>
        <Step n={2} title="Editar a personalidade (SOUL)">
          <p>
            No card do agente, use <UI>Editar SOUL</UI> para definir o prompt de
            sistema dele. Exemplo:
          </p>
          <Block>{`Você é um especialista em suporte técnico da empresa XPTO.
Responda sempre em português, de forma objetiva.
Confirme o problema antes de sugerir soluções.`}</Block>
        </Step>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nível 3 — Multi-agente, frota e Kanban pelo dashboard
// ---------------------------------------------------------------------------

function AdvancedDocs() {
  return (
    <div className="space-y-4">
      <Section title="1. Frota de agentes (aba Fleet)">
        <Step n={1} title="Ligar/desligar agentes">
          <p>
            Clique em <UI>Fleet</UI>. Cada agente (perfil) aparece com seu
            status. Use <UI>Subir</UI>, <UI>Parar</UI> e <UI>Reiniciar</UI> para
            controlá-los.
          </p>
        </Step>
        <Step n={2} title="Ver os canais de cada agente">
          <p>
            No card do agente, expanda <UI>Canais</UI> para ver em quais
            plataformas ele está conectado e se o token está configurado.
          </p>
        </Step>
        <Step n={3} title="Aviso para todos (broadcast)">
          <p>
            O campo de broadcast no topo envia uma mensagem ao canal-operador de
            todos os agentes de uma vez.
          </p>
        </Step>
      </Section>

      <Section title="2. Dois agentes no mesmo canal">
        <Step n={1} title="Entender o modelo">
          <p>
            Cada agente é um processo independente. Para ter dois agentes no
            mesmo Telegram, você precisa de <strong>dois bots</strong> (dois
            tokens) — um por perfil.
          </p>
        </Step>
        <Step n={2} title="Criar os perfis">
          <p>
            Em <UI>Perfis: multiagentes</UI> (ou em <UI>Roteamento</UI> →
            <UI>Novo profile</UI>), crie dois perfis, ex. <Code>suporte</Code> e
            <Code>vendas</Code>.
          </p>
        </Step>
        <Step n={3} title="Token diferente por perfil">
          <p>
            Selecione o perfil no seletor de perfil do dashboard, vá em
            <UI>Chaves</UI> e grave o <Code>TELEGRAM_BOT_TOKEN</Code> daquele
            bot. Repita para o outro perfil com o token do segundo bot.
          </p>
        </Step>
        <Step n={4} title="Subir os dois">
          <p>
            Em <UI>Fleet</UI>, clique em <UI>Subir</UI> nos dois agentes. Agora
            há dois bots rodando, com personalidades e modelos diferentes.
          </p>
        </Step>
      </Section>

      <Section title="3. Roteamento (aba Roteamento)">
        <Step n={1} title="Matriz de canais">
          <p>
            Clique em <UI>Roteamento</UI>. A matriz mostra cada perfil (linhas)
            × cada canal (colunas): ✅ configurado com token, ⚠ sem token, —
            não configurado. Ótimo para detectar conflitos de configuração.
          </p>
        </Step>
        <Step n={2} title="Criar perfil rápido">
          <p>
            O botão <UI>Novo profile</UI> cria um perfil direto daqui.
          </p>
        </Step>
      </Section>

      <Section title="4. Sessões Globais (aba Sessões Globais)">
        <Step n={1} title="Conversas de todos os agentes">
          <p>
            Clique em <UI>Sessões Globais</UI> para ver, numa lista única, as
            conversas de todos os perfis da frota — com badge colorido por
            agente (verde = ativo, cinza = parado).
          </p>
        </Step>
      </Section>

      <Section title="5. Kanban (aba Kanban)">
        <Step n={1} title="Criar um quadro">
          <p>
            Clique em <UI>Kanban</UI> → <UI>Novo quadro</UI> e dê um nome
            (slug). Você pode ter vários quadros (projetos) e alternar entre
            eles no seletor no topo.
          </p>
        </Step>
        <Step n={2} title="Criar uma tarefa">
          <p>
            Clique em <UI>Nova tarefa</UI>. Descreva a tarefa, opcionalmente
            atribua a um agente (worker). Marque <UI>Entrar em triagem</UI> se
            quiser refinar a tarefa com IA antes de executar.
          </p>
        </Step>
        <Step n={3} title="Refinar com IA (triagem)">
          <p>
            Em uma tarefa na coluna Triagem, abra o card e use:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><UI>Especificar (IA)</UI> — a IA detalha o objetivo, critérios de aceite e escopo.</li>
            <li><UI>Decompor (IA)</UI> — a IA quebra a tarefa em subtarefas com dependências.</li>
          </ul>
          <p>O processamento roda em segundo plano; clique em <UI>Atualizar</UI> em alguns segundos.</p>
        </Step>
        <Step n={4} title="Acompanhar a execução">
          <p>
            As tarefas se movem pelas colunas: triagem → a fazer → pronto →
            rodando → bloqueado → revisão → concluído. Clique num card para ver
            comentários, histórico, resumo do worker e ações (concluir,
            bloquear, desbloquear, liberar claim, atribuir, comentar).
          </p>
        </Step>
        <Tip>
          Workers são perfis com tarefas atribuídas. Para que peguem e executem
          as tarefas automaticamente, eles precisam estar no ar (aba
          <UI>Fleet</UI>).
        </Tip>
      </Section>

      <Section title="6. Sistema: reiniciar e atualizar">
        <Step n={1} title="Reiniciar o gateway">
          <p>
            Na barra lateral, seção <UI>Sistema</UI> → <UI>Reiniciar gateway</UI>.
            Use após mudar modelo, chaves ou plataformas.
          </p>
        </Step>
        <Step n={2} title="Atualizar o Mangaba">
          <p>
            <UI>Sistema</UI> → <UI>Atualizar Mangaba</UI> baixa e aplica a
            versão mais recente.
          </p>
        </Step>
      </Section>

      <Section title="7. Quando ainda é preciso o terminal">
        <Step n={1} title="Coisas que continuam na CLI">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Instalação inicial</strong> e abrir o dashboard (<Code>mangaba dashboard</Code>).</li>
            <li><strong>Baixar modelos do Ollama</strong> (<Code>ollama pull llama3.2</Code>).</li>
            <li><strong>Orquestração avançada do Kanban (swarm)</strong> — disparar vários workers em paralelo via <Code>mangaba kanban swarm</Code>. A criação e o acompanhamento de tarefas já são pelo dashboard; só o swarm em massa é CLI.</li>
          </ul>
          <Block>{`mangaba kanban --help     # todos os subcomandos do kanban via CLI`}</Block>
        </Step>
        <Warn>
          Ao expor o dashboard fora do seu computador (VPS, rede), configure
          autenticação ou VPN antes — ele dá acesso a chaves e configuração.
        </Warn>
      </Section>
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
    sub: "Abrir o dashboard, modelo, primeiro chat",
    icon: MousePointerClick,
    content: <BasicDocs />,
  },
  {
    id: "medium",
    label: "Médio",
    sub: "Chaves, canais, habilidades, cron, agentes",
    icon: Zap,
    content: <MediumDocs />,
  },
  {
    id: "advanced",
    label: "Avançado",
    sub: "Frota, multi-agente, roteamento, Kanban",
    icon: Rocket,
    content: <AdvancedDocs />,
  },
] as const;

type Level = (typeof LEVELS)[number]["id"];

export default function DocsPage() {

  const { setEnd } = usePageHeader();
  const [level, setLevel] = useState<Level>("basic");

  useLayoutEffect(() => {
    setEnd(null);
    return () => setEnd(null);
  }, [setEnd]);

  const active = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 gap-0">
      <PluginSlot name="docs:top" />

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
              <h2 className="text-xl font-bold">{active.label}</h2>
              <p className="text-sm text-muted-foreground">{active.sub}</p>
            </div>
          </div>
          {active.content}
        </div>
      </main>

      <PluginSlot name="docs:bottom" />
    </div>
  );
}
