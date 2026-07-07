import { Fragment, useMemo, useState, type ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Download,
  MoreHorizontal,
  Moon,
  RotateCw,
  Search,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { ListItem } from "@dheiver2/ui/ui/components/list-item";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { cn } from "@/lib/utils";
import { SidebarFooter } from "@/components/SidebarFooter";
import { SidebarStatusStrip } from "@/components/SidebarStatusStrip";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useSystemActions } from "@/contexts/useSystemActions";
import type { SystemAction } from "@/contexts/system-actions-context";
import { useI18n } from "@/i18n";
import type { Translations } from "@/i18n/types";
import { PluginSlot } from "@/plugins";
import { useTheme } from "@/themes";
import { canSee, setRole, useUserRole, type UserRole } from "@/lib/userRole";

export interface NavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  labelKey?: string;
  path: string;
  section?: string;
  /** Perfil mínimo para ver o item; ausente = visível a todos. */
  minRole?: UserRole;
}

interface AppSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  navItems: { coreItems: NavItem[]; pluginItems: NavItem[] };
}

export function AppSidebar({ mobileOpen, onClose, navItems }: AppSidebarProps) {
  const { t } = useI18n();
  const { isDark, toggleDayNight } = useTheme();
  const [role] = useUserRole();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleCore = useMemo(
    () => navItems.coreItems.filter((item) => canSee(role, item.minRole)),
    [navItems.coreItems, role],
  );
  const hiddenCount = navItems.coreItems.length - visibleCore.length;

  return (
    <aside
      id="app-sidebar"
      aria-label={t.app.navigation}
      className={cn(
        "fixed top-0 left-0 z-50 flex h-dvh max-h-dvh w-72 min-h-0 flex-col",
        "border-r border-current/20",
        "bg-background-base/95 backdrop-blur-sm",
        "transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:sticky lg:top-0 lg:translate-x-0 lg:shrink-0",
      )}
      style={{
        background: "var(--component-sidebar-background)",
        clipPath: "var(--component-sidebar-clip-path)",
        borderImage: "var(--component-sidebar-border-image)",
      }}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center justify-between gap-3 px-5",
          "border-b border-current/20",
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo-mangaba.svg"
            alt="Mangaba Agent"
            className={cn(isDark && "rounded-md bg-[#FBF4E6] p-0.5")}
            style={{ height: "42px", width: "auto", display: "block" }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[0.08em] text-midground">
              Mangaba Agent
            </p>
            <p className="text-xs text-text-tertiary">Painel central</p>
          </div>
        </div>

        <Button
          ghost
          size="icon"
          onClick={onClose}
          aria-label={t.app.closeNavigation}
          className="lg:hidden text-text-secondary hover:text-midground"
        >
          <X />
        </Button>
      </div>

      <div className="px-2 pt-3">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new Event("mangaba:command-palette"))
          }
          className="flex w-full items-center gap-2 rounded-lg border border-current/10 px-3 py-2 text-sm text-text-tertiary transition-colors hover:bg-current/5"
          aria-label="Abrir busca de comandos"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded border border-current/15 px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <RoleSwitcher />

      <nav
        className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden border-t border-current/10 py-3"
        aria-label={t.app.navigation}
      >
        <ul className="flex flex-col gap-1 px-1">
          {(() => {
            let lastSection: string | undefined;
            return visibleCore.map((item) => {
              const showHeader = item.section && item.section !== lastSection;
              lastSection = item.section ?? lastSection;
              return (
                <Fragment key={item.path}>
                  {showHeader && (
                    <li
                      className="px-5 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-tertiary first:pt-1"
                      aria-hidden="true"
                    >
                      {item.section}
                    </li>
                  )}
                  <SidebarNavLink closeMobile={onClose} item={item} t={t} />
                </Fragment>
              );
            });
          })()}

          {hiddenCount > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl px-4 py-2.5",
                  "text-text-tertiary transition-colors duration-150 hover:bg-midground/5 hover:text-midground",
                )}
              >
                <MoreHorizontal className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm font-medium tracking-tight">
                  Mais opções…
                </span>
              </button>
            </li>
          )}
        </ul>

        {navItems.pluginItems.length > 0 && (
          <div
            aria-labelledby="mangaba-sidebar-plugin-nav-heading"
            className="flex flex-col border-t border-current/10 pb-2 pt-3"
            role="group"
          >
            <span
              className={cn(
                "px-5 pb-2",
                "text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary",
              )}
              id="mangaba-sidebar-plugin-nav-heading"
            >
              {t.app.pluginNavSection}
            </span>

            <ul className="flex flex-col gap-1 px-1">
              {navItems.pluginItems.map((item) => (
                <SidebarNavLink
                  closeMobile={onClose}
                  item={item}
                  key={item.path}
                  t={t}
                />
              ))}
            </ul>
          </div>
        )}
      </nav>

      <SidebarSystemActions onNavigate={onClose} />

      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2",
          "px-3 py-2",
          "border-t border-current/20",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <PluginSlot name="header-right" />

          {/* Dia / Noite toggle — acesso rápido sem abrir o picker completo */}
          <Button
            ghost
            size="icon"
            onClick={toggleDayNight}
            aria-label={isDark ? "Modo dia" : "Modo noite"}
            title={isDark ? "Mudar para modo dia" : "Mudar para modo noite"}
            className="text-text-secondary hover:text-midground"
          >
            {isDark
              ? <Sun className="h-3.5 w-3.5" />
              : <Moon className="h-3.5 w-3.5" />}
          </Button>

          <ThemeSwitcher dropUp />
          <LanguageSwitcher dropUp />
        </div>
      </div>

      <SidebarFooter />

      {moreOpen && (
        <MoreOptionsModal
          hiddenCount={hiddenCount}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </aside>
  );
}

