import { useLayoutEffect, useState } from "react";

import { usePageHeader } from "@/contexts/usePageHeader";
import { cn } from "@/lib/utils";
import { PluginSlot } from "@/plugins";
import { ChevronDown, ChevronRight, Terminal, Zap, Rocket } from "lucide-react";

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
// Level content
// ---------------------------------------------------------------------------

function BasicDocs() {
  return (
    <div className="space-y-4">
      <Section title="1. Instalação">
        <Step n={1} title="Instalar via pip">
          <p>Requer Python 3.10 ou superior.</p>
          <Block>{`pip install mangaba-agent`}</Block>
          <p>Ou com pipx (recomendado para instalação global isolada):</p>
          <Block>{`pipx install mangaba-agent`}</Block>
        </Step>

        <Step n={2} title="Verificar a instalação">
          <Block>{`mangaba --version`}</Block>
          <p>Deve exibir a versão instalada.</p>
        </Step>
      </Section>

      <Section title="2. Configuração inicial">
        <Step n={1} title="Executar o assistente de configuração">
          <p>O comando abaixo cria a pasta <Code>~/.mangaba/</Code> e o arquivo <Code>config.yaml</Code> com perguntas guiadas.</p>
          <Block>{`mangaba init`}</Block>
        </Step>

        <Step n={2} title="Escolher um modelo de linguagem">
          <p>Você tem três opções principais:</p>
          <p><strong>A) Ollama (local, grátis, sem internet)</strong></p>
          <Block>{`# Instale o Ollama em https://ollama.com
# Depois baixe um modelo:
ollama pull llama3.2       # 2 GB — rápido
ollama pull gemma3         # 3 GB — melhor qualidade
ollama pull mistral        # 4 GB — equilibrado
ollama pull deepseek-r1    # 7 GB — raciocínio`}</Block>
          <p>Após instalar, edite <Code>~/.mangaba/config.yaml</Code>:</p>
          <Block>{`model: llama3.2
provider: ollama`}</Block>

          <p className="pt-2"><strong>B) OpenAI (nuvem, pago)</strong></p>
          <Block>{`# Obtenha sua chave em https://platform.openai.com
# Salve no Mangaba:
mangaba env set OPENAI_API_KEY=sk-...`}</Block>
          <Block>{`model: gpt-4o-mini
provider: openai`}</Block>

          <p className="pt-2"><strong>C) Anthropic / Claude (nuvem, pago)</strong></p>
          <Block>{`mangaba env set ANTHROPIC_API_KEY=sk-ant-...`}</Block>
          <Block>{`model: claude-haiku-4-5-20251001
provider: anthropic`}</Block>
        </Step>

        <Tip>Para uso pessoal e aprendizado, recomendamos Ollama + gemma3 — roda 100% local, sem custo e sem enviar dados para servidores externos.</Tip>
      </Section>

      <Section title="3. Iniciando o gateway">
        <Step n={1} title="Iniciar o gateway (processo de IA)">
          <p>O gateway é o processo principal que roda o agente. Ele precisa estar ativo para o agente responder.</p>
          <Block>{`mangaba gateway start`}</Block>
          <p>Ou pelo dashboard: barra lateral → <strong>Sistema</strong> → botão <strong>Reiniciar gateway</strong>.</p>
        </Step>

        <Step n={2} title="Verificar se está rodando">
          <Block>{`mangaba gateway status`}</Block>
          <p>Deve exibir <Code>running</Code> e o PID do processo.</p>
        </Step>
      </Section>

      <Section title="4. Abrindo o dashboard">
        <Step n={1} title="Iniciar a interface web">
          <Block>{`mangaba dashboard`}</Block>
          <p>Abre automaticamente em <Code>http://localhost:9119</Code>.</p>
        </Step>

        <Step n={2} title="Navegar pelo dashboard">
          <p>A barra lateral esquerda tem todas as seções:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Chat</strong> — conversa direta com o agente</li>
            <li><strong>Sessões</strong> — histórico de todas as conversas</li>
            <li><strong>Fleet</strong> — gerenciar agentes rodando</li>
            <li><strong>Configuração</strong> — todos os parâmetros</li>
            <li><strong>Chaves</strong> — chaves de API</li>
          </ul>
        </Step>
      </Section>

      <Section title="5. Primeira conversa">
        <Step n={1} title="Abrir o chat">
          <p>Clique em <strong>Chat</strong> na barra lateral.</p>
        </Step>

        <Step n={2} title="Enviar uma mensagem">
          <p>Digite qualquer mensagem no campo de texto e pressione Enter ou clique em Enviar.</p>
          <Block>{`Olá! Quem é você e o que você pode fazer?`}</Block>
        </Step>

        <Step n={3} title="Aguardar a resposta">
          <p>O agente processa e responde em tempo real. O streaming mostra cada token conforme é gerado.</p>
        </Step>

        <Tip>Cada conversa cria uma <strong>sessão</strong> independente com seu próprio contexto e histórico. Você pode ver todas as sessões em <strong>Sessões</strong>.</Tip>
      </Section>

      <Section title="6. Parando o gateway">
        <Step n={1} title="Parar o gateway">
          <Block>{`mangaba gateway stop`}</Block>
          <p>Ou pelo dashboard: <strong>Sistema</strong> → <strong>Parar gateway</strong>.</p>
        </Step>

        <Warn>Parar o gateway encerra o agente imediatamente. Sessões ativas serão interrompidas. O histórico fica salvo.</Warn>
      </Section>
    </div>
  );
}

