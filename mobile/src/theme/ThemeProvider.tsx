import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type Palette } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "tb.theme.mode";
let restoredMode: ThemeMode = "dark";

export async function hydrateTheme(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      restoredMode = stored;
    }
  } catch {
    // A missing preference is not an error; dark is the default.
  }
}

interface ThemeValue {
  /** What the reader chose. `system` follows the OS. */
  mode: ThemeMode;
  /** The scheme actually in force. */
  scheme: "light" | "dark";
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
  /** Flip to the opposite of what is on screen, pinning it. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // Default to dark — matches the web app's defaultTheme="dark" and the
  // premium dark-first design aesthetic. Users can override via the toggle.
  const [mode, setModeState] = useState<ThemeMode>(restoredMode);

  const scheme: "light" | "dark" =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  const colors = scheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    // Matches the Android window behind the app so rotation and the recents
    // card do not flash white.
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const setMode = useCallback((next: ThemeMode) => {
    restoredMode = next;
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(scheme === "dark" ? "light" : "dark");
  }, [scheme, setMode]);

  const value = useMemo<ThemeValue>(
    () => ({ mode, scheme, colors, setMode, toggle }),
    [mode, scheme, colors, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
