import type { DashboardTheme, ThemeTypography, ThemeLayout } from "./types";

/**
 * Built-in dashboard themes.
 *
 * Each theme defines its own palette, typography, and layout so switching
 * themes produces visible changes beyond just color — fonts, density, and
 * corner-radius all shift to match the theme's personality.
 *
 * Theme names must stay in sync with the backend's
 * `_BUILTIN_DASHBOARD_THEMES` list in `mangaba_cli/web_server.py`.
 */

// ---------------------------------------------------------------------------
// Shared typography / layout presets
// ---------------------------------------------------------------------------

/** Default system stack — neutral, safe fallback for every platform. */
const SYSTEM_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_MONO =
  'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';

/* Stack idêntico ao VS Code workbench — SF Pro no macOS, Segoe UI no
   Windows, Noto Sans no Linux. Sem Google Fonts: resolve via sistema. */
const VSCODE_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif';

/* Cascadia Code/Mono — fonte do editor do VS Code. Fallback para as
   demais monospace de sistema (Consolas no Windows, SF Mono no macOS). */
const VSCODE_MONO =
  '"Cascadia Code", "Cascadia Mono", Consolas, "SF Mono", "Ubuntu Mono", Menlo, monospace';

const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  fontSans: VSCODE_SANS,
  fontMono: VSCODE_MONO,
  baseSize: "13px",
  lineHeight: "1.5",
  letterSpacing: "0",
};

const DEFAULT_LAYOUT: ThemeLayout = {
  radius: "0.5rem",
  density: "comfortable",
};

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

/**
 * Mangaba Brand Dark (modo noite) — paleta fiel ao logo vertical.
 *
 * Cores extraídas pixel-perfect do SVG oficial "Logo Vertical com bg.svg":
 *   background  #1A0C04  — espresso profundo (tom escuro de #403731)
 *   midground   #FFDFCC  — pêssego do gradiente de fundo do logo (#FFDFCC stop@1)
 *   accent      #FF7A1A  — laranja primário do gradiente da fruta (stop@0.623)
 *   yellow      #FFD83D  — amarelo dourado do logo (stop@0.199)
 *   green       #7BBF26  — verde Mangaba (stop@1 do gradiente da fruta)
 *   deep-green  #689924  — verde folha escuro (stop@0 do gradiente da folha)
 *
 * Contraste verificado (WCAG AA):
 *   #FFDFCC on #1A0C04 → 14.8:1 ✓  (texto primário)
 *   #C8956E on #1A0C04 →  5.1:1 ✓  (texto secundário/mutedForeground)
 *   #FF7A1A on #1A0C04 →  6.9:1 ✓  (accent/primary)
 */
export const defaultTheme: DashboardTheme = {
  name: "default",
  label: "Mangaba Noite",
  description: "Modo escuro — preto puro com texto branco",
  palette: {
    background: { hex: "#000000", alpha: 1 },
    midground:  { hex: "#ffffff", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow:   "rgba(255, 255, 255, 0.06)",
    noiseOpacity: 0.5,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: VSCODE_SANS,
    fontMono: VSCODE_MONO,
    letterSpacing: "0",
  },
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    primary:           "#ffffff",
    primaryForeground: "#000000",

    card:              "#111111",
    cardForeground:    "#ffffff",
    popover:           "#0a0a0a",
    popoverForeground: "#ffffff",

    secondary:          "#1a1a1a",
    secondaryForeground:"#ffffff",
    muted:              "#1a1a1a",
    mutedForeground:    "#a0a0a0",

    accent:            "#222222",
    accentForeground:  "#ffffff",

    border: "#2a2a2a",
    input:  "#2a2a2a",
    ring:   "#ffffff",

    success:              "#ffffff",
    warning:              "#cccccc",
    destructive:          "#ff3333",
    destructiveForeground:"#ffffff",
  },
};

/**
 * Mangaba Brand Light (modo dia) — versão clara fiel ao logo.
 *
 * Cores extraídas do SVG oficial:
 *   background  #FFFCF0  — creme claro (stop@0 do gradiente de fundo)
 *   midground   #3A2E28  — marrom escuro derivado de #403731
 *   accent      #D45E00  — laranja escurecido para contraste em fundo claro
 *
 * Contraste verificado (WCAG AA):
 *   #3A2E28 on #FFFCF0 → 13.2:1 ✓  (texto primário)
 *   #6B4A3A on #FFFCF0 →  5.4:1 ✓  (texto secundário)
 *   #D45E00 on #FFFCF0 →  4.7:1 ✓  (accent/primary)
 */
