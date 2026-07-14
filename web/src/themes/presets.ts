import type { DashboardTheme, ThemeTypography } from "./types";

/**
 * Built-in dashboard themes.
 *
 * Only one visual identity ships: the template's (web/template/mangaba-agent-
 * dashboard) Inter/Outfit/JetBrains Mono + orange/slate look, as a day/night
 * pair (`default` dark, `mangaba-light` light) driven by the same toggle.
 *
 * Theme names must stay in sync with the backend's
 * `_BUILTIN_DASHBOARD_THEMES` list in `mangaba_cli/web_server.py`.
 */

// ---------------------------------------------------------------------------
// Shared typography
// ---------------------------------------------------------------------------

/** Default system stack — neutral, safe fallback for every platform. */
const SYSTEM_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_MONO =
  'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';

/* Inter + Outfit + JetBrains Mono — tipografia do template de referência
   (web/template/mangaba-agent-dashboard). */
const TEMPLATE_TYPOGRAPHY: ThemeTypography = {
  fontSans: `"Inter", ${SYSTEM_SANS}`,
  fontDisplay: `"Outfit", ${SYSTEM_SANS}`,
  fontMono: `"JetBrains Mono", ${SYSTEM_MONO}`,
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
  baseSize: "15px",
  lineHeight: "1.55",
  letterSpacing: "0",
};

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

/**
 * Mangaba Noite — modo escuro, no padrão do template de referência
 * (web/template/mangaba-agent-dashboard): canvas quase-preto, superfícies
 * slate escuras, laranja #FF6B35 como accent único, tipografia
 * Inter/Outfit/JetBrains Mono.
 *
 * Cores extraídas literalmente do template:
 *   canvas    #0a0c10  (App.tsx bg dark)
 *   sidebar   #0f1115  border #1f242e  (Sidebar.tsx)
 *   card      #12161f  border #1f242e  (AgentDashboard/ChatView)
 *   hover     #161a22  border #252c39
 *   accent    #FF6B35  (--color-emerald-500 do template)
 */
export const defaultTheme: DashboardTheme = {
  name: "default",
  label: "Mangaba Noite",
  description: "Modo escuro — slate profundo com laranja do template",
  palette: {
    background: { hex: "#0a0c10", alpha: 1 },
    midground:  { hex: "#F3F3F1", alpha: 1 },
    foreground: { hex: "#F3F3F1", alpha: 0 },
    warmGlow:   "rgba(255, 107, 53, 0.16)",
    noiseOpacity: 0.5,
  },
  typography: TEMPLATE_TYPOGRAPHY,
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    primary:           "#FF6B35",
    primaryForeground: "#1A1A1A",

    card:              "#12161f",
    cardForeground:    "#F3F3F1",
    popover:           "#0f1115",
    popoverForeground: "#F3F3F1",

    secondary:          "#161a22",
    secondaryForeground:"#F3F3F1",
    muted:              "#161a22",
    mutedForeground:    "#B8B8B0",

    accent:            "#2A1F16",
    accentForeground:  "#FF8557",

    border: "#1f242e",
    input:  "#1f242e",
    ring:   "#FF6B35",

    success:              "#22C55E",
    warning:              "#F59E0B",
    destructive:          "#EF4444",
    destructiveForeground:"#ffffff",
  },
};

/**
 * Mangaba Dia — modo claro, no padrão do template de referência (modo claro
 * do Sidebar/App.tsx do protótipo): canvas slate-50, cards brancos, laranja
 * #FF6B35 como accent único, tipografia Inter/Outfit/JetBrains Mono.
 */
export const mangabaLightTheme: DashboardTheme = {
  name: "mangaba-light",
  label: "Mangaba Dia",
  description: "Modo claro — slate claro com laranja do template",
  palette: {
    background: { hex: "#F9F9F8", alpha: 1 },
    midground:  { hex: "#1A1A1A", alpha: 1 },
    foreground: { hex: "#1A1A1A", alpha: 0 },
    warmGlow:   "rgba(255, 107, 53, 0.10)",
    noiseOpacity: 0.18,
  },
  typography: TEMPLATE_TYPOGRAPHY,
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    primary:           "#FF6B35",
    primaryForeground: "#ffffff",

    card:              "#FFFFFF",
    cardForeground:    "#1A1A1A",
    popover:           "#FFFFFF",
    popoverForeground: "#1A1A1A",

    secondary:          "#F3F3F1",
    secondaryForeground:"#1A1A1A",
    muted:              "#F3F3F1",
    mutedForeground:    "#717168",

    accent:            "#FFF5F2",
    accentForeground:  "#E0531F",

    border: "#EAEAE6",
    input:  "#EAEAE6",
    ring:   "#FF6B35",

    success:              "#16A34A",
    warning:              "#D97706",
    destructive:          "#DC2626",
    destructiveForeground:"#ffffff",
  },
};

export const BUILTIN_THEMES: Record<string, DashboardTheme> = {
  default: defaultTheme,
  "mangaba-light": mangabaLightTheme,
};
