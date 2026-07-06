import { createContext } from "react";

export interface ModelConfigDraft {
  provider: string;
  model: string;
}

export interface AgentIdentityDraft {
  agent_name: string;
  soul: string;
}

export interface KnowledgeFileDraft {
  name: string;
  status: "pending" | "indexed" | "error";
}

export interface SkillDraft {
  id: string;
  tool: string;
  instruction: string;
  action: string;
}

export interface McpConnectionDraft {
  id: string;
  name: string;
  url: string;
  connected: boolean;
}

export interface CronScheduleDraft {
  /** Formato aceito por `parse_schedule()` no backend (`cron/jobs.py`). */
  kind: "cron" | "every" | "once";
  expr: string;
  display: string;
}

export interface ChannelDraft {
  token?: string;
  connected: boolean;
}

export interface OAuthModelConfig {
  temperature: number;
  top_p: number;
  max_tokens: number;
}

export interface EngineOAuthDraft {
  engine_type: "gpt-plus-oauth" | null;
  oauth_status: "disconnected" | "connecting" | "connected";
  oauth_user_id: string;
  model_configs: OAuthModelConfig;
}

export interface AgentDraft {
  model_config: ModelConfigDraft;
  identity: AgentIdentityDraft;
  knowledge_files: KnowledgeFileDraft[];
  internal_tools: Record<string, boolean>;
  skills: SkillDraft[];
  mcp_connections: McpConnectionDraft[];
  heartbeat: { raw_text: string; schedule: CronScheduleDraft | null };
  channels: Record<string, ChannelDraft>;
  engine_oauth: EngineOAuthDraft;
}

export const EMPTY_AGENT_DRAFT: AgentDraft = {
  model_config: { provider: "", model: "" },
  identity: { agent_name: "", soul: "" },
  knowledge_files: [],
  internal_tools: {},
  skills: [],
  mcp_connections: [],
  heartbeat: { raw_text: "", schedule: null },
  channels: {},
  engine_oauth: {
    engine_type: null,
    oauth_status: "disconnected",
    oauth_user_id: "",
    model_configs: { temperature: 0.7, top_p: 1.0, max_tokens: 2048 },
  },
};

export interface AgentDraftContextValue {
  draft: AgentDraft;
  currentSlide: number;
  /** Faz merge raso das chaves de topo do draft (cada slide só toca a sua). */
  updateDraft: (patch: Partial<AgentDraft>) => void;
  goNext: () => void;
  goBack: () => void;
  goToSlide: (slide: number) => void;
  reset: () => void;
}

export const AgentDraftContext = createContext<AgentDraftContextValue | null>(
  null,
);

/** Os 9 passos lineares do wizard — ver `slideDefs.tsx`. */
export const TOTAL_WIZARD_SLIDES = 9;
