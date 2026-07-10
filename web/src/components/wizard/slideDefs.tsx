import type { ComponentType } from "react";
import type { AgentDraft } from "@/contexts/agent-draft-context";
import {
  Slide1CognitiveEngine,
  slide1IsValid,
} from "./slides/Slide1CognitiveEngine";
import { Slide2Creator, creatorIsValid } from "./slides/Slide2Creator";
import { Slide2DryRun } from "./slides/Slide2DryRun";
import { Slide3Identity, slide3IsValid } from "./slides/Slide3Identity";
import { Slide4RAG, slide4IsValid } from "./slides/Slide4RAG";
import { Slide5Tools, slide5IsValid } from "./slides/Slide5Tools";
import { Slide6Skills, slide6IsValid } from "./slides/Slide6Skills";
import { Slide7MCP, slide7IsValid } from "./slides/Slide7MCP";
import { Slide8Heartbeat, slide8IsValid } from "./slides/Slide8Heartbeat";
import { Slide9Channels, slide9IsValid } from "./slides/Slide9Channels";

export interface SlideDef {
  id: number;
  key: string;
  title: string;
  description: string;
  /** Passo pode avançar? Placeholder libera tudo até a slide real ser implementada. */
  isValid: (draft: AgentDraft) => boolean;
  Component: ComponentType;
}

// As 10 slides lineares do Mangaba Agent Builder.
export const SLIDE_DEFS: SlideDef[] = [
  {
    id: 1,
    key: "model",
    title: "Primeiros passos",
    description: "Escolha o modelo que vai rodar o agente.",
    isValid: slide1IsValid,
    Component: Slide1CognitiveEngine,
  },
  {
    id: 2,
    key: "creator",
    title: "Informações do criador",
    description: "Conte um pouco sobre quem está criando este funcionário agêntico.",
    isValid: creatorIsValid,
    Component: Slide2Creator,
  },
  {
    id: 3,
    key: "dry-run",
    title: "Teste rápido",
    description: "Converse com o modelo no contexto do seu funcionário agêntico antes de configurar o resto.",
    isValid: () => true,
    Component: Slide2DryRun,
  },
  {
    id: 4,
    key: "identity",
    title: "Identidade do funcionário agêntico",
    description: "Nome e função do funcionário agêntico.",
    isValid: slide3IsValid,
    Component: Slide3Identity,
  },
  {
    id: 5,
    key: "knowledge",
    title: "Base de conhecimento",
    description: "Envie documentos para o agente consultar.",
    isValid: slide4IsValid,
    Component: Slide4RAG,
  },
  {
    id: 6,
    key: "tools",
    title: "Ferramentas internas",
    description: "Ligue as ferramentas do ecossistema que o agente pode usar.",
    isValid: slide5IsValid,
    Component: Slide5Tools,
  },
  {
    id: 7,
    key: "skills",
    title: "Habilidades",
    description: "Crie habilidades manuais ou adquira do catálogo ClawHub.",
    isValid: slide6IsValid,
    Component: Slide6Skills,
  },
  {
    id: 8,
    key: "mcp",
    title: "Recursos externos",
    description: "Conecte serviços externos via Model Context Protocol.",
    isValid: slide7IsValid,
    Component: Slide7MCP,
  },
  {
    id: 9,
    key: "heartbeat",
    title: "Automações",
    description: "Descreva em texto quando o agente deve agir sozinho.",
    isValid: slide8IsValid,
    Component: Slide8Heartbeat,
  },
  {
    id: 10,
    key: "channels",
    title: "Canais",
    description: "Conecte Telegram, WhatsApp, Teams ou e-mail.",
    isValid: slide9IsValid,
    Component: Slide9Channels,
  },
];
