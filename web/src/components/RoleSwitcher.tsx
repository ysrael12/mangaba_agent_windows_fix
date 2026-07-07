import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, UserRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_META, useUserRole, type UserRole } from "@/lib/userRole";

/**
 * Seletor de perfil (sidebar) — mostra só 2 opções na UI:
 *   "Simples" → operador/gestor (uso diário)
 *   "Dev"     → dev (acesso completo)
 *
 * Internamente preserva os 3 roles: ao voltar de Dev para Simples,
 * restaura o último role simples usado (operador ou gestor).
 */

const LAST_SIMPLE_KEY = "mangaba-perfil-simples";

type UiMode = "simples" | "dev";

const UI_OPTIONS: Array<{
  mode: UiMode;
  label: string;
  hint: string;
  icon: typeof UserRound;
}> = [
  { mode: "simples", label: "Simples", hint: "Uso diário", icon: UserRound },
  { mode: "dev", label: "Dev", hint: "Acesso completo", icon: Wrench },
];

function roleToMode(role: UserRole): UiMode {
  return role === "dev" ? "dev" : "simples";
}

export function RoleSwitcher() {
  const [role, setRole] = useUserRole();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeMode = roleToMode(role);
  const active = UI_OPTIONS.find((o) => o.mode === activeMode)!;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (mode: UiMode) => {
    setOpen(false);
    if (mode === roleToMode(role)) return;
    if (mode === "dev") {
      // Guarda o role simples atual para restaurar depois.
      try {
        localStorage.setItem(LAST_SIMPLE_KEY, role);
      } catch {
        /* ignore */
      }
      setRole("dev");
      return;
    }
    let previous: UserRole = "operador";
    try {
      const stored = localStorage.getItem(LAST_SIMPLE_KEY);
      if (stored === "gestor" || stored === "operador") previous = stored;
    } catch {
      /* ignore */
    }
    setRole(previous);
  };

  return (
    <div ref={rootRef} className="relative px-2 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={ROLE_META[role].hint}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-current/10 px-3 py-2",
          "text-sm text-text-secondary transition-colors hover:bg-current/5 hover:text-midground",
        )}
      >
        <active.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">
          Perfil: <span className="font-medium text-midground">{active.label}</span>
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Selecionar perfil"
          className={cn(
            "absolute left-2 right-2 z-50 mt-1 overflow-hidden rounded-lg",
            "border border-current/15 bg-background-base/95 shadow-lg backdrop-blur-sm",
          )}
        >
          {UI_OPTIONS.map((opt) => {
            const selected = opt.mode === activeMode;
            return (
              <li key={opt.mode}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(opt.mode)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                    selected
                      ? "bg-midground/10 text-midground"
                      : "text-text-secondary hover:bg-midground/5 hover:text-midground",
                  )}
                >
                  <opt.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-text-tertiary">{opt.hint}</span>
                  </span>
                  {selected && <Check className="mt-1 h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