function MediumDocs() {
  return (
    <div className="space-y-4">
      <Section title="1. Profiles — agentes com personalidades diferentes">
        <Step n={1} title="Criar um novo profile">
          <p>Um profile é um agente completamente independente: SOUL próprio, modelo próprio, memória própria.</p>
          <Block>{`mangaba profile create suporte
mangaba profile create vendas
mangaba profile create pesquisa`}</Block>
          <p>Isso cria pastas em <Code>~/.mangaba/profiles/nome/</Code>.</p>
        </Step>

        <Step n={2} title="Editar a personalidade (SOUL.md)">
          <p>O SOUL.md é o prompt de sistema do agente. Edite em:</p>
          <Block>{`~/.mangaba/profiles/suporte/SOUL.md`}</Block>
          <p>Ou pelo dashboard: <strong>Perfis</strong> → card do agente → <strong>Editar SOUL</strong>.</p>
          <p>Exemplo de SOUL.md para um agente de suporte:</p>
          <Block>{`# Agente de Suporte Técnico

Você é um especialista em suporte técnico da empresa XPTO.
Responda sempre em português, de forma objetiva e clara.
Sempre confirme o problema antes de sugerir soluções.
Quando não souber a resposta, diga isso honestamente.`}</Block>
        </Step>

        <Step n={3} title="Configurar o modelo do profile">
          <p>Cada profile pode usar um modelo diferente. Edite <Code>~/.mangaba/profiles/suporte/config.yaml</Code>:</p>
          <Block>{`model: gemma3
provider: ollama`}</Block>
        </Step>

        <Step n={4} title="Iniciar o profile">
          <Block>{`mangaba fleet start suporte`}</Block>
          <p>Ou pelo dashboard: <strong>Fleet</strong> → card do agente → <strong>Subir</strong>.</p>
        </Step>
      </Section>

      <Section title="2. Conectar ao Telegram">
        <Step n={1} title="Criar o bot no Telegram">
          <p>Abra o Telegram e procure por <Code>@BotFather</Code>. Envie:</p>
          <Block>{`/newbot`}</Block>
          <p>Siga as instruções: escolha nome e username do bot. Ao final, você recebe o <strong>token</strong>.</p>
        </Step>

        <Step n={2} title="Salvar o token no Mangaba">
          <Block>{`mangaba env set TELEGRAM_BOT_TOKEN=7123456789:AAF...`}</Block>
          <p>Ou pelo dashboard: <strong>Chaves</strong> → campo <strong>TELEGRAM_BOT_TOKEN</strong>.</p>
        </Step>

        <Step n={3} title="Habilitar o Telegram no config.yaml">
          <p>Edite <Code>~/.mangaba/config.yaml</Code>:</p>
          <Block>{`platforms:
  telegram:
    enabled: true
    home_channel:
      chat_id: "SEU_CHAT_ID"   # seu chat pessoal como operador
      name: "Operador"`}</Block>
          <Tip>Para saber seu chat_id: envie qualquer mensagem para <Code>@userinfobot</Code> no Telegram.</Tip>
        </Step>

        <Step n={4} title="Reiniciar o gateway">
          <Block>{`mangaba gateway restart`}</Block>
          <p>Agora envie uma mensagem para o bot no Telegram — ele deve responder.</p>
        </Step>

        <Step n={5} title="Adicionar o bot em um grupo (opcional)">
          <p>Adicione o bot ao grupo normalmente pelo Telegram. Por padrão, cada usuário do grupo tem sua própria sessão de conversa.</p>
          <Tip>Para que todos no grupo compartilhem a mesma sessão, adicione em <Code>config.yaml</Code>:<br /><Code>group_sessions_per_user: false</Code></Tip>
        </Step>
      </Section>

      <Section title="3. Conectar ao Discord">
        <Step n={1} title="Criar a aplicação no Discord">
          <p>Acesse <Code>https://discord.com/developers/applications</Code> → <strong>New Application</strong> → dê um nome.</p>
        </Step>

        <Step n={2} title="Criar o bot e copiar o token">
          <p>Aba <strong>Bot</strong> → <strong>Add Bot</strong> → <strong>Reset Token</strong> → copie o token.</p>
          <p>Na mesma aba, ative <strong>Message Content Intent</strong> (obrigatório para ler mensagens).</p>
        </Step>

        <Step n={3} title="Convidar o bot para o servidor">
          <p>Aba <strong>OAuth2</strong> → <strong>URL Generator</strong>:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Scopes: <Code>bot</Code></li>
            <li>Permissions: <Code>Send Messages</Code>, <Code>Read Message History</Code>, <Code>View Channels</Code></li>
          </ul>
          <p>Copie a URL gerada, abra no navegador e convide para o seu servidor.</p>
        </Step>

        <Step n={4} title="Configurar no Mangaba">
          <Block>{`mangaba env set DISCORD_BOT_TOKEN=MTI3...`}</Block>
          <Block>{`platforms:
  discord:
    enabled: true
    home_channel:
      chat_id: "ID_DO_CANAL"   # ID do canal #operador do seu servidor`}</Block>
          <Tip>Para obter o ID de um canal no Discord: Configurações → Avançado → Modo Desenvolvedor → clique direito no canal → Copiar ID.</Tip>
        </Step>
      </Section>

      <Section title="4. Habilidades (Skills)">
        <Step n={1} title="Ver habilidades disponíveis">
          <p>Dashboard → <strong>Habilidades</strong>. São 98+ habilidades pré-instaladas: GitHub, Airtable, Telegram, WhatsApp, ArXiv, buscas web, etc.</p>
        </Step>

        <Step n={2} title="Ativar uma habilidade">
          <p>Clique no toggle ao lado da habilidade. Algumas precisam de chave de API — um aviso aparece indicando qual variável configurar.</p>
        </Step>

        <Step n={3} title="Testar a habilidade no chat">
          <Block>{`Pesquise no arXiv sobre "large language models" e me dê os 3 artigos mais recentes.`}</Block>
          <p>O agente vai usar automaticamente a habilidade <Code>arxiv</Code> para buscar os artigos.</p>
        </Step>
      </Section>

      <Section title="5. Agendamento com Cron">
        <Step n={1} title="Criar uma tarefa agendada">
          <p>Dashboard → <strong>Cron</strong> → <strong>Nova tarefa cron</strong>.</p>
        </Step>

        <Step n={2} title="Preencher os campos">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Nome</strong>: ex. "Resumo diário"</li>
            <li><strong>Prompt</strong>: o que o agente deve fazer (ex. "Faça um resumo das notícias de IA de hoje")</li>
            <li><strong>Agendamento</strong>: expressão cron — ex. <Code>0 9 * * *</Code> = todo dia às 9h</li>
            <li><strong>Entregar para</strong>: onde o resultado chega (Telegram, Discord, Slack, etc.)</li>
          </ul>
        </Step>

        <Step n={3} title="Referência de expressões cron">
          <Block>{`┌─ minuto (0-59)
│ ┌─ hora (0-23)
│ │ ┌─ dia do mês (1-31)
│ │ │ ┌─ mês (1-12)
│ │ │ │ ┌─ dia da semana (0=dom, 6=sab)
│ │ │ │ │
0 9 * * *    → todo dia às 09:00
0 8 * * 1    → toda segunda às 08:00
*/30 * * * * → a cada 30 minutos
0 9,18 * * * → às 09:00 e 18:00`}</Block>
        </Step>
      </Section>

      <Section title="6. Gerenciando sessões">
        <Step n={1} title="Ver histórico completo">
          <p>Dashboard → <strong>Sessões</strong>. Todas as conversas ficam salvas com data, plataforma, contagem de mensagens e preview.</p>
        </Step>

        <Step n={2} title="Pesquisar no histórico">
          <p>Use o campo de pesquisa para buscar por conteúdo das mensagens — pesquisa full-text no banco de dados local.</p>
        </Step>

        <Step n={3} title="Retomar uma sessão no chat">
          <p>Clique em uma sessão → botão <strong>Retomar no Chat</strong>. O agente lembra do contexto completo.</p>
        </Step>

        <Step n={4} title="Ver sessões de todos os profiles">
          <p>Dashboard → <strong>Sessões Globais</strong>. Mostra sessões de todos os agentes da frota em uma única lista.</p>
        </Step>
      </Section>
    </div>
  );
}

