"use client";

import * as React from "react";

const SESSION_KEY = "tb.opened";

/**
 * A one-second reading-room curtain.
 *
 * Design contract:
 * - The real page is already rendering underneath; this is a curtain, not a
 *   loading gate. It never delays data or interaction.
 * - Runs once per browser session, identified by sessionStorage.
 * - Removed instantly for users who prefer reduced motion.
 * - Never renders on the server (initialises as `null` / hidden) to avoid an
 *   SSR flash or hydration mismatch.
 *
 * Timing:
 *   0ms   — curtain appears (instant, page is behind it)
 *   1000ms — curtain starts leaving (tb-curtain-out)
 *   1230ms — curtain unmounts from the DOM entirely
 */
export function OpeningSequence() {
  // `null` = not yet determined (server + first paint). `true` = show. `false` = hidden.
  const [state, setState] = React.useState<"pending" | "visible" | "leaving" | "done">("pending");

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alreadyOpened = false;
    try {
      alreadyOpened = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Private mode or storage quota exceeded — treat as first visit.
    }

    if (reduced || alreadyOpened) {
      setState("done");
      return;
    }

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Best-effort; show the animation for this render only.
    }

    // Show the curtain
    setState("visible");

    const leaveTimer = window.setTimeout(() => setState("leaving"), 1000);
    const doneTimer = window.setTimeout(() => setState("done"), 1230);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // `pending` and `done` both render nothing. `pending` is only briefly true
  // during the very first client paint (before the effect fires), so there is
  // no visible flash.
  if (state === "pending" || state === "done") return null;

  return (
    <div
      className="tb-opening pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
      data-leaving={state === "leaving" ? "true" : "false"}
      aria-hidden="true"
    >
      {/* Paper grain texture */}
      <div className="absolute inset-0 paper-grain opacity-60" />

      {/* Top and bottom rules */}
      <div className="absolute inset-x-0 top-0 h-px bg-foreground/25" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/25" />

      {/* Vertical light wash */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-primary/10 to-transparent"
        aria-hidden
      />

      <div className="relative w-full max-w-2xl px-6 sm:px-10">
        {/* Eyebrow */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground uppercase">
            Est. for the civil services
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-primary uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        </div>

        {/* Wordmark */}
        <div className="tb-opening-wordmark mt-3">
          <p className="display text-[clamp(2.4rem,8vw,4.6rem)] leading-[0.92] tracking-[-0.04em]">
            The Bureaucracy
          </p>
        </div>

        {/* Rule with Today's five label */}
        <div className="tb-opening-rule mt-4 flex items-center gap-2">
          <span className="h-0.5 flex-1 bg-foreground" />
          <span className="font-mono text-[9px] tracking-[0.2em] text-primary uppercase">Today&apos;s five</span>
          <span className="h-px flex-[0.4] bg-border" />
        </div>

        {/* Ghost story list */}
        <div className="mt-6 grid gap-5 sm:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-3">
            {([100, 92, 96, 84, 90] as const).map((width, index) => (
              <div
                key={width}
                className="tb-opening-line flex items-start gap-3"
                style={{ animationDelay: `${180 + index * 55}ms` }}
              >
                <span className="mt-1 font-mono text-[9px] text-primary/70">0{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block h-2 rounded-sm bg-foreground/15" style={{ width: `${width}%` }} />
                  <span
                    className="block h-1.5 rounded-sm bg-foreground/10"
                    style={{ width: `${Math.max(35, width - 28)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden border-l border-border pl-5 sm:block">
            <span className="block h-1.5 w-14 rounded-sm bg-primary/50" />
            <div className="mt-3 space-y-2">
              {([90, 76, 84, 60] as const).map((width, index) => (
                <span
                  key={width}
                  className="tb-opening-line block h-1.5 rounded-sm bg-foreground/10"
                  style={{ width: `${width}%`, animationDelay: `${260 + index * 50}ms` }}
                />
              ))}
            </div>
            <p className="mt-5 font-mono text-[8px] leading-relaxed tracking-[0.12em] text-muted-foreground uppercase">
              Ranked for the syllabus.
              <br />
              Revised every 24 hours.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-7 flex items-center justify-between gap-4">
          <p className="font-mono text-[8.5px] tracking-[0.16em] text-muted-foreground uppercase">
            Setting the day&apos;s wire
          </p>
          <div className="h-px flex-1 overflow-hidden bg-border">
            <div className="tb-opening-progress h-px origin-left bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
