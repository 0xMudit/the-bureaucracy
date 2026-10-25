"use client";

import * as React from "react";

const KEY = "tb.opened";

/**
 * A one-second reading-room curtain. The real page is already rendering
 * underneath this overlay, so the animation never delays data or interaction.
 * It runs once per browser session, and is removed instantly for readers who
 * prefer reduced motion.
 */
export function OpeningSequence() {
  const [visible, setVisible] = React.useState(true);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alreadyOpened = false;
    try {
      alreadyOpened = window.sessionStorage.getItem(KEY) === "1";
    } catch {
      alreadyOpened = false;
    }

    if (reduced || alreadyOpened) {
      setVisible(false);
      return;
    }

    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // Private mode or storage disabled: show it once for this render only.
    }

    const leave = window.setTimeout(() => setLeaving(true), 1000);
    const remove = window.setTimeout(() => setVisible(false), 1230);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="tb-opening pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
      data-leaving={leaving ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="absolute inset-0 paper-grain opacity-60" />
      <div className="absolute inset-x-0 top-0 h-px bg-foreground/25" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/25" />
      <div
        className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-primary/10 to-transparent"
        aria-hidden
      />

      <div className="relative w-full max-w-2xl px-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.28em] text-muted-foreground uppercase">
            Est. for the civil services
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-primary uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        </div>

        <div className="tb-opening-wordmark mt-3">
          <p className="display text-[clamp(2.4rem,8vw,4.6rem)] leading-[0.92] tracking-[-0.04em]">
            The Bureaucracy
          </p>
        </div>

        <div className="tb-opening-rule mt-4 flex items-center gap-2">
          <span className="h-0.5 flex-1 bg-foreground" />
          <span className="font-mono text-[9px] tracking-[0.2em] text-primary uppercase">Today’s five</span>
          <span className="h-px flex-[0.4] bg-border" />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-3">
            {[100, 92, 96, 84, 90].map((width, index) => (
              <div
                key={width}
                className="tb-opening-line flex items-start gap-3"
                style={{ animationDelay: `${180 + index * 55}ms` }}
              >
                <span className="mt-1 font-mono text-[9px] text-primary/70">0{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block h-2 rounded-sm bg-foreground/15" style={{ width: `${width}%` }} />
                  <span className="block h-1.5 rounded-sm bg-foreground/10" style={{ width: `${Math.max(35, width - 28)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden border-l border-border pl-5 sm:block">
            <span className="block h-1.5 w-14 rounded-sm bg-primary/50" />
            <div className="mt-3 space-y-2">
              {[90, 76, 84, 60].map((width, index) => (
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

        <div className="mt-7 flex items-center justify-between gap-4">
          <p className="font-mono text-[8.5px] tracking-[0.16em] text-muted-foreground uppercase">
            Setting the day’s wire
          </p>
          <div className="h-px flex-1 overflow-hidden bg-border">
            <div className="tb-opening-progress h-px origin-left bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
