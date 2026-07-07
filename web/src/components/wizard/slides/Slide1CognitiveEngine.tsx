import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
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

export function slide1IsValid(draft: AgentDraft): boolean {
  return draft.engine_oauth.oauth_status === "connected";
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

const OPENAI_PROVIDER_ID = "openai-codex";

export function Slide1CognitiveEngine() {
  const { draft, updateDraft } = useAgentDraft();
  const { toast, showToast } = useToast();

  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected"
  >(draft.engine_oauth.oauth_status);
  const [userLabel, setUserLabel] = useState(draft.engine_oauth.oauth_user_id);
  const [config, setConfig] = useState<OAuthModelConfig>(
    draft.engine_oauth.model_configs,
  );
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [openaiProvider, setOpenaiProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [providerLoaded, setProviderLoaded] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getOAuthProviders()
      .then((resp) => {
        if (cancelled) return;
        setProviderLoaded(true);
        const found = resp.providers.find(
          (p) => p.id === OPENAI_PROVIDER_ID,
        );
        if (!found) {
          setProviderError("Provider openai-codex not found");
          return;
        }
        setOpenaiProvider(found);

        if (found.status.logged_in) {
          setConnectionState("connected");
          const label =
            found.status.source_label ||
              found.status.token_preview ||
              "ChatGPT Plus";
          setUserLabel(label);
          syncToContext({
            engine_type: "gpt-plus-oauth",
            oauth_status: "connected",
            oauth_user_id: label,
            model_configs: config,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setProviderLoaded(true);
        setProviderError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncToContext = useCallback(
    (overrides: Partial<EngineOAuthDraft>) => {
      updateDraft({
        model_config: {
          provider: "openai-codex",
          model: "gpt-5.5",
        },
        engine_oauth: {
          ...draft.engine_oauth,
          ...overrides,
        },
      });
    },
    [draft.engine_oauth, updateDraft],
  );

  const handleConnect = useCallback(() => {
    setShowOAuthModal(true);
  }, []);

  const handleOAuthSuccess = useCallback(
    async (_msg: string) => {
      setConnectionState("connected");

      try {
        const resp = await api.getOAuthProviders();
        const found = resp.providers.find(
          (p) => p.id === OPENAI_PROVIDER_ID,
        );
        if (found) {
          setOpenaiProvider(found);
          const label =
            found.status.source_label ||
            found.status.token_preview ||
            "ChatGPT Plus";
          setUserLabel(label);

          syncToContext({
            engine_type: "gpt-plus-oauth",
            oauth_status: "connected",
            oauth_user_id: label,
            model_configs: config,
          });
        }
      } catch {
        setUserLabel("ChatGPT Plus");
        syncToContext({
          engine_type: "gpt-plus-oauth",
          oauth_status: "connected",
          oauth_user_id: "ChatGPT Plus",
          model_configs: config,
        });
      }

      setShowOAuthModal(false);
    },
    [config, syncToContext],
  );

  const handleOAuthError = useCallback(
    (_msg: string) => {
      setConnectionState("disconnected");
    },
    [],
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await api.disconnectOAuthProvider(OPENAI_PROVIDER_ID);
    } catch {
      // ignore backend error — proceed with local state
    }
    setConnectionState("disconnected");
    setUserLabel("");
    syncToContext({
      engine_type: null,
      oauth_status: "disconnected",
      oauth_user_id: "",
      model_configs: config,
    });
    showToast("Conta desconectada.", "success");
  }, [config, syncToContext, showToast]);

  const updateConfig = useCallback(
    (patch: Partial<OAuthModelConfig>) => {
      const next = { ...config, ...patch };
      setConfig(next);
      syncToContext({ model_configs: next });
    },
    [config, syncToContext],
  );

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";
  const isReady = providerLoaded && !providerError;
  const showConnectButton = !isConnected && isReady;
  const showDisabledButton = !isConnected && !isReady;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-text-primary">
          Escolha o Cérebro do seu Agente
        </h3>
        <p className="text-sm text-text-secondary">
          Conecte sua conta ChatGPT Plus / Pro para usar o modelo como motor
          cognitivo do agente — sem se preocupar com consumo de tokens.
        </p>
      </div>

      <motion.div
        layout
        transition={{ duration: 0.35, ease: EASE }}
        className={cn(
          "relative overflow-hidden rounded-2xl border transition-colors duration-300",
          isConnected
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border/60 bg-card/80",
        )}
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-5">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
              isConnected
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-primary/10 text-primary",
            )}
          >
            <OpenAiLogo className="h-7 w-7" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-text-primary">
                  ChatGPT Plus / Pro
                </span>
                {isConnected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Badge tone="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conectado
                    </Badge>
                  </motion.div>
                )}
              </div>
              <p className="text-xs leading-relaxed text-text-tertiary">
                Acesso flat-rate via assinatura. Sem custos por requisição.
                {isConnected && (
                  <span className="block text-emerald-600/80 dark:text-emerald-400/80">
                    Conectado como{" "}
                    <span className="font-medium">{userLabel}</span>
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isConnecting && (
                <Button disabled>
                  <Spinner className="text-current" />
                  Conectando...
                </Button>
              )}

              {showDisabledButton && (
                <Button disabled className="gap-2 px-6 py-2.5 text-sm">
                  <Spinner className="h-4 w-4" />
                  Carregando...
                </Button>
              )}

              {showConnectButton && (
                <Button
                  size="md"
                  className="gap-2 px-6 py-2.5 text-sm"
                  onClick={handleConnect}
                  prefix={<Plug className="h-4 w-4" />}
                  suffix={<ChevronRight className="h-4 w-4" />}
                >
                  Conectar conta ChatGPT Plus
                </Button>
              )}

              {isConnected && (
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
                isConnected
                  ? "text-emerald-500"
                  : "text-text-tertiary/40",
              )}
            />
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isConnected && (
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
                  Configuração do Modelo (Browser)
                </span>
              </div>

              <Separator className="mb-5" />

              <div className="flex flex-col gap-5">
                <SliderField
                  label="Temperatura"
                  value={config.temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  formatDisplay={(v) => v.toFixed(2)}
                  onChange={(v) => updateConfig({ temperature: v })}
                />

                <SliderField
                  label="Top-P"
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
                  O modelo será usado em todas as conversas deste agente.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isConnected && isReady && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-text-tertiary"
          >
            <ChevronRight className="h-3 w-3" />
            Conecte sua conta ChatGPT Plus para liberar as configurações e
            avançar no wizard.
          </motion.p>
        )}
      </AnimatePresence>

      {showOAuthModal && openaiProvider && (
        <OAuthLoginModal
          provider={openaiProvider}
          onClose={() => {
            setShowOAuthModal(false);
            setConnectionState("disconnected");
          }}
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
