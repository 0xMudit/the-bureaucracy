"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Keeps the browser chrome (and iOS PWA status bar) in sync with the active
 * theme. Next.js emits two `<meta name="theme-color">` tags in the viewport
 * export — one with `media="(prefers-color-scheme: light)"` and one with
 * `media="(prefers-color-scheme: dark)"`. Those are correct for the OS-level
 * system default, but once a reader explicitly overrides the theme we need a
 * *third*, non-media-conditional tag that wins over both. We **never remove**
 * the original two tags: other code may depend on them and removing them causes
 * a one-frame flash on PWA re-open.
 */
const COLORS = {
  light: "#f8f7f3",
  dark: "#171410",
} as const;

const META_ID = "tb-theme-color-override";

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const value = COLORS[resolvedTheme];

    // Find or create the override tag (identified by a data-id so we never
    // touch the server-rendered media-conditional tags).
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="theme-color"][data-id="${META_ID}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute("data-id", META_ID);
      // Insert *after* the existing theme-color tags so it takes precedence
      // (browsers use the last matching tag when media queries tie).
      const existing = document.querySelectorAll('meta[name="theme-color"]');
      const last = existing[existing.length - 1];
      if (last?.parentNode) {
        last.parentNode.insertBefore(meta, last.nextSibling);
      } else {
        document.head.appendChild(meta);
      }
    }
    meta.content = value;

    // iOS reads the status-bar style from this meta tag in standalone PWA mode.
    const status = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (status) {
      status.content = resolvedTheme === "dark" ? "black-translucent" : "default";
    }
  }, [resolvedTheme]);

  return null;
}
