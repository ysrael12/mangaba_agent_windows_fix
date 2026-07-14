import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  Folder,
  KeyRound,
  Loader2,
  Plug,
  Radio,
  RefreshCw,
  RotateCcw,
  Palette,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  UploadCloud,
  Wrench,
  XCircle,
} from "lucide-react";
import { Select, SelectOption } from "@dheiver2/ui/ui/components/select";
import { Checkbox } from "@dheiver2/ui/ui/components/checkbox";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { OAuthProvidersCard } from "@/components/OAuthProvidersCard";
import { SetupResetDialog } from "@/components/SetupResetDialog";
import {
  api,
  type ChatModelsResponse,
  type McpServerInfo,
  type ModelInfoResponse,
  type RagFileInfo,
  type ToolsetInfo,
} from "@/lib/api";
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

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
      const validation = await api.validateModel({ provider, model });
      // Save regardless of the validation result. A provider that's momentarily
      // down (Ollama not started, model not pulled yet) must NOT block changing
      // the config — otherwise the user is stuck unable to switch away from a
      // broken model. Warn instead of blocking.
      await api.setModelAssignment({ scope: "main", task: "", provider, model });
      // Refetch so the "✓ Conectado via / Usando modelo" banner reflects the
      // new provider/model right away instead of the stale mount-time value.
      api.getModelInfo().then(setModelInfo).catch(() => {});
      if (validation.responds) {
        setNotice({ kind: "ok", text: `Modelo atualizado (${validation.response_time_ms}ms).` });
      } else {
        setNotice({
          kind: "error",
          text: validation.error
            ? `Modelo salvo, mas não respondeu no teste: ${validation.error}`
            : `Modelo salvo, mas não está respondendo agora (o provedor pode estar offline).`,
        });
      }
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

  // Rola até a seção referenciada pelo hash da URL (ex.: /configuracoes#rag),
  // usado pelos links da sidebar/dashboard que apontam para uma dimensão
  // específica do agente.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      <Section id="modelo" icon={Bot} title="Inteligência Artificial" description="Escolha qual IA usar">
        <SettingRow
          label="Qual modelo usar?"
          hint="Modelos diferentes têm características e custos variados"
        >
          <div className="w-full max-w-xs">
            <Select
              value={selected}
              onValueChange={(v) => void applyModel(v)}
              disabled={saving || options.length === 0}
              aria-label="Modelo do funcionário agêntico"
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

      {/* Ferramentas & Skills */}
      <Section
        id="ferramentas"
        icon={Wrench}
        title="Ferramentas & Skills"
        description="O que o agente pode fazer além de conversar"
      >
        <ToolsSummarySection />
      </Section>

      {/* Base de conhecimento (RAG) */}
      <Section
        id="rag"
        icon={Folder}
        title="Base de Conhecimento (RAG)"
        description="Documentos que o agente consulta para responder"
      >
        <RagFilesSection />
      </Section>

      {/* Conexões MCP */}
      <Section
        id="mcp"
        icon={Plug}
        title="Conexões MCP"
        description="Servidores MCP externos conectados ao funcionário agêntico"
      >
        <McpServersSection />
      </Section>

      {/* Canais */}
      <Section
        id="canais"
        icon={Radio}
        title="Canais"
        description="Onde o agente está disponível para conversar"
      >
        <ChannelsSummarySection />
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

      {/* Reset Section */}
      <Section icon={RotateCcw} title="Reiniciar" description="Limpe o setup se quiser começar do zero">
        <p className="text-sm text-text-secondary mb-4">
          Limpe o checklist de primeiros passos, dicas e/ou o agente em criação para
          recomeçar do zero.
        </p>
        <Button
          outlined
          onClick={() => setResetDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar Setup
        </Button>
      </Section>

      {/* Footer */}
      <footer className="flex items-start gap-2 rounded-lg border border-current/10 px-4 py-3 text-sm text-text-tertiary">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Procurando chaves de API, variáveis de ambiente ou log do sistema? Essas
          ficam no <strong>modo avançado</strong> — troque para o perfil{" "}
          <strong>Dev</strong> no menu lateral.
        </span>
      </footer>

      <SetupResetDialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} />
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id?: string;
  icon: typeof Palette;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-4 rounded-2xl border border-current/15 p-6 scroll-mt-6">
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

