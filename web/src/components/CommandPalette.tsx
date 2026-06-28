// Command palette global (⌘K / Ctrl+K) — busca e navegação rápida por todas as
// telas + ações. Acessível: foco preso no input, navegação por setas, Esc fecha,
// Enter executa. Animação via `motion`.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  keywords?: string;
  icon?: React.ComponentType<{ className?: string }>;
  run: () => void;
}

function score(cmd: Command, q: string): number {
  if (!q) return 1;
  const hay = `${cmd.label} ${cmd.group ?? ""} ${cmd.keywords ?? ""}`.toLowerCase();
  const needle = q.toLowerCase();
  if (hay.includes(needle)) return 2;
  // match por iniciais/sequência de caracteres (fuzzy leve)
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length ? 1 : 0;
}

export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Atalho global de abertura (⌘K / Ctrl+K) e fechamento (Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mangaba:command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mangaba:command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // foca o input após montar
      const id = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(id);
    }
  }, [open]);

  const results = useMemo(() => {
    return commands
      .map((c) => ({ c, s: score(c, query.trim()) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const exec = useCallback((cmd?: Command) => {
    if (!cmd) return;
    setOpen(false);
    // deixa o overlay fechar antes de navegar
    setTimeout(() => cmd.run(), 0);
  }, []);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      exec(results[active]);
    }
  };

  // mantém o item ativo visível
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // agrupa resultados por "group"
  const grouped = useMemo(() => {
    const map = new Map<string, { cmd: Command; idx: number }[]>();
    results.forEach((cmd, idx) => {
      const g = cmd.group ?? "Geral";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push({ cmd, idx });
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Paleta de comandos"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onListKey}
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar telas e ações…"
                aria-label="Buscar"
                className="w-full bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nada encontrado para “{query}”.
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {group}
                    </div>
                    {items.map(({ cmd, idx }) => {
                      const Icon = cmd.icon;
                      const isActive = idx === active;
                      return (
                        <button
                          key={cmd.id}
                          data-idx={idx}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => exec(cmd)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-foreground"
                              : "text-foreground/80 hover:bg-muted"
                          }`}
                        >
                          {Icon && (
                            <Icon
                              className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            />
                          )}
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.hint && (
                            <span className="shrink-0 text-xs text-muted-foreground">{cmd.hint}</span>
                          )}
                          {isActive && (
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" /> navegar
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> abrir
              </span>
              <span className="ml-auto inline-flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-0.5">⌘K</kbd> alternar
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
