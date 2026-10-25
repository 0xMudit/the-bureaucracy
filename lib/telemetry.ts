"use client";

/**
 * First-party funnel events. They ride the existing /api/track endpoint as a
 * synthetic path so no schema change and no third party is involved. Fire and
 * forget: telemetry must never block a reader action.
 */
export type FunnelEvent =
  | "desk_set"
  | "desk_skip"
  | "brief_open"
  | "story_read"
  | "brief_complete"
  | "reveal"
  | "quiz_complete"
  | "share"
  | "reminder"
  | "install_hint";

export function trackEvent(event: FunnelEvent, detail?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(detail ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value).slice(0, 40));
  }
  const suffix = params.toString();
  const path = `/_event/${event}${suffix ? `?${suffix}` : ""}`;
  const payload = JSON.stringify({ path, referrer: null });
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
