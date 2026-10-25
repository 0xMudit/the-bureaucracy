/**
 * Design tokens, ported from the web app's `app/globals.css`.
 *
 * The web uses OKLCH; React Native only understands sRGB, so the palette below
 * is the computed hex equivalent of each token. Keep them in sync if the web
 * palette moves.
 */

export const lightColors = {
  background: "#0F0D0B",
  card: "#171412",
  popover: "#1F1B18",
  foreground: "#F7F3EE",
  primary: "#FF3B30",
  primaryForeground: "#FFFFFF",
  secondary: "#25201D",
  secondaryForeground: "#F7F3EE",
  muted: "#1D1916",
  mutedForeground: "#A99F94",
  accent: "#2A1815",
  accentForeground: "#FFE5E2",
  destructive: "#FF453A",
  border: "#2C2622",
  input: "#2C2622",
  warn: "#FF9F0A",
  success: "#30D158",
  sidebar: "#14100D",
} as const;

export const darkColors: { [K in keyof typeof lightColors]: string } = {
  background: "#0F0D0B",
  card: "#171412",
  popover: "#1F1B18",
  foreground: "#F7F3EE",
  primary: "#FF3B30",
  primaryForeground: "#FFFFFF",
  secondary: "#25201D",
  secondaryForeground: "#F7F3EE",
  muted: "#1D1916",
  mutedForeground: "#A99F94",
  accent: "#2A1815",
  accentForeground: "#FFE5E2",
  destructive: "#FF453A",
  border: "#2C2622",
  input: "#2C2622",
  warn: "#FF9F0A",
  success: "#30D158",
  sidebar: "#14100D",
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
