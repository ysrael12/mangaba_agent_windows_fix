export interface Agent {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  uptime: string;
  requests: number;
  nextAction?: string;
  errorDetail?: string;
  soul: string;
  tools: string[];
  skills: string[];
  mcpServers: string[];
  channels: string[];
  ragDocsCount: number;
  schedule?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

export interface Session {
  id: string;
  title: string;
  time: string;
  dateGroup: 'Hoje' | 'Ontem' | 'Anteriores';
  agentId: string;
  messages: Message[];
}

export interface Log {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  service: string;
}

export interface McpServer {
  id: string;
  name: string;
  type: 'command' | 'sse';
  value: string;
  status: 'connected' | 'failed' | 'testing';
  toolsCount: number;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'integration' | 'automation';
  enabled: boolean;
  requiresConfig?: boolean;
  configFields?: {
    name: string;
    label: string;
    type: 'text' | 'password' | 'boolean';
    value: string;
  }[];
}

export interface AgentDraft {
  id: string;
  modelConfig: {
    provider: string;
    model: string;
  };
  identity: {
    name: string;
    soul: string;
  };
  knowledgeFiles: {
    id: string;
    name: string;
    size: string;
    status: 'pending' | 'indexed' | 'error';
    progress: number;
  }[];
  internalTools: {
    webSearch: boolean;
    emailSend: boolean;
    codeExecution: boolean;
    taskScheduling: boolean;
  };
  skills: {
    [key: string]: {
      enabled: boolean;
      config?: Record<string, string>;
    };
  };
  mcpServers: McpServer[];
  heartbeat: {
    rawText: string;
    schedule: string;
    parsedCron: string;
    nextRun: string;
  };
  channels: {
    telegram: { enabled: boolean; token: string };
    discord: { enabled: boolean; token: string; webhookUrl: string };
    whatsapp: { enabled: boolean; token: string; phoneNumber: string };
    teams: { enabled: boolean; token: string; webhookUrl: string };
  };
}
