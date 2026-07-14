import { Agent, Session, Log, SkillItem, AgentDraft, McpServer } from '../types';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'default',
    name: 'Assistente Principal',
    description: 'Agente geral de suporte e orquestração de tarefas.',
    provider: 'Google Gemini',
    model: 'Gemini 2.5 Flash',
    status: 'active',
    uptime: '24h 30m',
    requests: 234,
    nextAction: '14:32 (Sincronização de Banco)',
    soul: 'Você é o Assistente Principal do Mangaba Agent. Seu tom é profissional, analítico e resolutivo. Você ajuda o usuário a gerenciar servidores, monitorar tarefas, consultar bancos de dados e orquestrar outros agentes especializados.',
    tools: ['Busca Web', 'Execução de Código', 'Agendador'],
    skills: ['Database Sync', 'Slack Connector'],
    mcpServers: ['npx-mcp-server-postgres'],
    channels: ['Telegram', 'Discord'],
    ragDocsCount: 4,
    schedule: '0 9 * * *'
  },
  {
    id: 'email-bot',
    name: 'Email Bot',
    description: 'Focado em triagem de inbox e automações de email marketing.',
    provider: 'OpenAI',
    model: 'GPT-4o',
    status: 'idle',
    uptime: '2h 15m',
    requests: 12,
    nextAction: '15:00 (Envio de Relatório)',
    soul: 'Você é o Email Bot. Seu foco exclusivo é redigir, resumir e organizar e-mails de forma ágil e cortês.',
    tools: ['Envio de Emails'],
    skills: ['Gmail Integration'],
    mcpServers: [],
    channels: ['Slack'],
    ragDocsCount: 1,
    schedule: '0 * * * *'
  },
  {
    id: 'backup-agent',
    name: 'Backup Agent',
    description: 'Automatizador de segurança de arquivos e snapshots locais.',
    provider: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    status: 'error',
    uptime: '0m',
    requests: 0,
    errorDetail: 'Conexão BD falhou - Timeout de rede ao tentar conectar em postgres://db-mangaba:5432/main. Verifique as credenciais no arquivo .env ou no painel de configurações do MCP.',
    soul: 'Você é o Backup Agent. Sua missão é garantir a integridade dos dados realizando backups automatizados.',
    tools: ['Agendador'],
    skills: [],
    mcpServers: ['db-backup-tool'],
    channels: [],
    ragDocsCount: 0
  }
];

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'sess-1',
    title: 'Como implementar backups em nuvem?',
    time: '14:30',
    dateGroup: 'Hoje',
    agentId: 'default',
    messages: [
      { id: '1', sender: 'user', text: 'Olá! Como posso implementar backups automatizados na nuvem usando o Mangaba Agent?', timestamp: '14:30:00' },
      { id: '2', sender: 'agent', text: 'Olá! Com o Mangaba Agent, você pode configurar o "Backup Agent" no painel. O método recomendado é usar o MCP Server de conexões locais para extrair os dumps e agendar um gatilho de Heartbeat no passo 8 para rodar diariamente. Deseja que eu auxilie na criação do script de backup?', timestamp: '14:30:12' }
    ]
  },
  {
    id: 'sess-2',
    title: 'Qual é a melhor forma de indexar PDFs?',
    time: '11:45',
    dateGroup: 'Hoje',
    agentId: 'default',
    messages: [
      { id: '1', sender: 'user', text: 'Quero indexar vários PDFs técnicos da minha empresa para busca semântica.', timestamp: '11:45:00' },
      { id: '2', sender: 'agent', text: 'Perfeito! No painel "Criar Agente", utilize o Slide 4 (Knowledge RAG) para fazer o upload dos seus arquivos (.pdf, .txt, ou .md). O Mangaba Agent fará a extração do texto e a indexação automática via TF-IDF local estruturada, deixando todo o conhecimento disponível para o agente responder consultas técnicas sem expor dados confidenciais a APIs públicas desnecessárias.', timestamp: '11:45:30' }
    ]
  },
  {
    id: 'sess-3',
    title: 'Pode ajudar com automações?',
    time: '09:15',
    dateGroup: 'Hoje',
    agentId: 'email-bot',
    messages: [
      { id: '1', sender: 'user', text: 'Quero programar o envio de emails quando o faturamento cair.', timestamp: '09:15:00' },
      { id: '2', sender: 'agent', text: 'Com certeza! Você pode ativar a skill "Gmail Integration" e configurar uma tarefa acionada a cada hora (0 * * * *). Eu farei o monitoramento dos dados via banco e acionarei o disparo.', timestamp: '09:15:25' }
    ]
  },
  {
    id: 'sess-4',
    title: 'Dúvida sobre deploy local',
    time: '17:20',
    dateGroup: 'Ontem',
    agentId: 'default',
    messages: [
      { id: '1', sender: 'user', text: 'Como mudo a porta do dev server de 5173 para outra no docker?', timestamp: '17:20:00' },
      { id: '2', sender: 'agent', text: 'No Dockerfile ou no docker-compose, você pode expor uma porta diferente (ex: 3000) e alterar a flag `--port` do script dev no package.json. Lembre-se de remapear as portas do container correspondentes no host local.', timestamp: '17:20:45' }
    ]
  }
];

