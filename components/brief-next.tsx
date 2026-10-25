"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadButton } from "@/components/reading-loop";
import { readBrief, statsFor, subscribeProgress, todayReadIds, writeBrief } from "@/lib/progress";
import type { BriefEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BriefNextProps {
  currentId: string;
  entries: BriefEntry[];
  dateKey: string;
}

/**
 * Serialises the session instead of feeding an infinite list: every story
 * ends with the next unread story, or with a finish line.
 */
export function BriefNext({ currentId, entries, dateKey }: BriefNextProps) {
  const [brief, setBrief] = useState<BriefEntry[]>(entries);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = readBrief(dateKey);
    if (stored?.length) setBrief(stored);
    else if (entries.length) writeBrief(dateKey, entries);
    const sync = () => setRead(todayReadIds());
    sync();
    return subscribeProgress(sync);
  }, [dateKey, entries]);

  if (!brief.length) return null;

  const done = brief.filter((entry) => read.has(entry.id)).length;
  const next = brief.find((entry) => entry.id !== currentId && !read.has(entry.id));
  const position = brief.findIndex((entry) => entry.id === currentId);
  const currentUnread = position >= 0 && !read.has(brief[position].id);
  const complete = !currentUnread && !next;

  return (
    <section aria-labelledby="next-title" className="mt-8 border border-foreground/80 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-foreground/80 bg-foreground px-3 py-2 text-background">
        <h2 id="next-title" className="font-mono text-[9px] uppercase tracking-[0.18em]">
          {complete ? "Your five are done" : "Next in your five"}
        </h2>
        <span className="stat-tick font-mono text-[8.5px] uppercase tracking-[0.12em] text-background/70">
          {position >= 0 ? `No. ${position + 1} · ` : ""}
          {done} of {brief.length} read
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-3 pt-2" aria-hidden>
        {brief.map((entry) => (
          <span
            key={entry.id}
            className={cn("h-1 flex-1", read.has(entry.id) ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      {next ? (
        <div className="flex flex-wrap items-end justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {next.paperLabel} · {next.topicLabel} · {next.examScore}/100
            </p>
            <Link href={`/item/${next.id}`} className="display mt-1 block text-[1.25rem] leading-tight hover:text-primary">
              {next.title}
            </Link>
          </div>
          <Button asChild size="sm" className="h-8 shrink-0 rounded-sm px-3 font-mono text-[9px] uppercase tracking-[0.11em]">
            <Link href={`/item/${next.id}`}>
              Read next <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      ) : currentUnread ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <div>
            <p className="display text-[1.25rem] leading-none">This is the last of your five.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Mark it read and the brief is filed for today.
            </p>
          </div>
          <ReadButton itemId={currentId} topicId={brief[position]?.topicId ?? undefined} size="md" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <div>
            <p className="display text-[1.25rem] leading-none">Brief filed.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              You have read all five
              {statsFor().current > 0 ? `, and you are on day ${statsFor().current}.` : "."} The wire turns at
              07:00 IST.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 rounded-sm px-3 font-mono text-[9px] uppercase tracking-[0.11em]">
            <Link href="/#brief">
              <Check className="size-3" /> Back to the brief
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
