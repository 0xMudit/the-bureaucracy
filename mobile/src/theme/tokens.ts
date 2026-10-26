/**
 * Design tokens for the mobile app — kept in sync with `app/globals.css`.
 *
 * The web uses OKLCH CSS variables; React Native only understands sRGB hex.
 * The values below are the computed hex equivalents of the Soho-inspired
 * design system (zinc-based, premium neutral dark palette).
 *
 * Dark is the default theme. Light mode is warm paper / editorial.
 *
 * To update: convert the OKLCH values from globals.css at oklch.com
 */

export const lightColors = {
  /* oklch(0.980 0.004 80) */
  background: "#F9F8F5",
  /* oklch(1.000 0.000 0) */
  card: "#FFFFFF",
  /* oklch(1.000 0.000 0) */
  popover: "#FFFFFF",
  /* oklch(0.145 0.010 55) */
  foreground: "#1C1A17",
  /* oklch(0.205 0.000 0) — near-black for Soho-style primary */
  primary: "#292929",
  /* oklch(0.985 0.000 0) */
  primaryForeground: "#FAFAFA",
  /* oklch(0.960 0.005 80) */
  secondary: "#F4F3EF",
  /* oklch(0.205 0.000 0) */
  secondaryForeground: "#292929",
  /* oklch(0.960 0.005 80) */
  muted: "#F4F3EF",
  /* oklch(0.380 0.012 60) */
  mutedForeground: "#514D46",
  /* oklch(0.960 0.005 80) */
  accent: "#F4F3EF",
  /* oklch(0.205 0.000 0) */
  accentForeground: "#292929",
  /* oklch(0.577 0.245 27.325) */
  destructive: "#DC2626",
  /* oklch(0.922 0.006 78) */
  border: "#E7E5DF",
  /* oklch(0.922 0.006 78) */
  input: "#E7E5DF",
  /* oklch(0.55 0.14 72) */
  warn: "#8A5A00",
  /* oklch(0.52 0.13 156) */
  success: "#1D7A50",
  /* oklch(0.985 0.002 75) */
  sidebar: "#F9F8F6",
} as const;

export const darkColors: { [K in keyof typeof lightColors]: string } = {
  /* oklch(0.145 0.000 0) — deep zinc, true dark */
  background: "#1C1C1C",
  /* oklch(0.205 0.000 0) */
  card: "#292929",
  /* oklch(0.205 0.000 0) */
  popover: "#292929",
  /* oklch(0.985 0.000 0) — near-white foreground, high contrast */
  foreground: "#FAFAFA",
  /* oklch(0.985 0.000 0) — white primary in dark (Soho style) */
  primary: "#FAFAFA",
  /* oklch(0.205 0.000 0) */
  primaryForeground: "#292929",
  /* oklch(0.269 0.000 0) */
  secondary: "#363636",
  /* oklch(0.985 0.000 0) */
  secondaryForeground: "#FAFAFA",
  /* oklch(0.269 0.000 0) */
  muted: "#363636",
  /* oklch(0.708 0.000 0) */
  mutedForeground: "#A3A3A3",
  /* oklch(0.269 0.000 0) */
  accent: "#363636",
  /* oklch(0.985 0.000 0) */
  accentForeground: "#FAFAFA",
  /* oklch(0.704 0.191 22.216) */
  destructive: "#F87171",
  /* oklch(1.000 0.000 0 / 10%) on dark card */
  border: "#3D3D3D",
  /* oklch(1.000 0.000 0 / 15%) */
  input: "#474747",
  /* oklch(0.78 0.13 72) */
  warn: "#D4A843",
  /* oklch(0.72 0.13 156) */
  success: "#4ADE80",
  /* oklch(0.205 0.000 0) */
  sidebar: "#292929",
};

export type Palette = { [K in keyof typeof lightColors]: string };

/** Font families registered in `src/app/_layout.tsx`. */
export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 3,
  md: 6,
  lg: 10,
} as const;

/** Letterspacing is in points in React Native, not em. */
export const type = {
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 24,
  },
  summary: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  ui: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export const priorityColor = (priority: string, palette: Palette): string => {
  if (priority === "high") return palette.primary;
  if (priority === "medium") return palette.warn;
  return palette.mutedForeground;
};
