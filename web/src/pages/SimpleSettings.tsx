import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bot, Palette, Settings as SettingsIcon, Sparkles, Wrench } from "lucide-react";
import { Select, SelectOption } from "@dheiver2/ui/ui/components/select";
import { Checkbox } from "@dheiver2/ui/ui/components/checkbox";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { OAuthProvidersCard } from "@/components/OAuthProvidersCard";
import { api, type ChatModelsResponse, type ModelInfoResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Configurações simplificadas (modo Simples) — rota /configuracoes.
 * Essencial + comportamento. Dev-only fica no /config.
 */
export default function SimpleSettings() {
  const [models, setModels] = useState<ChatModelsResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      api.getChatModels(),
      api.getModelInfo(),
      api.getConfig(),
    ]).then(([m, info, cfg]) => {
      if (cancelled) return;
      if (m.status === "fulfilled") {
        setModels(m.value);
        setSelected(m.value.current);
      }
      if (info.status === "fulfilled") setModelInfo(info.value);
      if (cfg.status === "fulfilled") setConfig(cfg.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    if (!models) return [];
    return models.models.map((m) => ({
      value: `${m.provider}::${m.model}`,
      label: `${m.model} (${m.provider})`,
    }));
  }, [models]);

  const applyModel = async (value: string) => {
    setSelected(value);
    const [provider, model] = value.split("::");
    if (!provider || !model) return;
    setSaving(true);
    setNotice(null);
    try {
      await api.setModelAssignment({ scope: "main", task: "", provider, model });
      setNotice({ kind: "ok", text: "Modelo atualizado." });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Falha ao salvar o modelo.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleConfig = async (key: string, value: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setConfigSaving(true);
    try {
      await api.saveConfig({ [key]: value });
      setNotice({ kind: "ok", text: "Salvo." });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Falha ao salvar.",
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const toolProgress = Boolean(config.tool_progress);
  const suggestQuestions = Boolean(config.suggest_questions);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midground/10">
          <SettingsIcon className="h-5 w-5 text-midground" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-midground">Configurações</h1>
          <p className="text-sm text-text-tertiary">
            Personalize a experiência. Tudo salva automaticamente.
          </p>
        </div>
      </header>

      {/* Aparência */}
      <Section icon={Palette} title="Aparência" description="Como você vê a interface">
        <SettingRow
          label="Idioma"
          hint="Escolha seu idioma preferido"
        >
          <LanguageSwitcher />
        </SettingRow>
        <SettingRow
          label="Tema"
          hint="Claro, escuro ou automático"
        >
          <ThemeSwitcher />
        </SettingRow>
      </Section>

      {/* Modelo de IA */}
      <Section icon={Bot} title="Inteligência Artificial" description="Escolha qual IA usar">
        <SettingRow
          label="Qual modelo usar?"
          hint="Modelos diferentes têm características e custos variados"
        >
          <div className="w-full max-w-xs">
            <Select
              value={selected}
              onValueChange={(v) => void applyModel(v)}
              disabled={saving || options.length === 0}
              aria-label="Modelo do agente"
            >
              {options.length === 0 && (
                <SelectOption value="">Carregando modelos…</SelectOption>
              )}
              {options.map((o) => (
                <SelectOption key={o.value} value={o.value}>
                  {o.label}
                </SelectOption>
              ))}
            </Select>
          </div>
        </SettingRow>

        {modelInfo?.provider && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Conectado via <strong>{modelInfo.provider}</strong>
              </p>
              <p className="mt-0.5 text-xs text-emerald-600/75 dark:text-emerald-400/75">
                Usando modelo: {modelInfo.model}
              </p>
            </div>
          </div>
        )}

        <OAuthProvidersCard
          onError={(msg) => setNotice({ kind: "error", text: msg })}
          onSuccess={(msg) => setNotice({ kind: "ok", text: msg })}
        />
      </Section>

      {/* Comportamento */}
      <Section
        icon={Wrench}
        title="Comportamento"
        description="Como o agente interage com você"
      >
        <ToggleSetting
          label="Mostrar ferramentas usadas"
          hint="Veja quais ferramentas o agente usou em cada resposta"
          checked={toolProgress}
          onChange={() => void toggleConfig("tool_progress", !toolProgress)}
          disabled={configSaving}
        />
        <ToggleSetting
          label="Sugerir perguntas"
          hint="Receba sugestões de perguntas para continuar a conversa"
          checked={suggestQuestions}
          onChange={() => void toggleConfig("suggest_questions", !suggestQuestions)}
          disabled={configSaving}
        />
      </Section>

      {/* Notificações */}
      {notice && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            notice.kind === "ok"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {notice.kind === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-start gap-2 rounded-lg border border-current/10 px-4 py-3 text-sm text-text-tertiary">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Procurando chaves de API, variáveis de ambiente ou log do sistema? Essas
          ficam no <strong>modo avançado</strong> — troque para o perfil{" "}
          <strong>Dev</strong> no menu lateral.
        </span>
      </footer>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Palette;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-current/15 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-midground">
          <Icon className="h-5 w-5" />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-text-tertiary">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-text-secondary">{label}</label>
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function ToggleSetting({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-current/5 px-4 py-3 hover:bg-current/[0.02]">
      <div className="flex-1">
        <label className="block text-sm font-medium text-text-secondary cursor-pointer">
          {label}
        </label>
        {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
      </div>
      <Checkbox checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
