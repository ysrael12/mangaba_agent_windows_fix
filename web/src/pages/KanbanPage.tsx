import { useCallback, useEffect, useState } from "react";
import {
  KanbanSquare,
  Plus,
  RefreshCw,
  X,
  Trash2,
  Sparkles,
  GitFork,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type {
  KanbanBoardSummary,
  KanbanTask,
  KanbanTaskDetail,
} from "@/lib/api";

// As colunas do quadro, na ordem do fluxo. `archived` fica oculto.
const COLUMNS: { key: string; label: string; tone: BadgeTone }[] = [
  { key: "triage", label: "Triagem", tone: "secondary" },
  { key: "todo", label: "A fazer", tone: "secondary" },
  { key: "ready", label: "Pronto", tone: "outline" },
  { key: "running", label: "Rodando", tone: "warning" },
  { key: "blocked", label: "Bloqueado", tone: "destructive" },
  { key: "review", label: "Revisão", tone: "outline" },
  { key: "done", label: "Concluído", tone: "success" },
];

type BadgeTone = "secondary" | "success" | "warning" | "destructive" | "outline";

function statusTone(status: string): BadgeTone {
  return COLUMNS.find((c) => c.key === status)?.tone ?? "secondary";
}

function fmtTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("pt-BR");
}

// ---------------------------------------------------------------------------
// Modal de criação de tarefa
// ---------------------------------------------------------------------------

