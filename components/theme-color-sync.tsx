"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * `viewport.themeColor` can only describe the operating-system preference.
 * Once a reader overrides the theme we need the browser chrome (and the iOS
 * status bar in a standalone PWA) to follow the *chosen* surface, otherwise a
 * dark app sits under a light address bar. This keeps the meta tag in sync
 * with the class next-themes writes to <html>.
 */
const COLORS = {
  light: "#f8f7f3",
  dark: "#171410",
} as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const value = COLORS[resolvedTheme];

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = value;
    meta.removeAttribute("media");

    // iOS reads the status-bar style from the web-app meta tags.
    const status = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (status) status.content = resolvedTheme === "dark" ? "black-translucent" : "default";
  }, [resolvedTheme]);

  return null;
}
