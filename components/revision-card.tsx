"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, RotateCcw } from "lucide-react";
import { dueRevisions, markRevised, type DueRevision } from "@/lib/revision";
import { SAVED_EVENT } from "@/lib/saved";
import { PROGRESS_EVENT } from "@/lib/progress";

function ageCopy(days: number): string {
  if (days <= 0) return "saved today";
  if (days === 1) return "saved yesterday";
  return `saved ${days} days ago`;
}

/**
 * Day 1, 3, 7 and 30. Only appears when something is actually due, so it never
 * becomes another badge to ignore.
 */
export function RevisionCard() {
  const [due, setDue] = useState<DueRevision[] | null>(null);

  useEffect(() => {
    const sync = () => setDue(dueRevisions());
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    const timer = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(timer);
    };
  }, []);

  if (!due || !due.length) return null;

  const done = (entry: DueRevision) => {
    markRevised(entry.item.id, entry.stage);
    setDue(dueRevisions());
  };

  return (
    <section className="border border-primary/50 bg-primary/5">
      <div className="flex items-center justify-between border-b border-primary/30 px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <RotateCcw className="size-3" /> Revision due
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary/80">
          {due.length} {due.length === 1 ? "save" : "saves"}
        </span>
      </div>

      <ul className="divide-y divide-primary/15">
        {due.slice(0, 3).map((entry) => (
          <li key={entry.item.id} className="px-3 py-2.5">
            <a
              href={entry.item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-start gap-1.5 text-[12px] font-medium leading-snug hover:text-primary"
            >
              <span className="line-clamp-2">{entry.item.title}</span>
              <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
            </a>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                {ageCopy(entry.ageDays)} · review {entry.stage}/4
              </span>
              <button
                type="button"
                onClick={() => done(entry)}
                className="inline-flex items-center gap-1 rounded-sm border border-primary/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-primary hover:bg-primary/10"
              >
                <Check className="size-2.5" /> Revised
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/saved"
        className="block border-t border-primary/20 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
      >
        Your reading list
      </Link>
    </section>
  );
}