function NewTaskModal({
  board,
  onClose,
  onCreated,
}: {
  board: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [triage, setTriage] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast, showToast } = useToast();

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.createKanbanTask(board, {
        title: title.trim(),
        body: body.trim() || undefined,
        assignee: assignee.trim() || undefined,
        triage,
      });
      onCreated();
      onClose();
    } catch (e) {
      showToast(`Erro ao criar tarefa: ${(e as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Toast toast={toast} />
      <div
        className="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">Nova tarefa</span>
          <Button ghost size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Título da tarefa"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm text-foreground"
          placeholder="Descrição / especificação (opcional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Input
          placeholder="Atribuir a (profile worker, opcional)"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={triage}
            onChange={(e) => setTriage(e.target.checked)}
          />
          Entrar em triagem (especificar/decompor depois com IA)
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button outlined size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={create} disabled={busy || !title.trim()}>
            {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de detalhe da tarefa
// ---------------------------------------------------------------------------

function TaskDetailModal({
  board,
  taskId,
  onClose,
  onChanged,
}: {
  board: string;
  taskId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<KanbanTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const { toast, showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api
      .getKanbanTask(board, taskId)
      .then(setDetail)
      .catch((e) => showToast(String(e), "error"))
      .finally(() => setLoading(false));
  }, [board, taskId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: string, fn: () => Promise<unknown>) => {
    setBusy(action);
    try {
      await fn();
      load();
      onChanged();
    } catch (e) {
      showToast(`Falha: ${(e as Error).message}`, "error");
    } finally {
      setBusy(null);
    }
  };

  const t = detail?.task;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Toast toast={toast} />
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="min-w-0 flex-1 truncate font-medium">
            {t ? t.title : "Carregando…"}
          </span>
          <Button ghost size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading || !t ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              {t.assignee && <Badge tone="outline">{t.assignee}</Badge>}
              <span className="font-mono-ui text-xs text-muted-foreground">{t.id}</span>
            </div>

            {t.body && (
              <pre className="whitespace-pre-wrap rounded border border-border bg-muted/40 p-3 text-sm">
                {t.body}
              </pre>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Criada: {fmtTime(t.created_at)}</span>
              <span>Iniciada: {fmtTime(t.started_at)}</span>
              <span>Concluída: {fmtTime(t.completed_at)}</span>
              <span>Prioridade: {t.priority}</span>
            </div>

            {(detail.parents.length > 0 || detail.children.length > 0) && (
              <div className="flex flex-col gap-1 text-xs">
                {detail.parents.length > 0 && (
                  <span className="text-muted-foreground">
                    Depende de: {detail.parents.join(", ")}
                  </span>
                )}
                {detail.children.length > 0 && (
                  <span className="text-muted-foreground">
                    Desbloqueia: {detail.children.join(", ")}
                  </span>
                )}
              </div>
            )}

            {detail.latest_summary && (
              <div className="rounded border-l-4 border-foreground bg-muted px-3 py-2 text-sm">
                <span className="font-semibold">Resumo do worker: </span>
                {detail.latest_summary}
              </div>
            )}

            {/* Ações de ciclo de vida */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {t.status === "triage" && (
                <>
                  <Button
                    outlined
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      run("specify", async () => {
                        await api.kanbanLlmAction(t.id, "specify");
                        showToast("Especificação iniciada (IA) — atualize em instantes", "success");
                      })
                    }
                  >
                    <Sparkles className="h-4 w-4" /> Especificar (IA)
                  </Button>
                  <Button
                    outlined
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      run("decompose", async () => {
                        await api.kanbanLlmAction(t.id, "decompose");
                        showToast("Decomposição iniciada (IA) — atualize em instantes", "success");
                      })
                    }
                  >
                    <GitFork className="h-4 w-4" /> Decompor (IA)
                  </Button>
                </>
              )}
              {["running", "ready", "blocked"].includes(t.status) && (
                <Button
                  outlined
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run("complete", () => api.kanbanTaskAction(board, t.id, "complete"))
                  }
                >
                  Concluir
                </Button>
              )}
              {["running", "ready"].includes(t.status) && (
                <Button
                  outlined
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run("block", () =>
                      api.kanbanBlockTask(board, t.id, "Bloqueado pelo operador via dashboard"),
                    )
                  }
                >
                  Bloquear
                </Button>
              )}
              {["blocked", "scheduled"].includes(t.status) && (
                <Button
                  outlined
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run("unblock", () => api.kanbanTaskAction(board, t.id, "unblock"))
                  }
                >
                  Desbloquear
                </Button>
              )}
              {t.status === "running" && (
                <Button
                  outlined
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run("reclaim", () => api.kanbanTaskAction(board, t.id, "reclaim"))
                  }
                >
                  Liberar claim
                </Button>
              )}
              {busy && <Spinner className="h-4 w-4 self-center" />}
            </div>

            {/* Comentários */}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comentários
              </span>
              {detail.comments.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhum comentário.</span>
              ) : (
                detail.comments.map((c, i) => (
                  <div key={i} className="rounded border border-border p-2 text-sm">
                    <span className="font-mono-ui text-xs text-muted-foreground">
                      {c.author} · {fmtTime(c.created_at)}
                    </span>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar comentário…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      void run("comment", async () => {
                        await api.kanbanCommentTask(board, t.id, comment.trim());
                        setComment("");
                      });
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={busy !== null || !comment.trim()}
                  onClick={() =>
                    run("comment", async () => {
                      await api.kanbanCommentTask(board, t.id, comment.trim());
                      setComment("");
                    })
                  }
                >
                  Enviar
                </Button>
              </div>
            </div>

            {/* Histórico de eventos */}
            {detail.events.length > 0 && (
              <details className="border-t border-border pt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Histórico ({detail.events.length})
                </summary>
                <div className="mt-2 flex flex-col gap-1">
                  {detail.events.map((e, i) => (
                    <span key={i} className="font-mono-ui text-xs text-muted-foreground">
                      {fmtTime(e.created_at)} · {e.kind}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function KanbanPage() {
  const [boards, setBoards] = useState<KanbanBoardSummary[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardSlug, setNewBoardSlug] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const loadBoards = useCallback(() => {
    setLoading(true);
    api
      .getKanbanBoards()
      .then((res) => {
        setBoards(res.boards);
        setCurrent((prev) => prev || res.current);
      })
      .catch((e) => showToast(`Erro ao carregar quadros: ${(e as Error).message}`, "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const loadTasks = useCallback(
    (board: string) => {
      if (!board) return;
      setLoadingTasks(true);
      api
        .getKanbanTasks(board)
        .then((res) => setTasks(res.tasks))
        .catch((e) => showToast(`Erro ao carregar tarefas: ${(e as Error).message}`, "error"))
        .finally(() => setLoadingTasks(false));
    },
    [showToast],
  );

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    loadTasks(current);
  }, [current, loadTasks]);

  const switchBoard = async (slug: string) => {
    setCurrent(slug);
    try {
      await api.selectKanbanBoard(slug);
    } catch {
      // a troca local já aconteceu; persistir é best-effort
    }
  };

  const createBoard = async () => {
    const slug = newBoardSlug.trim().toLowerCase();
    if (!slug) return;
    try {
      await api.createKanbanBoard({ slug });
      setNewBoardSlug("");
      setNewBoardOpen(false);
      loadBoards();
      setCurrent(slug);
    } catch (e) {
      showToast(`Erro ao criar quadro: ${(e as Error).message}`, "error");
    }
  };

  const removeBoard = async (slug: string) => {
    if (slug === "default") {
      showToast("O quadro 'default' não pode ser removido.", "error");
      return;
    }
    try {
      await api.deleteKanbanBoard(slug);
      if (current === slug) setCurrent("default");
      loadBoards();
    } catch (e) {
      showToast(`Erro ao remover quadro: ${(e as Error).message}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-2xl text-primary" />
      </div>
    );
  }

  const visibleColumns = COLUMNS.filter(
    (c) => tasks.some((t) => t.status === c.key) || ["ready", "running", "done"].includes(c.key),
  );

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4 p-1">
      <Toast toast={toast} />

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-5 w-5" />
          <H2>Kanban</H2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button outlined size="sm" onClick={() => loadTasks(current)} disabled={loadingTasks}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setNewTaskOpen(true)} disabled={!current}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      {/* Seletor de quadros */}
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => {
          const total = Object.values(b.by_status).reduce((a, n) => a + n, 0);
          const isActive = b.slug === current;
          return (
            <div
              key={b.slug}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm ${
                isActive ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              <button onClick={() => switchBoard(b.slug)} className="font-medium">
                {b.name}
              </button>
              <span className={isActive ? "text-background/70" : "text-muted-foreground"}>
                {total}
              </span>
              {b.slug !== "default" && (
                <button
                  onClick={() => removeBoard(b.slug)}
                  title="Arquivar quadro"
                  className={isActive ? "text-background/70" : "text-muted-foreground"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {newBoardOpen ? (
          <div className="flex items-center gap-1">
            <Input
              placeholder="slug-do-quadro"
              value={newBoardSlug}
              onChange={(e) => setNewBoardSlug(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createBoard();
              }}
              className="h-8 w-40"
              autoFocus
            />
            <Button size="sm" onClick={createBoard} disabled={!newBoardSlug.trim()}>
              Criar
            </Button>
            <Button ghost size="icon" onClick={() => setNewBoardOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button outlined size="sm" onClick={() => setNewBoardOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo quadro
          </Button>
        )}
      </div>

      {/* Colunas do quadro */}
      {loadingTasks ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma tarefa neste quadro ainda. Clique em <strong>Nova tarefa</strong> para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visibleColumns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="flex w-64 shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <Badge tone={col.tone}>{col.label}</Badge>
                  <span className="text-xs text-muted-foreground">{colTasks.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {colTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDetailId(t.id)}
                      className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/40"
                    >
                      <span className="text-sm font-medium leading-snug">{t.title}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.assignee && (
                          <Badge tone="outline" className="text-xs">
                            {t.assignee}
                          </Badge>
                        )}
                        {t.priority > 0 && (
                          <span className="text-xs text-muted-foreground">P{t.priority}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {newTaskOpen && current && (
        <NewTaskModal
          board={current}
          onClose={() => setNewTaskOpen(false)}
          onCreated={() => {
            loadTasks(current);
            loadBoards();
          }}
        />
      )}

      {detailId && current && (
        <TaskDetailModal
          board={current}
          taskId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            loadTasks(current);
            loadBoards();
          }}
        />
      )}
    </div>
  );
}