function MoreOptionsModal({
  hiddenCount,
  onClose,
}: {
  hiddenCount: number;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mais opções"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-current/15 bg-background-base p-6 shadow-xl">
        <h2 className="text-base font-semibold text-midground">
          Mais opções no modo Dev
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Há {hiddenCount} {hiddenCount === 1 ? "área avançada" : "áreas avançadas"} (configuração,
          logs, habilidades e mais) disponíveis apenas no perfil{" "}
          <strong>Dev</strong>. Você pode trocar de perfil a qualquer momento.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button ghost onClick={onClose}>
            Agora não
          </Button>
          <Button
            onClick={() => {
              setRole("dev");
              onClose();
            }}
          >
            Trocar para Dev
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SidebarNavLinkProps {
  closeMobile: () => void;
  item: NavItem;
  t: Translations;
}

function SidebarNavLink({ closeMobile, item, t }: SidebarNavLinkProps) {
  const { path, label, labelKey, icon: Icon } = item;

  const navLabel = labelKey
    ? ((t.app.nav as Record<string, string>)[labelKey] ?? label)
    : label;

  return (
    <li>
      <NavLink
        to={path}
        end={path === "/sessions" || path === "/home"}
        onClick={closeMobile}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-3 rounded-2xl px-4 py-2.5",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base",
            isActive
              ? "bg-midground/10 text-midground shadow-sm"
              : "text-text-secondary hover:text-midground hover:bg-midground/5",
          )
        }
        style={{
          clipPath: "var(--component-tab-clip-path)",
        }}
      >
        {({ isActive }) => (
          <>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-medium tracking-tight">{navLabel}</span>

            <span
              aria-hidden
              className="absolute inset-y-1 left-1.5 right-1.5 rounded-2xl bg-midground opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-10"
            />

            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1 bottom-1 w-1.5 rounded-r-full bg-midground"
                style={{ mixBlendMode: "plus-lighter" }}
              />
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}

interface SystemActionItem {
  action: SystemAction;
  icon: ComponentType<{ className?: string }>;
  label: string;
  runningLabel: string;
  spin: boolean;
}

function SidebarSystemActions({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeAction, isBusy, isRunning, pendingAction, runAction } =
    useSystemActions();

  const items: SystemActionItem[] = [
    {
      action: "restart",
      icon: RotateCw,
      label: t.status.restartGateway,
      runningLabel: t.status.restartingGateway,
      spin: true,
    },
    {
      action: "update",
      icon: Download,
      label: t.status.updateMangaba,
      runningLabel: t.status.updatingMangaba,
      spin: false,
    },
  ];

  const handleClick = (action: SystemAction) => {
    if (isBusy) return;
    void runAction(action);
    navigate("/sessions");
    onNavigate();
  };

  return (
    <div
      className={cn(
        "shrink-0 flex flex-col",
        "border-t border-current/10",
        "py-3 px-3",
      )}
    >
      <span
        className={cn(
          "block pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary",
        )}
      >
        {t.app.system}
      </span>

      <SidebarStatusStrip />

      <ul className="flex flex-col gap-2 pt-2">
        {items.map(({ action, icon: Icon, label, runningLabel, spin }) => {
          const isPending = pendingAction === action;
          const isActionRunning =
            activeAction === action && isRunning && !isPending;
          const busy = isPending || isActionRunning;
          const displayLabel = isActionRunning ? runningLabel : label;
          const disabled = isBusy && !busy;

          return (
            <li key={action}>
              <ListItem
                onClick={() => handleClick(action)}
                disabled={disabled}
                aria-busy={busy}
                active={busy}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                  "transition-colors duration-150",
                  busy
                    ? "bg-midground/10 text-midground"
                    : "text-text-secondary hover:text-midground hover:bg-midground/5",
                  "disabled:text-text-disabled",
                )}
              >
                {isPending ? (
                  <Spinner className="shrink-0 text-[0.875rem]" />
                ) : isActionRunning && spin ? (
                  <Spinner className="shrink-0 text-[0.875rem]" />
                ) : (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActionRunning && !spin && "animate-pulse",
                    )}
                  />
                )}

                <span className="truncate">{displayLabel}</span>

                {busy && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 bottom-1 w-1.5 rounded-r-full bg-midground"
                    style={{ mixBlendMode: "plus-lighter" }}
                  />
                )}
              </ListItem>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
