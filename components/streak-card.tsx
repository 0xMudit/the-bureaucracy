"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import {
  dayReadCounts,
  istDateKey,
  readBrief,
  statsFor,
  subscribeProgress,
  todayReadIds,
  type ProgressStats,
} from "@/lib/progress";
import { cn } from "@/lib/utils";

function lastDays(count: number): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const key = istDateKey(new Date(Date.now() - offset * 86_400_000));
    const [year, month, day] = key.split("-").map(Number);
    const label = new Intl.DateTimeFormat("en-IN", {
      weekday: "narrow",
      timeZone: "Asia/Kolkata",
    }).format(new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12)));
    days.push({ key, label });
  }
  return days;
}

export function StreakCard() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [briefDone, setBriefDone] = useState(0);
  const [briefTotal, setBriefTotal] = useState(0);
  const [days, setDays] = useState<{ key: string; label: string }[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const sync = () => {
      setStats(statsFor());
      const ids = todayReadIds();
      setCounts(dayReadCounts());
      const brief = readBrief(istDateKey()) ?? [];
      setBriefTotal(brief.length);
      setBriefDone(brief.filter((entry) => ids.has(entry.id)).length);
      setDays(lastDays(7));
    };
    sync();
    return subscribeProgress(sync);
  }, []);

  if (!stats) {
    return <div className="h-[132px] border border-border bg-card" aria-hidden />;
  }

  const started = stats.current > 0 || stats.todayRead > 0;

  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
          <Flame className={cn("size-3", started ? "text-primary" : "text-muted-foreground")} /> Your streak
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {stats.todayRead} {stats.todayRead === 1 ? "read" : "reads"} today
        </span>
      </div>

      <div className="px-3 py-3">
        <div className="flex items-end justify-between gap-2">
          <p className="display text-[2rem] leading-none">
            {started ? stats.current : "0"}
            <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {stats.current === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="text-right font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
            {briefTotal > 0 ? `${briefDone} of ${briefTotal} in your brief` : "brief not opened yet"}
          </p>
        </div>

        {stats.totalRead > 0 ? (
          <div className="mt-2 flex items-center gap-1">
            {days.map((day) => {
              const count = counts[day.key] ?? 0;
              const isToday = day.key === istDateKey();
              return (
                <span key={day.key} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-full transition-colors",
                      count > 0 ? "bg-primary" : "bg-muted",
                      isToday && count > 0 && "bg-primary",
                    )}
                    title={`${count} ${count === 1 ? "read" : "reads"}`}
                  />
                  <span
                    className={cn(
                      "font-mono text-[8px] uppercase",
                      isToday ? "text-foreground" : "text-muted-foreground/70",
                    )}
                  >
                    {day.label}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {started
            ? stats.todayRead > 0
              ? "Logged for today. One story is enough to keep the chain."
              : "You have not read today. One story keeps the chain."
            : "Read one story to start. No account, no email, no streak guilt."}
        </p>

        <Link
          href="/#brief"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
        >
          Open today&apos;s five <ArrowRight className="size-3" />
        </Link>
      </div>
    </section>
  );
}
