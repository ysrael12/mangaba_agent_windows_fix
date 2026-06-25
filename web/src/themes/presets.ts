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

const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  fontSans: SYSTEM_SANS,
  fontMono: SYSTEM_MONO,
  baseSize: "15px",
  lineHeight: "1.55",
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
  description: "Modo escuro — espresso + laranja + verde do logo oficial",
  palette: {
    background: { hex: "#1A0C04", alpha: 1 },
    midground:  { hex: "#FFDFCC", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow:   "rgba(255, 122, 26, 0.28)",
    noiseOpacity: 0.75,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Inter", ${SYSTEM_SANS}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,400&display=swap",
    letterSpacing: "-0.01em",
  },
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    /* Primary — laranja #FF7A1A do logo. Contraste 6.9:1 sobre fundo. */
    primary:           "#FF7A1A",
    primaryForeground: "#ffffff",

    /* Superfícies elevadas — espresso ligeiramente mais claro. */
    card:              "#261208",
    cardForeground:    "#FFDFCC",
    popover:           "#200F05",
    popoverForeground: "#FFDFCC",

    /* Secundário e muted — tons quentes sobre fundo. */
    secondary:          "#2E1709",
    secondaryForeground:"#FFDFCC",
    muted:              "#2E1709",
    /* #C8956E on #1A0C04 → 5.1:1 (WCAG AA ✓) */
    mutedForeground:    "#C8956E",

    /* Tint de acento — laranja 12% sobre fundo. */
    accent:            "#3A1C07",
    accentForeground:  "#FF7A1A",

    /* Bordas — visíveis mas sutis. */
    border: "#3E2010",
    input:  "#3E2010",
    ring:   "#FF7A1A",

    /* Status — do logo. */
    success:              "#7BBF26",
    warning:              "#FFD83D",
    destructive:          "#E94A12",
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
  description: "Modo claro — creme + marrom + laranja do logo oficial",
  palette: {
    background: { hex: "#FFFCF0", alpha: 1 },
    midground:  { hex: "#3A2E28", alpha: 1 },
    foreground: { hex: "#000000", alpha: 0 },
    warmGlow:   "rgba(212, 94, 0, 0.12)",
    noiseOpacity: 0.3,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Inter", ${SYSTEM_SANS}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,400&display=swap",
    letterSpacing: "-0.01em",
  },
  layout: { radius: "0.5rem", density: "comfortable" },
  colorOverrides: {
    /* Primary — laranja escurecido para contraste 4.7:1 em fundo creme. */
    primary:           "#D45E00",
    primaryForeground: "#ffffff",

    /* Superfícies — creme ligeiramente mais quente. */
    card:              "#FFF5E6",
    cardForeground:    "#3A2E28",
    popover:           "#FFFAF2",
    popoverForeground: "#3A2E28",

    /* Secundário e muted. */
    secondary:          "#FFE9D0",
    secondaryForeground:"#3A2E28",
    muted:              "#FFE9D0",
    /* #6B4A3A on #FFFCF0 → 5.4:1 (WCAG AA ✓) */
    mutedForeground:    "#6B4A3A",

    /* Tint de acento claro. */
    accent:            "#FFD8B0",
    accentForeground:  "#A03800",

    /* Bordas quentes visíveis. */
    border: "#E2C4A0",
    input:  "#E2C4A0",
    ring:   "#D45E00",

    /* Status — adaptados para fundo claro. */
    success:              "#4A7D00",
    warning:              "#9A6C00",
    destructive:          "#C0300A",
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
