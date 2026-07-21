import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Plug,
  Zap,
} from "lucide-react";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/Toast";
import { OAuthLoginModal } from "@/components/OAuthLoginModal";
import { api, type OAuthProvider } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AgentDraft,
  EngineOAuthDraft,
  OAuthModelConfig,
} from "@/contexts/agent-draft-context";

const EASE = [0.22, 1, 0.36, 1] as const;

// eslint-disable-next-line react-refresh/only-export-components
export function slide1IsValid(draft: AgentDraft): boolean {
  return (
    draft.engine_oauth.oauth_status === "connected" &&
    (draft.engine_oauth.oauth_provider_id !== "" ||
      draft.engine_oauth.api_key !== "")
  );
}

/** OpenAI "flower" mark punched out of a rounded-square tile — same
 *  silhouette as the ChatGPT app icon, single-color so it composites into
 *  the provider cards' tinted accent badges (bg-{color}/15 + text-{color}). */
function OpenAiLogo({ className }: { className?: string }) {
  const maskId = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <path
          d="M22.282 9.821a6 6 0 0 0-.516-4.91 6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206 6 6 0 0 0 3.997-2.9 6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023-.141-.085-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z"
          fill="black"
        />
      </mask>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.304 3.541h-3.672l6.696 16.918H24Zm-10.608 0L0 20.459h3.744l1.37-3.552h7.005l1.369 3.552h3.744L10.536 3.541Zm-.371 10.223 2.291-6.008 2.291 6.008Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function XaiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
      <circle cx="12" cy="12" r="2" fill="background" opacity="0.8"/>
    </svg>
  );
}

function DeepSeekLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 377.1 277.86" className={cn("shrink-0", className)} xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M373.15,23.32c-4-1.95-5.72,1.77-8.06,3.66-.79.62-1.47,1.43-2.14,2.14-5.85,6.26-12.67,10.36-21.57,9.86-13.04-.71-24.16,3.38-33.99,13.37-2.09-12.31-9.04-19.66-19.6-24.38-5.54-2.45-11.13-4.9-14.99-10.23-2.71-3.78-3.44-8-4.81-12.16-.85-2.51-1.72-5.09-4.6-5.52-3.13-.5-4.36,2.14-5.58,4.34-4.93,8.99-6.82,18.92-6.65,28.97.43,22.58,9.97,40.56,28.89,53.37,2.16,1.46,2.71,2.95,2.03,5.09-1.29,4.4-2.82,8.68-4.19,13.09-.85,2.82-2.14,3.44-5.15,2.2-10.39-4.34-19.37-10.76-27.29-18.55-13.46-13.02-25.63-27.41-40.81-38.67-3.57-2.64-7.12-5.09-10.81-7.41-15.49-15.07,2.03-27.45,6.08-28.9,4.25-1.52,1.47-6.79-12.23-6.73-13.69.06-26.24,4.65-42.21,10.76-2.34.93-4.79,1.61-7.32,2.14-14.5-2.73-29.55-3.35-45.29-1.58-29.62,3.32-53.28,17.34-70.68,41.28C1.29,88.2-3.63,120.88,2.39,155c6.33,35.91,24.64,65.68,52.8,88.94,29.18,24.1,62.8,35.91,101.15,33.65,23.29-1.33,49.23-4.46,78.48-29.24,7.38,3.66,15.12,5.12,27.97,6.23,9.89.93,19.41-.5,26.79-2.02,11.55-2.45,10.75-13.15,6.58-15.13-33.87-15.78-26.44-9.36-33.2-14.54,17.21-20.41,43.15-41.59,53.3-110.19.79-5.46.11-8.87,0-13.3-.06-2.67.54-3.72,3.61-4.03,8.48-.96,16.72-3.29,24.28-7.47,21.94-12,30.78-31.69,32.87-55.33.31-3.6-.06-7.35-3.86-9.24ZM181.96,235.97c-32.83-25.83-48.74-34.33-55.31-33.96-6.14.34-5.04,7.38-3.69,11.97,1.41,4.53,3.26,7.66,5.85,11.63,1.78,2.64,3.01,6.57-1.78,9.49-10.57,6.58-28.95-2.2-29.82-2.64-21.38-12.59-39.26-29.24-51.87-52.01-12.16-21.92-19.23-45.43-20.39-70.52-.31-6.08,1.47-8.22,7.49-9.3,7.92-1.46,16.11-1.77,24.03-.62,33.49,4.9,62.01,19.91,85.9,43.63,13.65,13.55,23.97,29.71,34.61,45.49,11.3,16.78,23.48,32.75,38.97,45.84,5.46,4.59,9.83,8.09,14,10.67-12.59,1.4-33.62,1.71-47.99-9.68ZM197.69,134.65c0-2.7,2.15-4.84,4.87-4.84.6,0,1.16.12,1.66.31.67.25,1.29.62,1.77,1.18.87.84,1.36,2.08,1.36,3.35,0,2.7-2.15,4.84-4.85,4.84s-4.81-2.14-4.81-4.84ZM246.55,159.77c-3.13,1.27-6.26,2.39-9.27,2.51-4.67.22-9.77-1.68-12.55-4-4.3-3.6-7.36-5.61-8.67-11.94-.54-2.7-.23-6.85.25-9.24,1.12-5.15-.12-8.44-3.74-11.44-2.96-2.45-6.7-3.1-10.82-3.1-1.54,0-2.95-.68-4-1.24-1.72-.87-3.13-3.01-1.78-5.64.43-.84,2.53-2.92,3.02-3.29,5.58-3.19,12.03-2.14,18,.25,5.54,2.26,9.71,6.42,15.72,12.28,6.16,7.1,7.26,9.09,10.76,14.39,2.76,4.19,5.29,8.47,7.01,13.37,1.04,3.04-.31,5.55-3.94,7.1Z"
      />
    </svg>
  );
}

function NvidiaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12c0-4 2-7 6-8v3c-2 .8-3 2.5-3 5s1 4.2 3 5v3c-4-1-6-4-6-8z" fill="currentColor"/>
      <path d="M10 7v3c1 .3 2 1.2 2 2s-1 1.7-2 2v3c3-.5 5-2.5 5-5s-2-4.5-5-5z" fill="currentColor" opacity="0.6"/>
      <path d="M16 8c1.2 1 2 2.5 2 4s-.8 3-2 4V8z" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatDisplay?: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  formatDisplay,
  onChange,
}: SliderFieldProps) {
  const display = formatDisplay ? formatDisplay(value) : String(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-text-secondary">{label}</Label>
        <span className="font-courier text-xs tabular-nums text-text-primary">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-foreground
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-md"
        aria-label={label}
      />
    </div>
  );
}

interface EngineProviderDef {
  id: string;
  engineType: "gpt-plus-oauth" | "claude-oauth" | "gemini-oauth" | "grok-oauth" | "deepseek-api" | "nvidia-api";
  connectionType: "oauth" | "api_key";
  name: string;
  shortName: string;
  description: string;
  flatRate: string;
  connectedLabel: string;
  accentColor: string;
  modelConfig: { provider: string; model: string };
  /** Env var the backend reads the API key from (only for connectionType: "api_key"). */
  apiKeyEnvVar?: string;
}