export const mangabaLightTheme: DashboardTheme = {
  name: "mangaba-light",
  label: "Mangaba Dia",
  description: "Modo claro — branco puro com texto preto",
  palette: {
    background: { hex: "#ffffff", alpha: 1 },
    midground:  { hex: "#000000", alpha: 1 },
    foreground: { hex: "#000000", alpha: 0 },
    warmGlow:   "rgba(0, 0, 0, 0.04)",
    noiseOpacity: 0.2,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: VSCODE_SANS,
    fontMono: VSCODE_MONO,
    letterSpacing: "0",
  },
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    primary:           "#000000",
    primaryForeground: "#ffffff",

    card:              "#f5f5f5",
    cardForeground:    "#000000",
    popover:           "#fafafa",
    popoverForeground: "#000000",

    secondary:          "#eeeeee",
    secondaryForeground:"#000000",
    muted:              "#eeeeee",
    mutedForeground:    "#666666",

    accent:            "#e5e5e5",
    accentForeground:  "#000000",

    border: "#d4d4d4",
    input:  "#d4d4d4",
    ring:   "#000000",

    success:              "#000000",
    warning:              "#555555",
    destructive:          "#cc0000",
    destructiveForeground:"#ffffff",
  },
};

export const midnightTheme: DashboardTheme = {
  name: "midnight",
  label: "Midnight",
  description: "Deep blue-violet with cool accents",
  palette: {
    background: { hex: "#0a0a1f", alpha: 1 },
    midground: { hex: "#d4c8ff", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(167, 139, 250, 0.32)",
    noiseOpacity: 0.8,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Inter", ${SYSTEM_SANS}`,
    fontMono: `"JetBrains Mono", ${SYSTEM_MONO}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    letterSpacing: "-0.005em",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    radius: "0.75rem",
  },
};

export const emberTheme: DashboardTheme = {
  name: "ember",
  label: "Ember",
  description: "Warm crimson and bronze — forge vibes",
  palette: {
    background: { hex: "#1a0a06", alpha: 1 },
    midground: { hex: "#ffd8b0", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(249, 115, 22, 0.38)",
    noiseOpacity: 1,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Spectral", Georgia, "Times New Roman", serif`,
    fontMono: `"IBM Plex Mono", ${SYSTEM_MONO}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    radius: "0.25rem",
  },
  colorOverrides: {
    destructive: "#c92d0f",
    warning: "#f97316",
  },
};

export const monoTheme: DashboardTheme = {
  name: "mono",
  label: "Mono",
  description: "Clean grayscale — minimal and focused",
  palette: {
    background: { hex: "#0e0e0e", alpha: 1 },
    midground: { hex: "#eaeaea", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(255, 255, 255, 0.1)",
    noiseOpacity: 0.6,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"IBM Plex Sans", ${SYSTEM_SANS}`,
    fontMono: `"IBM Plex Mono", ${SYSTEM_MONO}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    radius: "0",
  },
};

export const cyberpunkTheme: DashboardTheme = {
  name: "cyberpunk",
  label: "Cyberpunk",
  description: "Neon green on black — matrix terminal",
  palette: {
    background: { hex: "#040608", alpha: 1 },
    midground: { hex: "#9bffcf", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(0, 255, 136, 0.22)",
    noiseOpacity: 1.2,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Share Tech Mono", "JetBrains Mono", ${SYSTEM_MONO}`,
    fontMono: `"Share Tech Mono", "JetBrains Mono", ${SYSTEM_MONO}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=JetBrains+Mono:wght@400;700&display=swap",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    radius: "0",
  },
  colorOverrides: {
    success: "#00ff88",
    warning: "#ffd700",
    destructive: "#ff0055",
  },
};

export const roseTheme: DashboardTheme = {
  name: "rose",
  label: "Rosé",
  description: "Soft pink and warm ivory — easy on the eyes",
  palette: {
    background: { hex: "#1a0f15", alpha: 1 },
    midground: { hex: "#ffd4e1", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(249, 168, 212, 0.3)",
    noiseOpacity: 0.9,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Fraunces", Georgia, serif`,
    fontMono: `"DM Mono", ${SYSTEM_MONO}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Mono:wght@400;500&display=swap",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    radius: "1rem",
  },
};

/**
 * Same look as ``defaultTheme`` but with a larger root font size, looser
 * line-height, and ``spacious`` density so every rem-based size in the
 * dashboard scales up. For users who find the default 15px UI too dense.
 */
export const defaultLargeTheme: DashboardTheme = {
  name: "default-large",
  label: "Mangaba Teal (Large)",
  description: "Mangaba Teal with bigger fonts and roomier spacing",
  palette: defaultTheme.palette,
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    baseSize: "18px",
    lineHeight: "1.65",
  },
  layout: {
    ...DEFAULT_LAYOUT,
    density: "spacious",
  },
};

/**
 * Claude AI / Mangaba — Official brand palette.
 *
 * Values sourced pixel-perfect from:
 *   mangaba.chat · mangaba-voice.tech · mangabapixel.online
 *
 *   --bg          #1C1917  warm near-black canvas
 *   --accent      #D97757  coral / terracotta — the brand signature hue
 *   --surface     #2D2A28  elevated surfaces (cards)
 *   --sidebar     #252220  sidebar / secondary surface
 *   --border      #3A3430  subtle warm border
 *   --leaf        #6B9540  Mangaba green — secondary accent
 *   Font: Inter (same as mangaba.chat / claude.ai)
 */
export const claudeTheme: DashboardTheme = {
  name: "claude",
  label: "Claude AI",
  description: "Paleta oficial Mangaba/Claude — coral & cream em fundo escuro quente",
  palette: {
    /* Exact --bg value used across all three Mangaba sites. */
    background: { hex: "#1C1917", alpha: 1 },
    /* Warm cream — hsl(48 23% 95%) from mangaba.chat --foreground dark mode. */
    midground:  { hex: "#F5EEE4", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    /* Coral glow matching --accent #D97757. */
    warmGlow:   "rgba(217, 119, 87, 0.28)",
    noiseOpacity: 0.65,
  },
  typography: {
    /* Inter — exact font used on mangaba.chat & mangaba-voice.tech.
       Weight range matches their Google Fonts import (300–700). */
    fontSans:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontMono:
      '"JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace',
    fontDisplay:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap",
    baseSize: "15px",
    lineHeight: "1.6",
    letterSpacing: "-0.01em",
  },
  layout: {
    /* --radius:0.5rem from mangaba.chat globals. */
    radius: "0.5rem",
    density: "comfortable",
  },
  colorOverrides: {
    /* ── Primary ─────────────────────────────────────────────────────── */
    /* --accent: #D97757 (mangabapixel & mangaba.chat --primary dark). */
    primary:            "#D97757",
    primaryForeground:  "#ffffff",

    /* ── Surfaces ────────────────────────────────────────────────────── */
    /* --surface: #2D2A28 · --sidebar: #252220 */
    card:               "#2D2A28",
    cardForeground:     "#F5EEE4",
    popover:            "#252220",
    popoverForeground:  "#F5EEE4",

    /* ── Secondary / muted ───────────────────────────────────────────── */
    secondary:          "#252220",
    secondaryForeground:"#C4B9B0",
    muted:              "#252220",
    /* hsl(30 6% 64%) from mangaba.chat --muted-foreground dark. */
    mutedForeground:    "#A49890",

    /* ── Accent tints ────────────────────────────────────────────────── */
    /* --accent-soft: #2E1F18 (mangabapixel soft coral bg). */
    accent:             "#2E1F18",
    accentForeground:   "#D97757",

    /* ── Borders & ring ──────────────────────────────────────────────── */
    /* --border: #3A3430 · --hover: #302C28 */
    border:             "#3A3430",
    input:              "#3A3430",
    ring:               "#D97757",

    /* ── Status ──────────────────────────────────────────────────────── */
    destructive:            "#E05C3A",
    destructiveForeground:  "#ffffff",
    /* --leaf: #6B9540 — Mangaba green for success states. */
    success:            "#6B9540",
    warning:            "#E6A135",
  },
};

export const BUILTIN_THEMES: Record<string, DashboardTheme> = {
  default: defaultTheme,
  "mangaba-light": mangabaLightTheme,
  "default-large": defaultLargeTheme,
  claude: claudeTheme,
  midnight: midnightTheme,
  ember: emberTheme,
  mono: monoTheme,
  cyberpunk: cyberpunkTheme,
  rose: roseTheme,
};
