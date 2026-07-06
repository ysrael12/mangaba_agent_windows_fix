import {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "@/components/motion";
import { CommandPalette, type Command } from "@/components/CommandPalette";
import { Moon as MoonIcon, Sun as SunIcon } from "lucide-react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Clock,
  Code,
  Cpu,
  Database,
  Download,
  Eye,
  FileText,
  GitBranch,
  Globe,
  KanbanSquare,
  Heart,
  KeyRound,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Puzzle,
  Radio,
  RotateCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Terminal,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { ListItem } from "@dheiver2/ui/ui/components/list-item";
import { SelectionSwitcher } from "@dheiver2/ui/ui/components/selection-switcher";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/Backdrop";
import { SidebarFooter } from "@/components/SidebarFooter";
import { SidebarStatusStrip } from "@/components/SidebarStatusStrip";
import { RateLimitBanner } from "@/components/RateLimitBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useSystemActions } from "@/contexts/useSystemActions";
import type { SystemAction } from "@/contexts/system-actions-context";
import { useI18n } from "@/i18n";
import type { Translations } from "@/i18n/types";
import { PageHeaderProvider } from "@/contexts/PageHeaderProvider";
import { PluginPage, PluginSlot, usePlugins } from "@/plugins";
import type { PluginManifest } from "@/plugins";
import { useTheme } from "@/themes";
// Páginas carregadas sob demanda (code-splitting por rota) — cada uma vira um
// chunk separado, então o carregamento inicial não baixa todas as telas.
const ConfigPage = lazy(() => import("@/pages/ConfigPage"));
const DocsPage = lazy(() => import("@/pages/DocsPage"));
const LogsPage = lazy(() => import("@/pages/LogsPage"));
const CronPage = lazy(() => import("@/pages/CronPage"));
const FleetPage = lazy(() => import("@/pages/FleetPage"));
const KanbanPage = lazy(() => import("@/pages/KanbanPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const AgentWizardPage = lazy(() => import("@/pages/AgentWizardPage"));
const AgentDashboardPage = lazy(() => import("@/pages/AgentDashboardPage"));
const SetupPage = lazy(() => import("@/pages/SetupPage"));
const GlobalSessionsPage = lazy(() => import("@/pages/GlobalSessionsPage"));
const SkillsPage = lazy(() => import("@/pages/SkillsPage"));


function RootRedirect() {
  return <Navigate to="/criar" replace />;
}

function UnknownRouteFallback({ pluginsLoading }: { pluginsLoading: boolean }) {
  if (pluginsLoading) {
    // Render nothing during the plugin-load window — a spinner here would just flash.
    return null;
  }
  return <Navigate to="/home" replace />;
}

const BUILTIN_ROUTES_CORE: Record<string, ComponentType> = {
  "/": RootRedirect,
  "/setup": SetupPage,
  "/sessions": GlobalSessionsPage,
  "/logs": LogsPage,
  "/cron": CronPage,
  "/skills": SkillsPage,
  "/fleet": FleetPage,
  "/kanban": KanbanPage,
  "/clients": ClientsPage,
  "/criar": AgentWizardPage,
  "/dashboard/agent/:id": AgentDashboardPage,
  "/config": ConfigPage,
  "/docs": DocsPage,

};

// Navegação única — somente o essencial.
const BUILTIN_NAV_REST: NavItem[] = [
  { path: "/criar", label: "Início", icon: Activity },

  { path: "/sessions", labelKey: "sessions", label: "Sessões", icon: MessageSquare, section: "Agentes" },
  { path: "/fleet", labelKey: "fleet", label: "Frota", icon: Radio, section: "Agentes" },
  { path: "/clients", label: "Clientes & API", icon: Code, section: "Agentes" },

  { path: "/skills", labelKey: "skills", label: "Habilidades", icon: Package, section: "Configurar" },
  { path: "/config", labelKey: "config", label: "Configuração", icon: Settings, section: "Configurar" },

  { path: "/cron", labelKey: "cron", label: "Agendamentos", icon: Clock, section: "Automatizar" },
  { path: "/kanban", labelKey: "kanban", label: "Kanban", icon: KanbanSquare, section: "Automatizar" },

  { path: "/logs", labelKey: "logs", label: "Logs", icon: FileText, section: "Acompanhar" },
  { path: "/docs", labelKey: "documentation", label: "Documentação", icon: BookOpen, section: "Aprender" },
];

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  FileText,
  GitBranch,
  KeyRound,
  MessageSquare,
  Package,
  Settings,
  Puzzle,
  Sparkles,
  Terminal,
  Globe,
  Database,
  Shield,
  Users,
  Wrench,
  Zap,
  Heart,
  Star,
  Code,
  Eye,
};

function resolveIcon(name: string): ComponentType<{ className?: string }> {
  return ICON_MAP[name] ?? Puzzle;
}

function buildNavItems(
  builtIn: NavItem[],
  manifests: PluginManifest[],
): NavItem[] {
  const items = [...builtIn];

  for (const manifest of manifests) {
    if (manifest.tab.override) continue;
    if (manifest.tab.hidden) continue;

    const pluginItem: NavItem = {
      path: manifest.tab.path,
      label: manifest.label,
      icon: resolveIcon(manifest.icon),
    };

    const pos = manifest.tab.position ?? "end";
    if (pos === "end") {
      items.push(pluginItem);
    } else if (pos.startsWith("after:")) {
      const target = "/" + pos.slice(6);
      const idx = items.findIndex((i) => i.path === target);
      items.splice(idx >= 0 ? idx + 1 : items.length, 0, pluginItem);
    } else if (pos.startsWith("before:")) {
      const target = "/" + pos.slice(7);
      const idx = items.findIndex((i) => i.path === target);
      items.splice(idx >= 0 ? idx : items.length, 0, pluginItem);
    } else {
      items.push(pluginItem);
    }
  }

  return items;
}

/** Split merged nav into built-in sidebar entries vs plugin tabs, preserving plugin order hints. */
function partitionSidebarNav(
  builtIn: NavItem[],
  manifests: PluginManifest[],
): { coreItems: NavItem[]; pluginItems: NavItem[] } {
  const merged = buildNavItems(builtIn, manifests);
  const builtinPaths = new Set(builtIn.map((i) => i.path));
  const coreItems: NavItem[] = [];
  const pluginItems: NavItem[] = [];
  for (const item of merged) {
    if (builtinPaths.has(item.path)) coreItems.push(item);
    else pluginItems.push(item);
  }
  return { coreItems, pluginItems };
}

function buildRoutes(
  builtinRoutes: Record<string, ComponentType>,
  manifests: PluginManifest[],
): Array<{
  key: string;
  path: string;
  element: ReactNode;
}> {
  const byOverride = new Map<string, PluginManifest>();
  const addons: PluginManifest[] = [];

  for (const m of manifests) {
    if (m.tab.override) {
      byOverride.set(m.tab.override, m);
    } else {
      addons.push(m);
    }
  }

  const routes: Array<{
    key: string;
    path: string;
    element: ReactNode;
  }> = [];

  for (const [path, Component] of Object.entries(builtinRoutes)) {
    const om = byOverride.get(path);
    if (om) {
      routes.push({
        key: `override:${om.name}`,
        path,
        element: <PluginPage name={om.name} />,
      });
    } else {
      // Páginas full-height (chat/docs) não podem ser embrulhadas (quebra o
      // layout flex). As demais ganham uma entrada suave de conteúdo.
      const fullHeight = path === "/chat" || path === "/docs";
      routes.push({
        key: `builtin:${path}`,
        path,
        element: (
          <>
            {fullHeight ? (
              <Component />
            ) : (
              <Reveal y={10}>
                <Component />
              </Reveal>
            )}
          </>
        ),
      });
    }
  }

  for (const m of addons) {
    if (m.tab.hidden) continue;
    if (m.tab.path === "/plugins") continue;
    if (builtinRoutes[m.tab.path]) continue;
    routes.push({
      key: `plugin:${m.name}`,
      path: m.tab.path,
      element: <PluginPage name={m.name} />,
    });
  }

  for (const m of manifests) {
    if (!m.tab.hidden) continue;
    if (m.tab.path === "/plugins") continue;
    if (builtinRoutes[m.tab.path] || m.tab.override) continue;
    routes.push({
      key: `plugin:hidden:${m.name}`,
      path: m.tab.path,
      element: <PluginPage name={m.name} />,
    });
  }

  return routes;
}

export default function App() {
  const { t } = useI18n();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const { manifests, loading: pluginsLoading } = usePlugins();
  const { theme, isDark, toggleDayNight } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const isDocsRoute = pathname === "/docs" || pathname === "/docs/";

  const builtinRoutes = useMemo(
    () => BUILTIN_ROUTES_CORE,
    [],
  );

  const builtinNav = useMemo(
    () => BUILTIN_NAV_REST,
    [],
  );

  const sidebarNav = useMemo(
    () => partitionSidebarNav(builtinNav, manifests),
    [builtinNav, manifests],
  );

  // Comandos do ⌘K: navegar para cada tela + ações rápidas.
  const commands = useMemo<Command[]>(() => {
    const navCmds: Command[] = builtinNav.map((item) => ({
      id: `nav:${item.path}`,
      label: item.label,
      group: item.section ?? "Navegar",
      icon: item.icon,
      keywords: item.path,
      run: () => navigate(item.path),
    }));
    const actions: Command[] = [
      {
        id: "action:theme",
        label: isDark ? "Mudar para tema claro" : "Mudar para tema escuro",
        group: "Ações",
        icon: isDark ? SunIcon : MoonIcon,
        keywords: "tema dark light dia noite theme",
        run: toggleDayNight,
      },
    ];
    return [...navCmds, ...actions];
  }, [builtinNav, navigate, isDark, toggleDayNight]);
  const routes = useMemo(
    () => buildRoutes(builtinRoutes, manifests),
    [builtinRoutes, manifests],
  );
  const pluginTabMeta = useMemo(
    () =>
      manifests
        .filter((m) => !m.tab.hidden)
        .map((m) => ({
          path: m.tab.override ?? m.tab.path,
          label: m.label,
        })),
    [manifests],
  );

  const layoutVariant = theme.layoutVariant ?? "standard";

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      data-layout-variant={layoutVariant}
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-background-base text-text-primary antialiased"
    >
      <SelectionSwitcher />
      <Backdrop />
      <PluginSlot name="backdrop" />

      <header
        className={cn(
          "lg:hidden fixed top-0 left-0 right-0 z-40 min-h-14",
          "flex items-center gap-3 px-4 py-2",
          "border-b border-current/20",
          "bg-background-base/90 backdrop-blur-sm",
        )}
        style={{
          background: "var(--component-header-background)",
          borderImage: "var(--component-header-border-image)",
          clipPath: "var(--component-header-clip-path)",
        }}
      >
        <Button
          ghost
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label={t.app.openNavigation}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          className="text-text-secondary hover:text-midground"
        >
          <Menu />
        </Button>

        <div className="flex items-center gap-2">
          <img
            src="/logo-mangaba.svg"
            alt="Mangaba"
            className={cn(isDark && "rounded-md bg-[#FBF4E6] p-0.5")}
            style={{ height: "34px", width: "auto" }}
          />
          <span className="text-sm font-semibold tracking-[0.08em] text-midground">
            Painel
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            ghost
            size="icon"
            onClick={toggleDayNight}
            aria-label={isDark ? "Modo dia" : "Modo noite"}
            className="text-text-secondary hover:text-midground"
            title={isDark ? "Mudar para modo dia" : "Mudar para modo noite"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <Button
          ghost
          aria-label={t.app.closeNavigation}
          onClick={closeMobile}
          className={cn(
            "lg:hidden fixed inset-0 z-40 p-0 block",
            "bg-black/60 backdrop-blur-sm",
          )}
        />
      )}

      <RateLimitBanner />
      <PluginSlot name="header-banner" />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
        <div className="flex min-h-0 min-w-0 flex-1">
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
                onClick={closeMobile}
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

            <nav
              className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden border-t border-current/10 py-3"
              aria-label={t.app.navigation}
            >
              <ul className="flex flex-col gap-1 px-1">
                {(() => {
                  let lastSection: string | undefined;
                  return sidebarNav.coreItems.map((item) => {
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
                        <SidebarNavLink closeMobile={closeMobile} item={item} t={t} />
                      </Fragment>
                    );
                  });
                })()}
              </ul>

              {sidebarNav.pluginItems.length > 0 && (
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
                    {sidebarNav.pluginItems.map((item) => (
                      <SidebarNavLink
                        closeMobile={closeMobile}
                        item={item}
                        key={item.path}
                        t={t}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </nav>

            <SidebarSystemActions onNavigate={closeMobile} />

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
          </aside>

          <PageHeaderProvider pluginTabs={pluginTabMeta}>
            <div
              className={cn(
                "relative z-2 flex min-w-0 min-h-0 flex-1 flex-col",
                "px-3 sm:px-6 pt-2 sm:pt-4 lg:pt-6",
                isDocsRoute && "min-h-0 flex-1",
              )}
            >
              <PluginSlot name="pre-main" />
              <div
                className={cn(
                  "w-full min-w-0",
                  "pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
                  isDocsRoute && "min-h-0 flex flex-1 flex-col",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={pathname}
                    className={cn(
                      "w-full min-w-0",
                      isDocsRoute && "flex min-h-0 flex-1 flex-col",
                    )}
                    initial={{ opacity: 0, y: isDocsRoute ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isDocsRoute ? 0 : -6 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Suspense
                      fallback={
                        <div className="flex justify-center py-24">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      }
                    >
                      <Routes location={location}>
                        {routes.map(({ key, path, element }) => (
                          <Route key={key} path={path} element={element} />
                        ))}
                        <Route
                          path="*"
                          element={
                            <UnknownRouteFallback pluginsLoading={pluginsLoading} />
                          }
                        />
                      </Routes>
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </div>
              <PluginSlot name="post-main" />
            </div>
          </PageHeaderProvider>
        </div>
      </div>

      <PluginSlot name="overlay" />
      <CommandPalette commands={commands} />
    </div>
  );
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

interface NavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  labelKey?: string;
  path: string;
  section?: string;
}

interface SidebarNavLinkProps {
  closeMobile: () => void;
  item: NavItem;
  t: Translations;
}

interface SystemActionItem {
  action: SystemAction;
  icon: ComponentType<{ className?: string }>;
  label: string;
  runningLabel: string;
  spin: boolean;
}
