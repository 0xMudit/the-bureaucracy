/**
 * Design tokens, ported from the web app's `app/globals.css`.
 *
 * The web uses OKLCH; React Native only understands sRGB, so the palette below
 * is the computed hex equivalent of each token. Keep them in sync if the web
 * palette moves.
 */

export const lightColors = {
  background: "#F8F5EF",
  card: "#FDFBF7",
  popover: "#FDFCF9",
  foreground: "#1B1612",
  primary: "#BD191D",
  primaryForeground: "#FAF6EF",
  secondary: "#EEE9DF",
  secondaryForeground: "#2A241E",
  muted: "#EFEBE3",
  mutedForeground: "#645A52",
  accent: "#F2E4CF",
  accentForeground: "#281E17",
  destructive: "#CF171E",
  border: "#D9D3C8",
  input: "#D9D3C8",
  warn: "#C38323",
  success: "#358264",
  sidebar: "#F4F1EA",
} as const;

export const darkColors: { [K in keyof typeof lightColors]: string } = {
  background: "#130F0C",
  card: "#1B1613",
  popover: "#1D1815",
  foreground: "#EBE7E0",
  primary: "#E44A42",
  primaryForeground: "#110C09",
  secondary: "#27221E",
  secondaryForeground: "#E4E1DA",
  muted: "#25201C",
  mutedForeground: "#A59F95",
  accent: "#35221E",
  accentForeground: "#EDE7DD",
  destructive: "#ED4B43",
  border: "#342E29",
  input: "#3B342E",
  warn: "#E09F45",
  success: "#55AC89",
  sidebar: "#17130F",
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