export const INITIAL_LOGS: Log[] = [
  { id: 'log-1', timestamp: '14:32:15', level: 'INFO', message: 'Chat iniciado com o usuário na sessão "Como implementar backups"', service: 'Web Server' },
  { id: 'log-2', timestamp: '14:31:48', level: 'SUCCESS', message: 'Agente "Assistente Principal" iniciado e escutando na porta 3000', service: 'Agent Engine' },
  { id: 'log-3', timestamp: '14:30:22', level: 'WARNING', message: 'Latência de resposta da API do provedor externo acima de 1500ms', service: 'LLM Gateway' },
  { id: 'log-4', timestamp: '14:29:01', level: 'ERROR', message: 'API timeout ao contactar o servidor MCP "db-backup-tool"', service: 'MCP Client' },
  { id: 'log-5', timestamp: '14:28:45', level: 'DEBUG', message: 'Configurações de ambiente carregadas com sucesso de .env', service: 'System Core' },
  { id: 'log-6', timestamp: '14:25:12', level: 'INFO', message: 'Conexão de WebSocket recebida do cliente IP 127.0.0.1', service: 'Web Server' },
  { id: 'log-7', timestamp: '14:20:03', level: 'SUCCESS', message: 'Arquivo "documento_tecnico.pdf" indexado no RAG com sucesso (45.2 KB)', service: 'RAG Pipeline' },
  { id: 'log-8', timestamp: '14:18:10', level: 'WARNING', message: 'Formato de cron detectado como não convencional. Ajustado para correspondência local', service: 'Scheduler' }
];

export const INITIAL_SKILLS: SkillItem[] = [
  {
    id: 'db-sync',
    name: 'Database Sync',
    description: 'Sincroniza tabelas do Postgres local com o agente para busca dinâmica de schemas e registros em tempo real.',
    category: 'core',
    enabled: true,
    requiresConfig: true,
    configFields: [
      { name: 'dbUrl', label: 'Postgres Connection String', type: 'text', value: 'postgresql://admin:super_secret@localhost:5432/mangaba' },
      { name: 'schemaFilter', label: 'Tabelas Permitidas (separadas por vírgula)', type: 'text', value: 'users, orders, products' }
    ]
  },
  {
    id: 'gmail-integration',
    name: 'Gmail Integration',
    description: 'Permite ao agente ler rascunhos, agendar e-mails de acompanhamento e enviar resumos diários diretamente pela sua conta.',
    category: 'integration',
    enabled: false,
    requiresConfig: true,
    configFields: [
      { name: 'oauthClientId', label: 'Client ID da API do Google', type: 'text', value: '' },
      { name: 'oauthSecret', label: 'Client Secret da API do Google', type: 'password', value: '' }
    ]
  },
  {
    id: 'slack-connector',
    name: 'Slack Connector',
    description: 'Envia alertas automatizados de execução e atua como canal bidirecional para comandar agentes do Slack.',
    category: 'integration',
    enabled: true,
    requiresConfig: true,
    configFields: [
      { name: 'botToken', label: 'Slack Bot User OAuth Token', type: 'password', value: 'xoxb-dummy-token-string' },
      { name: 'defaultChannel', label: 'Canal de Notificações Padrão', type: 'text', value: '#mangaba-alerts' }
    ]
  },
  {
    id: 'calendar-integration',
    name: 'Google Calendar API',
    description: 'Agenda reuniões, busca disponibilidade de horários e gera convites inteligentes para compromissos profissionais.',
    category: 'integration',
    enabled: false,
    requiresConfig: false
  },
  {
    id: 'github-sync',
    name: 'GitHub Agent Sync',
    description: 'Monitora pull requests, cria issues baseadas em logs de erro e comenta de forma inteligente em trechos de código bugados.',
    category: 'automation',
    enabled: false,
    requiresConfig: true,
    configFields: [
      { name: 'accessToken', label: 'GitHub Personal Access Token', type: 'password', value: '' },
      { name: 'repoName', label: 'Repositório Alvo (org/repo)', type: 'text', value: '' }
    ]
  },
  {
    id: 'discord-logger',
    name: 'Discord Logger',
    description: 'Envia relatórios de status em canais dedicados de auditoria e logs do Discord.',
    category: 'integration',
    enabled: false,
    requiresConfig: false
  }
];

