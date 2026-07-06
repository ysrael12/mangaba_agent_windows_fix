import { useContext } from "react";
import { AgentDraftContext, type AgentDraftContextValue } from "./agent-draft-context";

export function useAgentDraft(): AgentDraftContextValue {
  const ctx = useContext(AgentDraftContext);
  if (!ctx) {
    throw new Error("useAgentDraft must be used within an AgentDraftProvider");
  }
  return ctx;
}
