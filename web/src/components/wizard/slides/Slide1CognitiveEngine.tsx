import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function OpenAiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5094-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 6.7101 5.9847 5.9847 0 0 0 .5157 4.9108 6.0462 6.0462 0 0 0 6.5094 2.9 6.0651 6.0651 0 0 0 10.7903-1.8937 5.9847 5.9847 0 0 0 3.9977-2.9 6.0462 6.0462 0 0 0-.7427-6.7101zm-2.534 6.5134a4.0348 4.0348 0 0 1-2.6935 1.9551 4.0552 4.0552 0 0 1-3.2294-.6953 4.0486 4.0486 0 0 1-1.1808-2.1195 4.04 4.04 0 0 1 1.3565-3.8441 4.0468 4.0468 0 0 1 3.561-1.0064l.0015.0003a4.0468 4.0468 0 0 1 3.185 5.7109zm-9.9536 3.8435a4.0552 4.0552 0 0 1-2.6935-1.9551 4.0486 4.0486 0 0 1 1.1808-2.1195 4.04 4.04 0 0 1 3.561-1.0064 4.0468 4.0468 0 0 1 3.185 5.7109 4.0348 4.0348 0 0 1-2.6935 1.9551 4.0552 4.0552 0 0 1-3.2294-.6953l-.3107.1108zm-1.9531-8.6864a4.0468 4.0468 0 0 1-3.185-5.7109 4.0348 4.0348 0 0 1 2.6935-1.9551 4.0552 4.0552 0 0 1 3.2294.6953 4.0486 4.0486 0 0 1 1.1808 2.1195 4.04 4.04 0 0 1-1.3565 3.8441 4.0468 4.0468 0 0 1-3.561 1.0064z"
        fill="currentColor"
      />
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
        d="M12 2C8.134 2 5 5.134 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.866-3.134-7-7-7zM9 21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1z"
        fill="currentColor"
      />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" opacity="0.5" />
      <path
        d="M12 13c-1.5 0-2.5-.8-3-2h6c-.5 1.2-1.5 2-3 2z"
        fill="currentColor"
        opacity="0.3"
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
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.5"/>
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.5"/>
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
    modelConfig: { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct" },
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
    (providerId: string, key: string) => {
      const def = ENGINE_DEFS[providerId];
      if (!def) return;
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
        .validateModel(def.modelConfig)
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
