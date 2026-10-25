"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { statsFor, subscribeProgress, todayReadIds } from "@/lib/progress";
import { cn } from "@/lib/utils";

/** The habit, visible without opening the sidebar. Reads device-local progress. */
export function HeaderStreak() {
  const [current, setCurrent] = useState(0);
  const [today, setToday] = useState(0);

  useEffect(() => {
    const sync = () => {
      setCurrent(statsFor().current);
      setToday(todayReadIds().size);
    };
    sync();
    return subscribeProgress(sync);
  }, []);

  return (
    <Link
      href="/#brief"
      aria-label={`Your streak: ${current} ${current === 1 ? "day" : "days"}, ${today} read today`}
      title={current ? `${current}-day streak · ${today} read today` : "Read one story to start a streak"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-primary",
        current > 0 ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Flame className={cn("size-3", current === 0 && "opacity-60")} />
      <span className="stat-tick tabular-nums">{current}</span>
      <span className="hidden sm:inline">{current === 1 ? "day" : "days"}</span>
    </Link>
  );
}
