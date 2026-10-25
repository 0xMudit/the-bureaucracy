/**
 * Design tokens, ported from the web app's `app/globals.css`.
 *
 * The web uses OKLCH; React Native only understands sRGB, so the palette below
 * is the computed hex equivalent of each token. Keep them in sync if the web
 * palette moves.
 */

export const lightColors = {
  background: "#F8F7F3",
  card: "#FEFDFB",
  popover: "#FFFDFB",
  foreground: "#211E19",
  primary: "#A9271F",
  primaryForeground: "#FFF8F4",
  secondary: "#EFEDE5",
  secondaryForeground: "#2D2A24",
  muted: "#F0EEE7",
  mutedForeground: "#69635A",
  accent: "#F2E7DB",
  accentForeground: "#3A302A",
  destructive: "#B3261E",
  border: "#DFDAD0",
  input: "#D8D2C7",
  warn: "#8A5A00",
  success: "#1D6E46",
  sidebar: "#F3F1EA",
} as const;

export const darkColors: { [K in keyof typeof lightColors]: string } = {
  background: "#171410",
  card: "#201C18",
  popover: "#24201B",
  foreground: "#F2EDE5",
  primary: "#F06A60",
  primaryForeground: "#1A0E0C",
  secondary: "#2B2621",
  secondaryForeground: "#EEE8DF",
  muted: "#28231E",
  mutedForeground: "#B8AEA1",
  accent: "#3B241F",
  accentForeground: "#FBEDE9",
  destructive: "#FF6B61",
  border: "#3A332C",
  input: "#453C34",
  warn: "#E6A23C",
  success: "#5BD39A",
  sidebar: "#1B1713",
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
