import { useCallback, useEffect, useState } from "react";
import { Brain, Save, Trash2, RefreshCw, User } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { MemoryResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BlockEditorProps {
  title: string;
  hint: string;
  icon: React.ReactNode;
  target: "memory" | "user";
  content: string;
  limit: number;
  onSaved: () => void;
}

function BlockEditor({
  title,
  hint,
  icon,
  target,
  content,
  limit,
  onSaved,
}: BlockEditorProps) {
  const [text, setText] = useState(content);
  const [busy, setBusy] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    setText(content);
  }, [content]);

  const liveChars = text.length;
  const pct = Math.min(100, Math.round((liveChars / Math.max(1, limit)) * 100));
  const over = liveChars > limit;
  const dirty = text !== content;

  const save = async () => {
    setBusy(true);
    try {
      await api.saveMemory(target, text);
      showToast("Memória salva.", "success");
      onSaved();
    } catch (e) {
      showToast(`Erro ao salvar: ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await api.resetMemory(target);
      setText("");
      showToast("Bloco limpo.", "success");
      onSaved();
    } catch (e) {
      showToast(`Erro ao limpar: ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Toast toast={toast} />
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
          <Badge tone={over ? "destructive" : "secondary"} className="shrink-0 text-xs tabular-nums">
            {liveChars} / {limit}
          </Badge>
        </div>

        {/* Barra de uso */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-foreground")}
            style={{ width: `${pct}%` }}
          />
        </div>

        <textarea
          value={text}
          aria-label="Conteúdo do bloco de memória"
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="(vazio) — o agente preenche isto sozinho ao longo das conversas, mas você pode editar aqui."
          className="w-full resize-y rounded-md border border-input bg-background p-3 font-mono-ui text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {over && (
          <p className="text-xs text-destructive">
            Acima do limite — o agente trunca o excedente. Reduza para caber.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button outlined size="sm" onClick={clear} disabled={busy} prefix={<Trash2 className="h-4 w-4" />}>
            Limpar
          </Button>
          <Button size="sm" onClick={save} disabled={busy || !dirty} prefix={busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemoryPage() {
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api
      .getMemory()
      .then(setData)
      .catch((e) => showToast(`Erro ao carregar memória: ${(e as Error).message}`, "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAll = async () => {
    try {
      await api.resetMemory("all");
      showToast("Toda a memória foi limpa.", "success");
      load();
    } catch (e) {
      showToast(`Erro: ${(e as Error).message}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-2xl text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4 p-1">
      <Toast toast={toast} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <H2>Memória</H2>
        </div>
        <div className="flex items-center gap-2">
          <Button outlined size="sm" onClick={load} prefix={<RefreshCw className="h-4 w-4" />}>
            Atualizar
          </Button>
          <Button outlined size="sm" destructive onClick={resetAll} prefix={<Trash2 className="h-4 w-4" />}>
            Limpar tudo
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        O agente lembra de coisas entre conversas usando dois blocos. Eles são
        preenchidos automaticamente, mas você pode ler e editar aqui.
        {data?.provider ? (
          <>
            {" "}Provedor externo ativo: <Badge tone="outline" className="text-xs">{data.provider}</Badge> (configurável na aba Plugins).
          </>
        ) : null}
      </p>

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BlockEditor
            title="Memória do agente"
            hint="Fatos, convenções e lições aprendidas (MEMORY.md)"
            icon={<Brain className="h-5 w-5" />}
            target="memory"
            content={data.memory.content}
            limit={data.memory.limit}
            onSaved={load}
          />
          <BlockEditor
            title="Perfil do usuário"
            hint="Suas preferências e estilo (USER.md)"
            icon={<User className="h-5 w-5" />}
            target="user"
            content={data.user.content}
            limit={data.user.limit}
            onSaved={load}
          />
        </div>
      )}
    </div>
  );
}
