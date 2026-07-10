import {
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
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  BookOpen,
  Clock,
  Code,
  FileText,
  Folder,
  Home,
  KanbanSquare,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Plug,
  Radio,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { SelectionSwitcher } from "@dheiver2/ui/ui/components/selection-switcher";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/Backdrop";
import { AppSidebar, type NavItem } from "@/components/AppSidebar";
import { RateLimitBanner } from "@/components/RateLimitBanner";
import { useI18n } from "@/i18n";
import { PageHeaderProvider } from "@/contexts/PageHeaderProvider";
import { PluginPage, PluginSlot, usePlugins } from "@/plugins";
import type { PluginManifest } from "@/plugins";
import { useTheme } from "@/themes";
import { resolveIcon } from "@/lib/navIcons";
// Páginas carregadas sob demanda (code-splitting por rota) — cada uma vira um
// chunk separado, então o carregamento inicial não baixa todas as telas.
const ChatPage = lazy(() => import("@/pages/ChatPage"));
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
const HomePage = lazy(() => import("@/pages/HomePage"));
const SimpleSettings = lazy(() => import("@/pages/SimpleSettings"));
const HealthPage = lazy(() => import("@/pages/HealthPage"));


function RootRedirect() {
  return <Navigate to="/home" replace />;
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
  "/home": HomePage,
  "/chat": ChatPage,
  "/configuracoes": SimpleSettings,
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
  "/diagnostico": HealthPage,

};


// Navegação — tudo visível por padrão (dev invisível)
const BUILTIN_NAV_REST: NavItem[] = [
  { path: "/home", label: "Início", icon: Home },

  { path: "/sessions", labelKey: "sessions", label: "Minhas Sessões", icon: MessageSquare, section: "Conversar" },
  { path: "/chat", label: "Chat em tempo real", icon: MessageSquare, section: "Conversar" },

  { path: "/criar", label: "Criar funcionário agêntico", icon: Sparkles, section: "Agentes" },
  { path: "/fleet", labelKey: "fleet", label: "Agentes ativos", icon: Radio, section: "Agentes" },
  { path: "/clients", label: "Conectar serviços", icon: Code, section: "Agentes" },

  { path: "/cron", labelKey: "cron", label: "Agendamentos", icon: Clock, section: "Automatizar" },
  { path: "/kanban", labelKey: "kanban", label: "Tarefas", icon: KanbanSquare, section: "Automatizar" },

  { path: "/skills", labelKey: "skills", label: "Habilidades", icon: Package, section: "Configurar" },
  { path: "/configuracoes", label: "Configurações", icon: Settings, section: "Configurar" },
  { path: "/configuracoes#rag", label: "Base de conhecimento", icon: Folder, section: "Configurar" },
  { path: "/configuracoes#mcp", label: "Conexões MCP", icon: Plug, section: "Configurar" },

  { path: "/logs", labelKey: "logs", label: "Logs", icon: FileText, section: "Acompanhar" },
  { path: "/diagnostico", label: "Diagnóstico", icon: Activity, section: "Acompanhar" },
  { path: "/docs", labelKey: "documentation", label: "Documentação", icon: BookOpen, section: "Aprender" },
];

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
        element: fullHeight ? (
          <Component />
        ) : (
          <Reveal y={10}>
            <Component />
          </Reveal>
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
          <AppSidebar
            mobileOpen={mobileOpen}
            onClose={closeMobile}
            navItems={sidebarNav}
          />

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
