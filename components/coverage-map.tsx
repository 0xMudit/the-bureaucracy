"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";
import { coverageRows, type CoverageRow } from "@/lib/coverage";
import { subscribeProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

function gapLabel(row: CoverageRow): string {
  if (row.gapDays === null) return "untouched";
  if (row.gapDays === 0) return "today";
  if (row.gapDays === 1) return "yesterday";
  return `${row.gapDays}d gap`;
}

/**
 * Where the reader has stopped reading. Once this has two weeks of data it is
 * the strongest reason to come back: leaving means losing the map.
 */
export function CoverageMap() {
  const [rows, setRows] = useState<CoverageRow[] | null>(null);

  useEffect(() => {
    const sync = () => setRows(coverageRows());
    sync();
    return subscribeProgress(sync);
  }, []);

  if (!rows) return <div className="h-[132px] border border-border bg-card" aria-hidden />;

  const touched = rows.filter((row) => row.reads > 0).length;
  const shown = rows.slice(0, 6);

  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
          <Map className="size-3 text-muted-foreground" /> Coverage
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {touched}/{rows.length} themes
        </span>
      </div>

      {touched === 0 ? (
        <p className="px-3 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          Read one story and this becomes a map of what you have covered. The gap is the useful part.
        </p>
      ) : (
        <div className="space-y-2 px-3 py-3">
          {shown.map((row) => (
            <Link key={row.id} href={`/?topic=${row.id}`} className="group block">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-muted-foreground group-hover:text-foreground">
                  {row.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-[8.5px] uppercase tracking-[0.08em]",
                    row.status === "untouched" || row.status === "cold"
                      ? "text-primary"
                      : "text-muted-foreground/80",
                  )}
                >
                  {gapLabel(row)}
                </span>
              </div>
              <div className="mt-1 h-1 w-full bg-muted">
                <div
                  className={cn("h-1 transition-all group-hover:bg-primary", row.reads > 0 ? "bg-primary/70" : "bg-transparent")}
                  style={{ width: `${row.reads > 0 ? Math.max(6, Math.round((Math.min(row.reads, 5) / 5) * 100)) : 0}%` }}
                />
              </div>
            </Link>
          ))}
          <p className="pt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground/80">
            Widest gap first · last 14 days · on this device
          </p>
        </div>
      )}

      <Link
        href="/syllabus"
        className="flex items-center justify-between border-t border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
      >
        Open the syllabus map <ArrowRight className="size-3" />
      </Link>
    </section>
  );
}
