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
 * Mangaba Brand Dark — paleta fiel ao logo vertical.
 *
 * Cores extraídas do SVG oficial:
 *   background  #1E0F06  — espresso escuro derivado do marrom #403731
 *   midground   #FFDFCC  — pêssego claro do gradiente de fundo do logo
 *   accent      #FF7A1A  — laranja primário do gradiente da chama/fruta
 *   yellow      #FFD83D  — amarelo dourado do logo
 *   green       #7BBF26  — verde Mangaba do logo
 *   deep-green  #689924  — verde folha escuro
 *   text-dark   #403731  — marrom do logotipo ("mangaba")
 */
export const defaultTheme: DashboardTheme = {
  name: "default",
  label: "Mangaba Brand",
  description: "Paleta oficial do logo — espresso + laranja + verde Mangaba",
  palette: {
    background: { hex: "#1E0F06", alpha: 1 },
    midground: { hex: "#FFDFCC", alpha: 1 },
    foreground: { hex: "#ffffff", alpha: 0 },
    warmGlow: "rgba(255, 122, 26, 0.32)",
    noiseOpacity: 0.9,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Inter", ${SYSTEM_SANS}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    letterSpacing: "-0.01em",
  },
  layout: { ...DEFAULT_LAYOUT, radius: "0.625rem" },
  colorOverrides: {
    primary:           "#FF7A1A",
    primaryForeground: "#ffffff",

    card:              "#2B1508",
    cardForeground:    "#FFDFCC",
    popover:           "#231006",
    popoverForeground: "#FFDFCC",

    secondary:          "#2B1508",
    secondaryForeground:"#E8B99A",
    muted:              "#2B1508",
    mutedForeground:    "#C2896A",

    accent:            "#3D1A07",
    accentForeground:  "#FF7A1A",

    border: "#3D2010",
    input:  "#3D2010",
    ring:   "#FF7A1A",

    success:     "#7BBF26",
    warning:     "#FFD83D",
    destructive: "#E94A12",
    destructiveForeground: "#ffffff",
  },
};

/**
 * Mangaba Brand Light — versão clara fiel ao logo.
 * Fundo creme (#FFFCF0), texto marrom (#403731), laranja como acento.
 */
export const mangabaLightTheme: DashboardTheme = {
  name: "mangaba-light",
  label: "Mangaba Light",
  description: "Tema claro com o creme e marrom do logo oficial",
  palette: {
    background: { hex: "#FFFCF0", alpha: 1 },
    midground: { hex: "#403731", alpha: 1 },
    foreground: { hex: "#000000", alpha: 0 },
    warmGlow: "rgba(255, 122, 26, 0.18)",
    noiseOpacity: 0.4,
  },
  typography: {
    ...DEFAULT_TYPOGRAPHY,
    fontSans: `"Inter", ${SYSTEM_SANS}`,
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    letterSpacing: "-0.01em",
  },
  layout: { ...DEFAULT_LAYOUT, radius: "0.625rem" },
  colorOverrides: {
    primary:           "#FF7A1A",
    primaryForeground: "#ffffff",

    card:              "#FFF4E6",
    cardForeground:    "#403731",
    popover:           "#FFF8F0",
    popoverForeground: "#403731",

    secondary:          "#FFE8D0",
    secondaryForeground:"#5C3D2E",
    muted:              "#FFE8D0",
    mutedForeground:    "#7A5548",

    accent:            "#FFDCC2",
    accentForeground:  "#D45A00",

    border: "#E8C9A8",
    input:  "#E8C9A8",
    ring:   "#FF7A1A",

    success:     "#689924",
    warning:     "#E6B800",
    destructive: "#E94A12",
    destructiveForeground: "#ffffff",
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