function AdvancedDocs() {
  return (
    <div className="space-y-4">
      <Section title="1. Dois agentes no mesmo canal">
        <Step n={1} title="Entender o modelo de isolamento">
          <p>Cada profile = processo de gateway independente. Para ter dois agentes no mesmo Telegram, você precisa de dois bots (dois tokens diferentes) — cada um em um profile separado.</p>
        </Step>

        <Step n={2} title="Criar os dois profiles">
          <Block>{`mangaba profile create suporte
mangaba profile create vendas`}</Block>
        </Step>

        <Step n={3} title="Configurar tokens diferentes por profile">
          <Block>{`# Profile suporte
echo "TELEGRAM_BOT_TOKEN=<token_bot_suporte>" >> ~/.mangaba/profiles/suporte/.env

# Profile vendas
echo "TELEGRAM_BOT_TOKEN=<token_bot_vendas>" >> ~/.mangaba/profiles/vendas/.env`}</Block>
          <p>Ou pelo dashboard: selecione o profile na dropdown → <strong>Chaves</strong>.</p>
        </Step>

        <Step n={4} title="Habilitar o Telegram em cada profile">
          <p>Edite <Code>~/.mangaba/profiles/suporte/config.yaml</Code> e <Code>~/.mangaba/profiles/vendas/config.yaml</Code> com suas respectivas configs de plataforma.</p>
        </Step>

        <Step n={5} title="Iniciar os dois agentes">
          <Block>{`mangaba fleet start suporte
mangaba fleet start vendas

# Verificar status
mangaba fleet list`}</Block>
          <p>Agora você tem dois bots rodando no mesmo Telegram, com personalidades, memórias e modelos diferentes.</p>
        </Step>

        <Tip>Use <strong>Fleet → Roteamento</strong> no dashboard para ver a matriz completa de profiles × canais e identificar conflitos de configuração.</Tip>
      </Section>

      <Section title="2. Kanban multi-worker">
        <Step n={1} title="Entender o Kanban de tarefas">
          <p>O Kanban permite criar tarefas complexas que vários agentes processam em paralelo. Colunas: <strong>Triagem → A fazer → Pronto → Rodando → Bloqueado → Concluído</strong>.</p>
        </Step>

        <Step n={2} title="Criar um quadro">
          <p>Dashboard → <strong>Kanban</strong> → <strong>+ Novo quadro</strong>. Dê um slug único (ex. <Code>dev-tasks</Code>).</p>
        </Step>

        <Step n={3} title="Criar tarefas na coluna Triagem">
          <p>Clique em <Code>+</Code> na coluna Triagem. Descreva a tarefa em linguagem natural — um agente "especificador" vai detalhar a tarefa automaticamente antes de passá-la para execução.</p>
        </Step>

        <Step n={4} title="Configurar workers">
          <p>Qualquer profile pode ser worker. Configure em <Code>config.yaml</Code>:</p>
          <Block>{`kanban:
  enabled: true
  board: dev-tasks        # quadro que este agente monitora
  max_concurrent: 2       # máx tarefas paralelas por este worker
  poll_interval: 30       # verificar a cada 30 segundos`}</Block>
        </Step>

        <Step n={5} title="Monitorar execução">
          <p>No dashboard → Kanban, os cards se movem automaticamente: <strong>Pronto → Rodando → Concluído</strong>. Clique em um card para ver o log do worker em tempo real.</p>
        </Step>

        <Tip>Se um worker fica travado, use o botão <strong>Reivindicar</strong> no card para liberar a tarefa e redistribuir.</Tip>
      </Section>

      <Section title="3. Plugins">
        <Step n={1} title="Instalar um plugin do GitHub">
          <Block>{`# Instalar pelo CLI
mangaba plugins install owner/repo-name

# ou equivalente
mangaba plugins install https://github.com/owner/repo-name`}</Block>
          <p>Ou pelo dashboard: <strong>Plugins</strong> → <strong>Instalar via GitHub / URL Git</strong>.</p>
        </Step>

        <Step n={2} title="Ativar o plugin">
          <p>Após instalar, o plugin aparece em <strong>Plugins</strong> → lista. Clique em <strong>Ativar</strong>.</p>
          <p>Plugins de provedor de modelo/memória aparecem em <strong>Plugins → Provedores</strong> — selecione e salve.</p>
        </Step>

        <Step n={3} title="Estrutura de um plugin (para desenvolvedores)">
          <Block>{`meu-plugin/
├── plugin.yaml          # metadados: nome, versão, habilidades
├── skills/
│   └── minha-skill.py   # lógica da habilidade
└── dashboard/           # opcional: extensão do dashboard (React)
    └── manifest.json`}</Block>
          <Block>{`# plugin.yaml mínimo
name: meu-plugin
version: "1.0.0"
description: "Meu plugin personalizado"
skills:
  - name: minha-skill
    description: "Faz algo útil"
    entry: skills/minha-skill.py`}</Block>
        </Step>

        <Step n={4} title="Testar o plugin localmente">
          <Block>{`# Instalar a partir de um diretório local
mangaba plugins install /caminho/para/meu-plugin`}</Block>
        </Step>
      </Section>

      <Section title="4. Configuração avançada (config.yaml completo)">
        <Step n={1} title="Localização do arquivo">
          <Block>{`~/.mangaba/config.yaml                    # profile padrão
~/.mangaba/profiles/nome/config.yaml     # profile específico`}</Block>
        </Step>

        <Step n={2} title="Seções principais">
          <Block>{`# Modelo e provedor
model: gemma3
provider: ollama

# Comportamento do agente
agent:
  max_turns: 90               # max iterações por turno
  memory_window: 50           # mensagens no contexto
  compression: true           # comprimir histórico longo

# Plataformas (canais)
platforms:
  telegram:
    enabled: true
    home_channel:
      chat_id: "123456"
      name: "Operador"
    group_sessions_per_user: true   # sessão por usuário em grupos
    thread_sessions_per_user: false  # sessão compartilhada em threads

  discord:
    enabled: false
    home_channel:
      chat_id: "999888777"

  slack:
    enabled: false

  whatsapp:
    enabled: false
    home_channel:
      chat_id: "5511999999999"

  email:
    enabled: false
    smtp_host: smtp.gmail.com
    smtp_port: 587

# Memória
memory:
  provider: local             # local | redis | postgres
  max_memories: 1000

# Kanban
kanban:
  enabled: false
  board: main
  max_concurrent: 1

# Segurança
security:
  allowed_users: []           # lista de user_ids permitidos (vazio = todos)
  rate_limit: 60              # máx msgs/minuto por usuário

# Logs
logging:
  level: INFO                 # DEBUG | INFO | WARNING | ERROR`}</Block>
        </Step>
      </Section>

      <Section title="5. Deploy em VPS / Produção">
        <Step n={1} title="Instalar no servidor">
          <Block>{`# Ubuntu/Debian
sudo apt update && sudo apt install -y python3-pip pipx
pipx install mangaba-agent
pipx ensurepath

# Verificar
mangaba --version`}</Block>
        </Step>

        <Step n={2} title="Configurar o ambiente">
          <Block>{`mangaba init
mangaba env set OPENAI_API_KEY=sk-...
# ou configure Ollama no servidor`}</Block>
        </Step>

        <Step n={3} title="Rodar o gateway em segundo plano (systemd)">
          <Block>{`# Criar serviço systemd
sudo nano /etc/systemd/system/mangaba.service`}</Block>
          <Block>{`[Unit]
Description=Mangaba Agent Gateway
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/home/ubuntu/.local/bin/mangaba gateway start --foreground
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target`}</Block>
          <Block>{`sudo systemctl enable mangaba
sudo systemctl start mangaba
sudo systemctl status mangaba`}</Block>
        </Step>

        <Step n={4} title="Acessar o dashboard remotamente via SSH tunnel">
          <Block>{`# No seu computador local:
ssh -L 9119:localhost:9119 usuario@ip-do-servidor

# Agora abra no navegador:
# http://localhost:9119`}</Block>
        </Step>

        <Step n={5} title="Expor o dashboard com Nginx (opcional)">
          <Block>{`# /etc/nginx/sites-available/mangaba
server {
    listen 80;
    server_name meuagente.com;

    location / {
        proxy_pass http://localhost:9119;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}`}</Block>
          <Warn>Expor o dashboard publicamente sem autenticação é um risco de segurança. Configure autenticação básica ou VPN antes de fazer isso em produção.</Warn>
        </Step>

        <Step n={6} title="Atualizar o Mangaba">
          <Block>{`pipx upgrade mangaba-agent`}</Block>
          <p>Ou pelo dashboard: <strong>Sistema</strong> → <strong>Atualizar Mangaba</strong>.</p>
        </Step>
      </Section>

      <Section title="6. Memória e contexto avançado">
        <Step n={1} title="Como funciona a memória">
          <p>O Mangaba usa dois tipos de memória:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Contexto da sessão</strong>: histórico da conversa atual (janela configurável)</li>
            <li><strong>Memória de longo prazo</strong>: fatos salvos explicitamente pelo agente entre sessões</li>
          </ul>
        </Step>

        <Step n={2} title="Salvar um fato na memória de longo prazo">
          <p>Durante a conversa, diga ao agente:</p>
          <Block>{`Lembre que meu nome é João e trabalho com análise de dados.`}</Block>
          <p>O agente salva em <Code>~/.mangaba/memories/</Code> e usa em conversas futuras.</p>
        </Step>

        <Step n={3} title="Compressão de contexto">
          <p>Quando o histórico fica longo, o Mangaba comprime automaticamente mensagens antigas em um resumo. Configure:</p>
          <Block>{`agent:
  compression: true
  memory_window: 50      # manter últimas 50 mensagens íntegras
  context_window: 65536  # max tokens no contexto (0 = auto-detect)`}</Block>
        </Step>
      </Section>

      <Section title="7. CLI vs Dashboard — quando usar cada um">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">Tarefa</th>
                <th className="text-left py-2 pr-4 font-semibold">CLI</th>
                <th className="text-left py-2 font-semibold">Dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Iniciar/parar gateway", "✅ recomendado", "✅"],
                ["Configurar modelo", "✅ editar config.yaml", "✅ formulário visual"],
                ["Gerenciar habilidades", "⚠ editar config.yaml", "✅ recomendado"],
                ["Criar cron jobs", "⚠ editar cron.yaml", "✅ recomendado"],
                ["Ver logs em tempo real", "✅ tail -f gateway.log", "✅"],
                ["Múltiplos profiles (fleet)", "✅ recomendado", "✅"],
                ["Deploy/scripts", "✅ recomendado", "❌"],
                ["Kanban tarefas", "⚠ via API", "✅ recomendado"],
                ["Analytics de uso", "❌", "✅ recomendado"],
              ].map(([task, cli, dash]) => (
                <tr key={task}>
                  <td className="py-2 pr-4">{task}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{cli}</td>
                  <td className="py-2 text-muted-foreground">{dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const LEVELS = [
  {
    id: "basic",
    label: "Básico",
    sub: "Instalação, primeiro chat, gateway",
    icon: Terminal,
    content: <BasicDocs />,
  },
  {
    id: "medium",
    label: "Médio",
    sub: "Profiles, canais, skills, cron",
    icon: Zap,
    content: <MediumDocs />,
  },
  {
    id: "advanced",
    label: "Avançado",
    sub: "Multi-agente, plugins, produção",
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