function ToolsSummarySection() {
  const navigate = useNavigate();
  const [skillsCount, setSkillsCount] = useState<{ enabled: number; total: number } | null>(null);
  const [toolsets, setToolsets] = useState<ToolsetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([api.getSkills(), api.getToolsets()]).then(([skills, tsets]) => {
      setSkillsCount({ enabled: skills.filter((s) => s.enabled).length, total: skills.length });
      setToolsets(tsets);
    });

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = async (preset: "all" | "minimal") => {
    setApplyingPreset(true);
    setError(null);
    try {
      await api.setToolsetsPreset(preset);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingPreset(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
  }

  const enabledToolsets = toolsets.filter((t) => t.enabled).length;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={applyingPreset} onClick={() => applyPreset("minimal")}>
          {applyingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Setup mínimo"}
        </Button>
        <Button variant="outline" size="sm" disabled={applyingPreset} onClick={() => applyPreset("all")}>
          {applyingPreset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ativar tudo"}
        </Button>
      </div>
      <SettingRow label={`${enabledToolsets} de ${toolsets.length} ferramentas ativas`}>
        <Button outlined size="sm" onClick={() => navigate("/skills")}>
          Gerenciar ferramentas
        </Button>
      </SettingRow>
      {skillsCount && (
        <SettingRow label={`${skillsCount.enabled} de ${skillsCount.total} habilidades ativas`}>
          <Button outlined size="sm" onClick={() => navigate("/skills")}>
            Gerenciar habilidades
          </Button>
        </SettingRow>
      )}
    </div>
  );
}

const RAG_ACCEPTED_EXT = [".txt", ".md", ".pdf"];

function RagFilesSection() {
  const [files, setFiles] = useState<RagFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    Promise.all([api.getRagFiles(), api.getRagStatus()]).then(([f, status]) => {
      setFiles(f.files);
      setEnabled(status.enabled);
    });

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const uploadFiles = async (fileList: FileList) => {
    setError(null);
    const list = Array.from(fileList);
    const invalid = list.find(
      (f) => !RAG_ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    if (invalid) {
      setError(`Formato não suportado: ${invalid.name} (use .txt, .md ou .pdf).`);
      return;
    }
    setUploading(true);
    try {
      for (const file of list) {
        await api.uploadRagFile(file);
      }
      const next = await api.getRagFiles();
      setFiles(next.files);
      if (next.files.length > 0) {
        await api.enableRag(true);
        setEnabled(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (name: string) => {
    setError(null);
    try {
      await api.deleteRagFile(name);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    setTogglingEnabled(true);
    setError(null);
    try {
      await api.enableRag(next);
      setEnabled(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingEnabled(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ToggleSetting
        label="Usar base de conhecimento nas conversas"
        hint={
          files.length === 0
            ? "Envie ao menos um documento para poder ativar."
            : enabled
              ? "Ativo — os documentos abaixo são consultados a cada conversa."
              : "Desativado — os documentos abaixo ficam indexados, mas não são usados."
        }
        checked={enabled}
        onChange={() => void toggleEnabled()}
        disabled={togglingEnabled || files.length === 0}
      />
      <div className="flex flex-col gap-2">
        {files.length === 0 ? (
          <p className="text-sm italic text-text-tertiary">Nenhum documento indexado ainda.</p>
        ) : (
          files.map((f) => (
            <div key={f.name} className="flex items-center gap-3 rounded-xl border border-current/10 px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate text-sm text-text-primary">{f.name}</span>
              <span className="shrink-0 text-xs text-text-tertiary">{f.chunks} trechos</span>
              <Button ghost size="icon" onClick={() => removeFile(f.name)} aria-label={`Remover ${f.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <Button
        outlined
        size="sm"
        className="w-fit"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
        Adicionar documento
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.md,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function McpServersSection() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testState, setTestState] = useState<
    Record<string, { status: "idle" | "testing" | "ok" | "error"; message?: string }>
  >({});
  const [reloading, setReloading] = useState(false);
  const [reloadNotice, setReloadNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const refresh = () => api.listMcpServers().then((r) => setServers(r.servers));

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const addServer = async () => {
    setError(null);
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await api.addMcpServer({
        name: name.trim(),
        url: url.trim(),
        api_key: apiKey.trim() || undefined,
      });
      setName("");
      setUrl("");
      setApiKey("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const removeServer = async (serverName: string) => {
    setError(null);
    try {
      await api.deleteMcpServer(serverName);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const reloadMcp = async () => {
    setReloading(true);
    setReloadNotice(null);
    try {
      await api.reloadMcpServers();
      setReloadNotice({ kind: "ok", text: "Agente recarregado — servidores MCP reconectados." });
    } catch (e) {
      setReloadNotice({
        kind: "error",
        text: e instanceof Error ? e.message : "Falha ao recarregar o agente.",
      });
    } finally {
      setReloading(false);
    }
  };

  const testServer = async (serverName: string) => {
    setTestState((prev) => ({ ...prev, [serverName]: { status: "testing" } }));
    try {
      const r = await api.testMcpServer(serverName);
      if (r.ok) {
        const n = r.tools?.length ?? 0;
        setTestState((prev) => ({
          ...prev,
          [serverName]: { status: "ok", message: `${n} ferramenta${n === 1 ? "" : "s"} encontrada${n === 1 ? "" : "s"}` },
        }));
      } else {
        setTestState((prev) => ({ ...prev, [serverName]: { status: "error", message: r.error } }));
      }
    } catch (e) {
      setTestState((prev) => ({
        ...prev,
        [serverName]: { status: "error", message: e instanceof Error ? e.message : String(e) },
      }));
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 rounded-xl border border-current/10 p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="settings-mcp-name">Nome</Label>
          <Input id="settings-mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: minha-planilha" />
        </div>
        <div className="grid flex-[2] gap-1.5">
          <Label htmlFor="settings-mcp-url">URL do servidor MCP</Label>
          <Input
            id="settings-mcp-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/mcp"
          />
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="settings-mcp-key">API Key (opcional)</Label>
          <Input
            id="settings-mcp-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Ex.: context7, servidores com Bearer token"
          />
        </div>
        <Button size="sm" onClick={() => void addServer()} disabled={adding || !name.trim() || !url.trim()}>
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
        <p className="text-xs text-text-secondary">
          Servidores salvos aqui só ficam disponíveis para o agente depois de
          recarregar — o agente já em execução não percebe a mudança sozinho.
        </p>
        <Button
          outlined
          size="sm"
          className="shrink-0"
          onClick={() => void reloadMcp()}
          disabled={reloading}
          prefix={reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        >
          Recarregar agente
        </Button>
      </div>
      {reloadNotice && (
        <p className={cn("text-xs", reloadNotice.kind === "ok" ? "text-success" : "text-destructive")}>
          {reloadNotice.text}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {servers.length === 0 ? (
          <p className="text-sm italic text-text-tertiary">Nenhum servidor MCP conectado ainda.</p>
        ) : (
          servers.map((s) => {
            const t = testState[s.name] ?? { status: "idle" as const };
            return (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-current/10 p-3">
                <Plug className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text-primary">
                    {s.name}
                    {s.has_auth && (
                      <KeyRound
                        className="h-3 w-3 shrink-0 text-text-tertiary"
                        aria-label="Autenticado com API key"
                      />
                    )}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">{s.url || s.command}</span>
                  {t.status === "ok" && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> {t.message}
                    </span>
                  )}
                  {t.status === "error" && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3 w-3" /> {t.message}
                    </span>
                  )}
                </span>
                <Button outlined size="sm" onClick={() => testServer(s.name)} disabled={t.status === "testing"}>
                  {t.status === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Testar"}
                </Button>
                <Button ghost size="icon" onClick={() => removeServer(s.name)} aria-label={`Remover ${s.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChannelsSummarySection() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<{ platform: string; connected: boolean; name?: string; username?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getChannelsStatus()
      .then((r) => setChannels(r.channels))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {channels.length === 0 ? (
        <p className="text-sm italic text-text-tertiary">Nenhum canal externo conectado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {channels.map((c) => (
            <div key={c.platform} className="flex items-center gap-3 rounded-xl border border-current/10 px-3 py-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", c.connected ? "bg-success" : "bg-text-tertiary/40")} />
              <span className="flex-1 truncate text-sm text-text-primary capitalize">
                {c.name || c.platform}
              </span>
              <span className="shrink-0 text-xs text-text-tertiary">
                {c.connected ? "conectado" : "desconectado"}
              </span>
            </div>
          ))}
        </div>
      )}
      <Button outlined size="sm" className="w-fit" onClick={() => navigate("/clients")}>
        Conectar novo canal
      </Button>
    </div>
  );
}
