import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  AgentDraftContext,
  EMPTY_AGENT_DRAFT,
  TOTAL_WIZARD_SLIDES,
  type AgentDraft,
} from "./agent-draft-context";

const STORAGE_KEY = "mangaba:agent-draft";

interface State {
  draft: AgentDraft;
  currentSlide: number;
}

const INITIAL_STATE: State = { draft: EMPTY_AGENT_DRAFT, currentSlide: 1 };

function clampSlide(n: number): number {
  return Math.min(Math.max(n, 1), TOTAL_WIZARD_SLIDES);
}

function loadInitialState(): State {
  // A entrada do wizard é sempre o Slide 1 — só as respostas já preenchidas
  // são restauradas (sessionStorage), nunca o progresso de navegação.
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<State>;
    return { draft: { ...EMPTY_AGENT_DRAFT, ...parsed.draft }, currentSlide: 1 };
  } catch {
    return INITIAL_STATE;
  }
}

type Action =
  | { type: "UPDATE_DRAFT"; patch: Partial<AgentDraft> }
  | { type: "GO_TO_SLIDE"; slide: number }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "UPDATE_DRAFT":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "GO_TO_SLIDE":
      return { ...state, currentSlide: clampSlide(action.slide) };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

// Estado "rascunho" do agente sendo criado no wizard — sobrevive a
// avançar/voltar entre slides e a um refresh de página (sessionStorage). Não
// é fonte de verdade: cada slide grava no backend real ao ser confirmado,
// isto é só o estado de navegação/formulário da UI.
export function AgentDraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  const updateDraft = useCallback((patch: Partial<AgentDraft>) => {
    dispatch({ type: "UPDATE_DRAFT", patch });
  }, []);

  const goToSlide = useCallback((slide: number) => {
    dispatch({ type: "GO_TO_SLIDE", slide });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage indisponível (modo privado, quota) — segue sem persistir.
    }
  }, [state]);

  const value = useMemo(
    () => ({
      draft: state.draft,
      currentSlide: state.currentSlide,
      updateDraft,
      goNext: () => goToSlide(state.currentSlide + 1),
      goBack: () => goToSlide(state.currentSlide - 1),
      goToSlide,
      reset,
    }),
    [state, updateDraft, goToSlide, reset],
  );

  return (
    <AgentDraftContext.Provider value={value}>
      {children}
    </AgentDraftContext.Provider>
  );
}