const ENGINE_DEFS: Record<string, EngineProviderDef> = {
  "openai-codex": {
    id: "openai-codex",
    engineType: "gpt-plus-oauth",
    connectionType: "oauth",
    name: "ChatGPT Plus / Pro",
    shortName: "ChatGPT",
    description:
      "Conecte sua conta ChatGPT Plus / Pro para usar o modelo como cérebro do funcionário agêntico.",
    flatRate: "Acesso flat-rate via assinatura. Sem custos por requisição.",
    connectedLabel: "ChatGPT Plus",
    accentColor: "emerald",
    modelConfig: { provider: "openai-codex", model: "gpt-5.5" },
  },
  anthropic: {
    id: "anthropic",
    engineType: "claude-oauth",
    connectionType: "oauth",
    name: "Claude (Anthropic)",
    shortName: "Claude",
    description:
      "Conecte sua conta Anthropic para usar o modelo Claude como cérebro do funcionário agêntico.",
    flatRate: "Acesso via API Key da Anthropic. Pagamento por uso.",
    connectedLabel: "Claude API",
    accentColor: "orange",
    modelConfig: { provider: "anthropic", model: "claude-sonnet-4-6" },
  },
  "google-gemini-cli": {
    id: "google-gemini-cli",
    engineType: "gemini-oauth",
    connectionType: "oauth",
    name: "Gemini (Google)",
    shortName: "Gemini",
    description:
      "Conecte sua conta Google para usar o Gemini como cérebro do funcionário agêntico.",
    flatRate: "Acesso via assinatura Google Cloud. Camada gratuita disponível.",
    connectedLabel: "Gemini (OAuth)",
    accentColor: "blue",
    modelConfig: { provider: "google-gemini-cli", model: "gemini-2.5-pro" },
  },
  "xai-oauth": {
    id: "xai-oauth",
    engineType: "grok-oauth",
    connectionType: "oauth",
    name: "Grok (xAI)",
    shortName: "Grok",
    description:
      "Conecte sua conta xAI para usar o Grok como cérebro do funcionário agêntico.",
    flatRate: "Acesso via API xAI. Créditos iniciais para novos usuários.",
    connectedLabel: "xAI OAuth",
    accentColor: "violet",
    modelConfig: { provider: "xai-oauth", model: "grok-3" },
  },
  deepseek: {
    id: "deepseek",
    engineType: "deepseek-api",
    connectionType: "api_key",
    name: "DeepSeek",
    shortName: "DeepSeek",
    description:
      "Use sua API key do DeepSeek para acesso direto ao modelo.",
    flatRate: "Pagamento por uso via API key. Preços competitivos.",
    connectedLabel: "DeepSeek API",
    accentColor: "rose",
    modelConfig: { provider: "deepseek", model: "deepseek-chat" },
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  nvidia: {
    id: "nvidia",
    engineType: "nvidia-api",
    connectionType: "api_key",
    name: "Nemotron (NVIDIA)",
    shortName: "Nemotron",
    description:
      "Use sua API key da NVIDIA para acessar o modelo Nemotron.",
    flatRate: "Acesso via NVIDIA API Catalog. Créditos gratuitos disponíveis.",
    connectedLabel: "NVIDIA API",
    accentColor: "cyan",
    modelConfig: { provider: "nvidia", model: "nvidia/llama-3.3-nemotron-super-49b-v1" },
    apiKeyEnvVar: "NVIDIA_API_KEY",
  },
};

type SyncOverrides = Partial<EngineOAuthDraft> & {
  modelConfig?: { provider: string; model: string };
  api_key?: string;
};

export function Slide1CognitiveEngine() {
  const { draft, updateDraft } = useAgentDraft();
  const { toast, showToast } = useToast();

  const [engineProviders, setEngineProviders] = useState<OAuthProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(
    draft.engine_oauth.oauth_status === "connected"
      ? draft.engine_oauth.oauth_provider_id
      : null,
  );
  const [userLabel, setUserLabel] = useState(draft.engine_oauth.oauth_user_id);
  const [config, setConfig] = useState<OAuthModelConfig>(
    draft.engine_oauth.model_configs,
  );
  const [modalTarget, setModalTarget] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  // Real models available for the connected provider (from /api/model/options).
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const activeDef = activeProviderId ? ENGINE_DEFS[activeProviderId] : null;

  // Persist a model choice: update the draft + write to config.yaml so the
  // engine (gateway/CLI) picks it up.
  const handleModelChange = useCallback(
    (newModel: string) => {
      if (!activeDef) return;
      const provider = activeDef.modelConfig.provider;
      updateDraft({ model_config: { provider, model: newModel } });
      void api
        .setModelAssignment({ scope: "main", task: "", provider, model: newModel })
        .catch(() => {});
    },
    [activeDef, updateDraft],
  );

  // Whenever a provider becomes active (mount-restore, OAuth or API key),
  // load its real model catalog so the user picks from actual models.
  useEffect(() => {
    const slug =
      activeProviderId && ENGINE_DEFS[activeProviderId]
        ? ENGINE_DEFS[activeProviderId].modelConfig.provider
        : null;
    if (!slug) return;
    let cancelled = false;
    api
      .getModelOptions()
      .then((resp) => {
        if (cancelled) return;
        const match = (resp.providers || []).find((p) => p.slug === slug);
        setProviderModels(match?.models || []);
        if (resp.model && resp.provider && !draftRef.current.model_config.model) {
          updateDraft({ model_config: { provider: resp.provider, model: resp.model } });
        }
      })
      .catch(() => {
        if (!cancelled) setProviderModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProviderId]);

  const syncToContext = useCallback(
    ({ modelConfig, ...oauthOverrides }: SyncOverrides) => {
      updateDraft({
        ...(modelConfig ? { model_config: modelConfig } : {}),
        engine_oauth: {
          ...draft.engine_oauth,
          ...oauthOverrides,
        },
      });
    },
    [draft.engine_oauth, updateDraft],
  );

  useEffect(() => {
    let cancelled = false;

    const alreadyConnected =
      draft.engine_oauth.oauth_status === "connected" &&
      draft.engine_oauth.oauth_provider_id;

    api
      .getOAuthProviders()
      .then((resp) => {
        if (cancelled) return;
        setLoaded(true);
        const matched = resp.providers.filter((p) => ENGINE_DEFS[p.id]);
        setEngineProviders(matched);

        // On mount, restore a previously-connected provider into the UI state
        // (e.g. user navigated back to this slide) without auto-selecting.
        if (alreadyConnected) {
          const providerId = draft.engine_oauth.oauth_provider_id ?? "";
          setActiveProviderId(providerId);
          setUserLabel(draft.engine_oauth.oauth_user_id || "");
        } else {
          // Fresh wizard session (no draft state yet) — the draft check above
          // only reflects THIS wizard's own history. A provider can already
          // be authenticated on the backend (connected earlier via
          // /configuracoes, or in a previous wizard run) without the current
          // draft knowing about it. Surface that real connection here too,
          // instead of showing every provider as disconnected until the user
          // reconnects something they already linked.
          const live = matched.find((p) => p.status?.logged_in);
          const def = live ? ENGINE_DEFS[live.id] : null;
          if (live && def) {
            const label =
              live.status.source_label || live.status.token_preview || def.connectedLabel;
            setActiveProviderId(live.id);
            setUserLabel(label);
            syncToContext({
              modelConfig: def.modelConfig,
              engine_type: def.engineType,
              oauth_provider_id: live.id,
              oauth_status: "connected",
              oauth_user_id: label,
              model_configs: config,
            });
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoaded(true);
        setFetchError(String(err));
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount — intentional. Deps like config/syncToContext are not
    // included because re-running would overwrite user changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback((providerId: string) => {
    setModalTarget(providerId);
  }, []);

  const handleOAuthSuccess = useCallback(
    async (providerId: string) => {
      let def: EngineProviderDef | undefined;
      try {
        const resp = await api.getOAuthProviders();
        const found = resp.providers.find(
          (p) => p.id === providerId && p.status.logged_in,
        );
        def = ENGINE_DEFS[providerId];
        if (found && def) {
          const label =
            found.status.source_label ||
            found.status.token_preview ||
            def.connectedLabel;
          setActiveProviderId(providerId);
          setUserLabel(label);
          syncToContext({
            modelConfig: def.modelConfig,
            engine_type: def.engineType,
            oauth_provider_id: providerId,
            oauth_status: "connected",
            oauth_user_id: label,
            model_configs: config,
          });
        } else if (def) {
          setActiveProviderId(providerId);
          setUserLabel(def.connectedLabel);
          syncToContext({
            modelConfig: def.modelConfig,
            engine_type: def.engineType,
            oauth_provider_id: providerId,
            oauth_status: "connected",
            oauth_user_id: def.connectedLabel,
            model_configs: config,
          });
        }
      } catch {
        def = ENGINE_DEFS[providerId];
        if (def) {
          setActiveProviderId(providerId);
          setUserLabel(def.connectedLabel);
          syncToContext({
            modelConfig: def.modelConfig,
            engine_type: def.engineType,
            oauth_provider_id: providerId,
            oauth_status: "connected",
            oauth_user_id: def.connectedLabel,
            model_configs: config,
          });
        }
      }
      setModalTarget(null);
      // Validate the model, then persist it to config.yaml so the engine
      // (gateway/CLI) actually uses the model the wizard selected.
      if (def) {
        const connectedDef = def;
        // Persist regardless of validation, then warn if not responding.
        api
          .setModelAssignment({
            scope: "main",
            task: "",
            provider: connectedDef.modelConfig.provider,
            model: connectedDef.modelConfig.model,
          })
          .catch(() => {});
        api
          .validateModel(connectedDef.modelConfig)
          .then((v) => {
            if (!v.responds) {
              showToast(
                `Modelo "${connectedDef.modelConfig.model}" salvo, mas não respondeu: ${v.error || "provedor não alcançável"}`,
                "warning",
              );
            }
          })
          .catch(() => {});
      }
    },
    [config, syncToContext, showToast],
  );

  const handleOAuthError = useCallback(() => {
    setModalTarget(null);
  }, []);

  const handleApiKeyConnect = useCallback(
    (providerId: string, rawKey: string) => {
      const def = ENGINE_DEFS[providerId];
      if (!def) return;
      const key = rawKey.trim();
      setActiveProviderId(providerId);
      setUserLabel(def.connectedLabel);
      syncToContext({
        modelConfig: def.modelConfig,
        engine_type: def.engineType,
        oauth_provider_id: providerId,
        oauth_status: "connected",
        oauth_user_id: def.connectedLabel,
        api_key: key,
        model_configs: config,
      });
      // The key must be persisted as an env var before validate/set-model —
      // otherwise the backend has no credential to test with and every
      // connection attempt fails with 401, regardless of key validity.
      const persistKey = def.apiKeyEnvVar
        ? api.setEnvVar(def.apiKeyEnvVar, key)
        : Promise.resolve();
      persistKey
        .catch(() => {})
        .then(() => {
          // Persist the model to config.yaml regardless of the validation result,
          // then warn if it isn't responding. Blocking on validation would trap the
          // user when the provider is momentarily down.
          api
            .setModelAssignment({
              scope: "main",
              task: "",
              provider: def.modelConfig.provider,
              model: def.modelConfig.model,
            })
            .catch(() => {});
          api
            .validateModel({ ...def.modelConfig, api_key: key })
            .then((v) => {
              if (v.responds) {
                showToast(`${def.shortName} conectado (${v.response_time_ms}ms).`, "success");
              } else {
                showToast(
                  `${def.shortName} salvo, mas o modelo não respondeu: ${v.error || "provedor não alcançável"}`,
                  "warning",
                );
              }
            })
            .catch(() => showToast(`${def.shortName} conectado.`, "success"));
        });
    },
    [config, syncToContext, showToast],
  );

  const handleDisconnect = useCallback(async () => {
    if (!activeProviderId) return;
    const def = ENGINE_DEFS[activeProviderId];
    if (def?.connectionType === "oauth") {
      try {
        await api.disconnectOAuthProvider(activeProviderId);
      } catch {
        // ignore backend error — proceed with local state
      }
    }
    setActiveProviderId(null);
    setUserLabel("");
    setApiKeys((prev) => ({ ...prev, [activeProviderId]: "" }));
    syncToContext({
      modelConfig: undefined,
      engine_type: null,
      oauth_provider_id: "",
      oauth_status: "disconnected",
      oauth_user_id: "",
      api_key: "",
      model_configs: config,
    });
    showToast("Conta desconectada.", "success");
  }, [activeProviderId, config, syncToContext, showToast]);

  const updateConfig = useCallback(
    (patch: Partial<OAuthModelConfig>) => {
      const next = { ...config, ...patch };
      setConfig(next);
      syncToContext({ model_configs: next });
    },
    [config, syncToContext],
  );

  // Persist temperature/top_p/max_tokens to config.yaml so they survive page
  // reloads and actually reach the running agent — sliders were previously
  // draft-only and silently dropped. Debounced since sliders fire on every
  // drag tick.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeDef) return;
    const provider = draft.model_config.provider || activeDef.modelConfig.provider;
    const model = draft.model_config.model || activeDef.modelConfig.model;
    if (!provider || !model) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void api
        .setModelAssignment({
          scope: "main",
          task: "",
          provider,
          model,
          temperature: config.temperature,
          top_p: config.top_p,
          max_tokens: config.max_tokens,
        })
        .catch(() => {});
    }, 600);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [config, activeDef, draft.model_config.provider, draft.model_config.model]);

  const isConnected = activeProviderId !== null;
  const isLoading = !loaded && !fetchError;

  const modalProvider = useMemo(() => {
    if (!modalTarget) return null;
    return engineProviders.find((p) => p.id === modalTarget) ?? null;
  }, [modalTarget, engineProviders]);

  const hasMultiple = engineProviders.length > 1;

  const apiKeyProviderIds = useMemo(
    () =>
      Object.values(ENGINE_DEFS)
        .filter((d) => d.connectionType === "api_key")
        .map((d) => d.id),
    [],
  );

  const hasApiKeyProviders = apiKeyProviderIds.length > 0;

  const providerLogo = useCallback(
    (providerId: string, className?: string) => {
      switch (providerId) {
        case "anthropic":
          return <ClaudeLogo className={className} />;
        case "google-gemini-cli":
          return <GoogleLogo className={className} />;
        case "xai-oauth":
          return <XaiLogo className={className} />;
        case "deepseek":
          return <DeepSeekLogo className={className} />;
        case "nvidia":
          return <NvidiaLogo className={className} />;
        default:
          return <OpenAiLogo className={className} />;
      }
    },
    [],
  );

  const accentBorder = useCallback((accentColor: string) => {
    switch (accentColor) {
      case "orange":
        return "border-orange-500/40 bg-orange-500/5";
      case "blue":
        return "border-blue-500/40 bg-blue-500/5";
      case "violet":
        return "border-violet-500/40 bg-violet-500/5";
      case "rose":
        return "border-rose-500/40 bg-rose-500/5";
      case "cyan":
        return "border-cyan-500/40 bg-cyan-500/5";
      default:
        return "border-emerald-500/40 bg-emerald-500/5";
    }
  }, []);

  const accentBackground = useCallback((accentColor: string) => {
    switch (accentColor) {
      case "orange":
        return "bg-orange-500/15 text-orange-500";
      case "blue":
        return "bg-blue-500/15 text-blue-500";
      case "violet":
        return "bg-violet-500/15 text-violet-500";
      case "rose":
        return "bg-rose-500/15 text-rose-500";
      case "cyan":
        return "bg-cyan-500/15 text-cyan-500";
      default:
        return "bg-emerald-500/15 text-emerald-500";
    }
  }, []);

  const accentIcon = useCallback((accentColor: string) => {
    switch (accentColor) {
      case "orange":
        return "text-orange-500";
      case "blue":
        return "text-blue-500";
      case "violet":
        return "text-violet-500";
      case "rose":
        return "text-rose-500";
      case "cyan":
        return "text-cyan-500";
      default:
        return "text-emerald-500";
    }
  }, []);

  const accentText = useCallback((accentColor: string) => {
    switch (accentColor) {
      case "orange":
        return "text-orange-600/80 dark:text-orange-400/80";
      case "blue":
        return "text-blue-600/80 dark:text-blue-400/80";
      case "violet":
        return "text-violet-600/80 dark:text-violet-400/80";
      case "rose":
        return "text-rose-600/80 dark:text-rose-400/80";
      case "cyan":
        return "text-cyan-600/80 dark:text-cyan-400/80";
      default:
        return "text-emerald-600/80 dark:text-emerald-400/80";
    }
  }, []);

  const renderProviderCard = useCallback(
    (def: EngineProviderDef, providerKey: string) => {
      const isActive = activeProviderId === providerKey;

      return (
        <motion.div
          key={providerKey}
          layout
          transition={{ duration: 0.35, ease: EASE }}
          className={cn(
            "relative overflow-hidden rounded-2xl border transition-colors duration-300",
            isActive
              ? accentBorder(def.accentColor)
              : "border-border/60 bg-card/80",
          )}
        >
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                isActive
                  ? accentBackground(def.accentColor)
                  : "bg-primary/10 text-primary",
              )}
            >
              {providerLogo(providerKey, "h-7 w-7")}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-text-primary">
                    {def.name}
                  </span>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <Badge tone="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  {def.flatRate}
                  {isActive && (
                    <span className={cn("block", accentText(def.accentColor))}>
                      Conectado como{" "}
                      <span className="font-medium">{userLabel}</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isLoading && (
                  <Button disabled className="gap-2 px-6 py-2.5 text-sm">
                    <Spinner className="h-4 w-4" />
                    Carregando...
                  </Button>
                )}

                {!isLoading && !isActive && def.connectionType === "oauth" && (
                  <Button
                    size="md"
                    className="gap-2 px-6 py-2.5 text-sm"
                    onClick={() => handleConnect(providerKey)}
                    prefix={<Plug className="h-4 w-4" />}
                    suffix={<ChevronRight className="h-4 w-4" />}
                  >
                    Conectar {def.shortName}
                  </Button>
                )}

                {!isLoading && !isActive && def.connectionType === "api_key" && (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type={showKey[providerKey] ? "text" : "password"}
                        value={apiKeys[providerKey] ?? ""}
                        onChange={(e) =>
                          setApiKeys((prev) => ({
                            ...prev,
                            [providerKey]: e.target.value,
                          }))
                        }
                        placeholder="sk-..."
                        className={cn(
                          "w-full rounded-lg border bg-card px-3 py-2 pr-16 text-sm outline-none transition-colors placeholder:text-text-tertiary/50",
                          "border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey((prev) => ({
                            ...prev,
                            [providerKey]: !prev[providerKey],
                          }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary transition-colors hover:text-text-primary"
                      >
                        {showKey[providerKey] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      size="md"
                      className="gap-2 whitespace-nowrap text-sm"
                      onClick={() =>
                        handleApiKeyConnect(
                          providerKey,
                          apiKeys[providerKey] ?? "",
                        )
                      }
                      disabled={!apiKeys[providerKey]}
                      prefix={<KeyRound className="h-4 w-4" />}
                    >
                      Conectar
                    </Button>
                  </div>
                )}

                {isActive && (
                  <Button
                    outlined
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleDisconnect}
                    prefix={<LogOut className="h-3.5 w-3.5" />}
                  >
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden shrink-0 self-center sm:block">
              <Zap
                className={cn(
                  "h-8 w-8 transition-colors duration-300",
                  isActive ? accentIcon(def.accentColor) : "text-text-tertiary/40",
                )}
              />
            </div>
          </div>
        </motion.div>
      );
    },
    [
      activeProviderId,
      accentBorder,
      accentBackground,
      accentIcon,
      accentText,
      providerLogo,
      isLoading,
      handleConnect,
      handleApiKeyConnect,
      handleDisconnect,
      userLabel,
      apiKeys,
      showKey,
    ],
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-text-primary">
          Escolha o Cérebro do seu Funcionário
        </h3>
        <p className="text-sm text-text-secondary">
          Conecte o provedor de IA que vai servir como cérebro do funcionário agêntico.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          hasMultiple ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {engineProviders.map((p) => {
          const def = ENGINE_DEFS[p.id];
          if (!def) return null;
          return renderProviderCard(def, p.id);
        })}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-5 w-5 text-text-tertiary" />
        </div>
      )}

      {fetchError && (
        <p className="text-xs text-destructive">
          Erro ao carregar provedores: {fetchError}
        </p>
      )}

      {hasApiKeyProviders && loaded && (
        <>
          <div className="relative flex items-center gap-3 py-1">
            <span className="flex-1 border-t border-border/40" />
            <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Ou conecte via API Key
            </span>
            <span className="flex-1 border-t border-border/40" />
          </div>

          <div
            className={cn(
              "grid gap-4",
              hasApiKeyProviders
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {apiKeyProviderIds.map((id) => {
              const def = ENGINE_DEFS[id];
              if (!def) return null;
              return renderProviderCard(def, id);
            })}
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {loaded && (
          <motion.div
            key="config-panel"
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/60 bg-card/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-text-tertiary" />
                <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Configuração do Modelo
                  {activeDef ? ` (${activeDef.shortName})` : ""}
                </span>
              </div>

              <Separator className="mb-5" />

              {activeDef && providerModels.length > 0 && (
                <div className="mb-5 flex flex-col gap-1.5">
                  <Label className="text-text-secondary">Modelo</Label>
                  <select
                    value={draft.model_config.model || ""}
                    onChange={(e) => {
                      if (e.target.value) handleModelChange(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="" disabled>
                      Selecione um modelo
                    </option>
                    {providerModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-text-tertiary">
                    Modelos disponíveis no provedor conectado.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-5">
                <SliderField
                  label="Criatividade"
                  value={config.temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  formatDisplay={(v) => v.toFixed(2)}
                  onChange={(v) => updateConfig({ temperature: v })}
                />

                <SliderField
                  label="Raciocínio"
                  value={config.top_p}
                  min={0}
                  max={1}
                  step={0.05}
                  formatDisplay={(v) => v.toFixed(2)}
                  onChange={(v) => updateConfig({ top_p: v })}
                />

                <SliderField
                  label="Max Tokens"
                  value={config.max_tokens}
                  min={256}
                  max={8192}
                  step={256}
                  formatDisplay={(v) => String(v)}
                  onChange={(v) => updateConfig({ max_tokens: v })}
                />
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
                <BrainCircuit className="h-3 w-3" />
                <span>
                  {activeDef
                    ? `O modelo ${draft.model_config.model || activeDef.modelConfig.model} será usado em todas as conversas deste agente.`
                    : "Conecte um provedor para definir o modelo."}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isConnected && loaded && !fetchError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-text-tertiary"
          >
            <ChevronRight className="h-3 w-3" />
            Conecte um provedor para liberar as configurações e avançar no
            wizard.
          </motion.p>
        )}
      </AnimatePresence>

      {modalTarget && modalProvider && (
        <OAuthLoginModal
          provider={modalProvider}
          onClose={() => setModalTarget(null)}
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