export const INITIAL_DRAFT: AgentDraft = {
  id: '',
  modelConfig: {
    provider: 'Google Gemini',
    model: 'Gemini 2.5 Flash'
  },
  identity: {
    name: 'Agente Customizado',
    soul: 'Você é um assistente proativo criado pelo Mangaba Agent. Seu objetivo é ajudar no dia a dia com automações eficientes.'
  },
  knowledgeFiles: [],
  internalTools: {
    webSearch: true,
    emailSend: false,
    codeExecution: true,
    taskScheduling: false
  },
  skills: {
    'db-sync': { enabled: true, config: { dbUrl: 'postgresql://admin:super_secret@localhost:5432/mangaba', schemaFilter: 'users, orders' } },
    'slack-connector': { enabled: false }
  },
  mcpServers: [
    {
      id: 'mcp-1',
      name: 'npx-mcp-server-postgres',
      type: 'command',
      value: 'npx -y @modelcontextprotocol/server-postgres postgres://admin:secret@localhost:5432/main',
      status: 'connected',
      toolsCount: 6
    }
  ],
  heartbeat: {
    rawText: 'todo dia às 9h',
    schedule: '0 9 * * *',
    parsedCron: '0 9 * * *',
    nextRun: '12/07/2026 às 09:00 (Amanhã)'
  },
  channels: {
    telegram: { enabled: false, token: '' },
    discord: { enabled: false, token: '', webhookUrl: '' },
    whatsapp: { enabled: false, token: '', phoneNumber: '' },
    teams: { enabled: false, token: '', webhookUrl: '' }
  }
};

export const MOCK_REPLIES: Record<string, string[]> = {
  default: [
    "Com certeza! Como Assistente Principal, posso rodar essa rotina de sincronização do banco local.",
    "Entendido. Verifiquei as conexões do MCP e o servidor Postgres está respondendo adequadamente com 6 ferramentas ativas.",
    "Excelente pergunta. Posso agendar essa tarefa para rodar no formato cron desejado.",
    "Para conectar canais externos, certifique-se de preencher o token no passo 9 do wizard.",
  ],
  'email-bot': [
    "Olá! Estou pronto para enviar relatórios diários de email.",
    "Rascunho criado no Gmail com sucesso! Deseja que eu envie agora?",
    "Monitorei a caixa de entrada e não há novos alertas urgentes por enquanto."
  ],
  'backup-agent': [
    "⚠️ Erro crítico: Conexão BD falhou. Por favor, verifique se o servidor Postgres local está ativo e na porta correta (5432).",
    "Estou em estado de erro. Tente reiniciar-me clicando em 'Reiniciar' no painel do Fleet."
  ],
  generic: [
    "Entendido. Processando sua requisição com as skills ativas...",
    "Excelente! Posso buscar essa informação no índice de conhecimento local (RAG) se precisar.",
    "Olá! Estou rodando perfeitamente e pronto para automatizar suas tarefas.",
    "Sim, o Mangaba Agent está operando em tempo real."
  ]
};

export function parseNaturalLanguageSchedule(text: string): { cron: string; description: string; nextRun: string } {
  const t = text.toLowerCase().trim();
  
  if (t === 'todo dia às 9h' || t === 'todo dia as 9h' || t === 'diariamente às 9h' || t === 'diariamente as 9h') {
    return {
      cron: '0 9 * * *',
      description: 'Diariamente às 09:00',
      nextRun: 'Amanhã às 09:00'
    };
  }
  
  if (t === 'toda segunda às 14h' || t === 'toda segunda-feira às 14h' || t === 'segunda às 14h') {
    return {
      cron: '0 14 * * 1',
      description: 'Toda segunda-feira às 14:00',
      nextRun: 'Próxima segunda às 14:00'
    };
  }
  
  if (t === 'a cada 30 minutos' || t === 'a cada 30 min') {
    return {
      cron: '*/30 * * * *',
      description: 'A cada 30 minutos',
      nextRun: 'Em 30 minutos'
    };
  }

  if (t === 'a cada 10 minutos' || t === 'a cada 10 min') {
    return {
      cron: '*/10 * * * *',
      description: 'A cada 10 minutos',
      nextRun: 'Em 10 minutos'
    };
  }

  if (t === 'a cada hora' || t === 'de hora em hora') {
    return {
      cron: '0 * * * *',
      description: 'De hora em hora',
      nextRun: 'No próximo início de hora'
    };
  }

  if (t.startsWith('a cada') && t.includes('segundos')) {
    const num = t.replace(/[^0-9]/g, '');
    const seconds = num ? parseInt(num) : 30;
    return {
      cron: `*/${seconds}s (Simulado)`,
      description: `A cada ${seconds} segundos`,
      nextRun: `Em ${seconds} segundos`
    };
  }

  // Fallback parsed via custom regex
  const hourMatch = t.match(/às\s+(\d+)(h|:(\d+))?/i);
  if (hourMatch) {
    const hour = hourMatch[1];
    const min = hourMatch[3] || '00';
    return {
      cron: `${min} ${hour} * * *`,
      description: `Diariamente às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`,
      nextRun: `Hoje/Amanhã às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
    };
  }

  return {
    cron: '*/5 * * * * (padrão)',
    description: 'A cada 5 minutos (Não reconhecido totalmente, usando padrão)',
    nextRun: 'Em 5 minutos'
  };
}
