import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Switch } from "@dheiver2/ui/ui/components/switch";
import { api } from "@/lib/api";
import type { RagFileInfo } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { cn } from "@/lib/utils";

const ACCEPTED_EXT = [".txt", ".md", ".pdf"];

// Sempre válido — o agente pode ser publicado sem nenhum documento (RAG é
// um reforço opcional, não obrigatório).
export function slide4IsValid(): boolean {
  return true;
}

export function Slide4RAG() {
  const { updateDraft } = useAgentDraft();
  const [files, setFiles] = useState<RagFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restrictToLocal, setRestrictToLocal] = useState(false);
  const [restricting, setRestricting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const r = await api.getRagFiles();
    setFiles(r.files);
    updateDraft({
      knowledge_files: r.files.map((f) => ({ name: f.name, status: "indexed" as const })),
    });
    return r.files;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([refresh(), api.getRagStatus()])
      .then(([, status]) => setRestrictToLocal(Boolean(status.restrict_web_search)))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [refresh]);

  const toggleRestrictToLocal = async (checked: boolean) => {
    setRestricting(true);
    try {
      await api.restrictRagToLocal(checked);
      setRestrictToLocal(checked);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestricting(false);
    }
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    setError(null);
    const list = Array.from(fileList);
    const invalid = list.find(
      (f) => !ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)),
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
      const next = await refresh();
      if (next.length > 0) {
        await api.enableRag(true);
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

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
        )}
      >
        <UploadCloud className="h-8 w-8 text-text-tertiary" />
        <p className="text-sm font-medium text-text-primary">
          Arraste documentos aqui ou clique para escolher
        </p>
        <p className="text-xs text-text-tertiary">Aceita .txt, .md e .pdf — até 10MB por arquivo</p>
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

      {uploading && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Indexando…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            Restringir à base de conhecimento local
          </span>
          <span className="text-xs text-text-tertiary">
            Quando ativo, o agente responde apenas com os documentos enviados aqui — sem buscar na web.
          </span>
        </div>
        <Switch
          checked={restrictToLocal}
          onCheckedChange={toggleRestrictToLocal}
          disabled={restricting}
        />
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
        ) : files.length === 0 ? (
          <p className="text-sm italic text-text-tertiary">Nenhum documento indexado ainda.</p>
        ) : (
          files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
              <span className="flex-1 truncate text-sm text-text-primary">{f.name}</span>
              <span className="shrink-0 text-xs text-text-tertiary">{f.chunks} trechos</span>
              <Button
                ghost
                size="icon"
                onClick={() => removeFile(f.name)}
                aria-label={`Remover ${f.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
