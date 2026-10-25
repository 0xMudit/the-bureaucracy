"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Flame,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  humanDate,
  markRead,
  noteVisit,
  readBrief,
  statsFor,
  subscribeProgress,
  todayReadIds,
  unmarkRead,
  writeBrief,
} from "@/lib/progress";
import { trackEvent } from "@/lib/telemetry";
import { quizSet } from "@/lib/quiz";
import { BriefQuiz } from "@/components/brief-quiz";
import type { BriefEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DailyBriefProps {
  entries: BriefEntry[];
  dateKey: string;
  deskLabel: string | null;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Milliseconds until the next 07:00 IST edition. */
function msToNextEdition(now = Date.now()): number {
  const ist = new Date(now + IST_OFFSET_MS);
  let target =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 7, 0, 0) - IST_OFFSET_MS;
  if (target <= now) target += 86_400_000;
  return target - now;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours >= 1) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadReminder(): void {
  const start = new Date(Date.now() + msToNextEdition());
  const end = new Date(start.getTime() + 15 * 60_000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Bureaucracy//Daily Wire//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tb-brief-${icsStamp(start)}@the-bureaucracy`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    "SUMMARY:The Bureaucracy — today's five",
    "DESCRIPTION:Five policy stories ranked for the syllabus. Read them and close the tab.",
    "URL:https://the-bureaucracy.vercel.app/",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:The wire has turned. Five stories are ready.",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "the-bureaucracy-daily-wire.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  trackEvent("reminder");
  toast.success("Reminder downloaded", { description: "Add it to your calendar for 07:00 IST." });
}

export function DailyBrief({ entries, dateKey, deskLabel }: DailyBriefProps) {
  const [brief, setBrief] = useState<BriefEntry[]>(entries);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(entries[0]?.id ?? null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const celebrated = useRef(false);

  const sync = useCallback(() => {
    setRead(todayReadIds());
    setStreak(statsFor().current);
  }, []);

  useEffect(() => {
    noteVisit();
    const stored = readBrief(dateKey);
    if (stored?.length) setBrief(stored);
    else writeBrief(dateKey, entries);
    sync();
    const unsubscribe = subscribeProgress(sync);
    const tick = () => setCountdown(formatCountdown(msToNextEdition()));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [dateKey, entries, sync]);

  const done = useMemo(() => brief.filter((entry) => read.has(entry.id)).length, [brief, read]);
  const complete = brief.length > 0 && done === brief.length;
  const firstUnread = brief.find((entry) => !read.has(entry.id)) ?? brief[0];
  const questions = useMemo(() => quizSet(brief), [brief]);

  useEffect(() => {
    if (!complete || celebrated.current) return;
    celebrated.current = true;
    trackEvent("brief_complete", { n: brief.length, streak: statsFor().current });
  }, [brief.length, complete]);

  const toggle = (id: string) => {
    const entry = brief.find((candidate) => candidate.id === id);
    if (read.has(id)) {
      unmarkRead(id);
      setRead(todayReadIds());
    } else {
      const isNew = markRead(id, entry?.topicId ?? null);
      setRead(todayReadIds());
      if (isNew) trackEvent("story_read", { from: "brief" });
    }
  };

  const copyNotes = async () => {
    const notes = [
      `The Bureaucracy — ${humanDate(dateKey)}`,
      "",
      ...brief.map(
        (entry, index) =>
          `${index + 1}. ${entry.title}\n   ${entry.paperLabel} · ${entry.topicLabel} · ${entry.examScore}/100\n   Why: ${entry.why}`,
      ),
      "",
      "Ranked for the syllabus · https://the-bureaucracy.vercel.app/",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(notes);
      toast.success("Five stories copied as notes");
      trackEvent("share", { via: "copy_brief" });
    } catch {
      toast.error("Could not copy on this browser");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/#brief`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Today's five — The Bureaucracy", url });
        trackEvent("share", { via: "native_brief" });
        return;
      } catch {
        // Reader cancelled the sheet; fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Brief link copied");
      trackEvent("share", { via: "copy_brief_link" });
    } catch {
      toast.error("Could not copy on this browser");
    }
  };

  if (!brief.length) return null;

  return (
    <section id="brief" aria-labelledby="brief-title" className="scroll-mt-4 border border-foreground/80 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-foreground/80 bg-foreground px-3 py-2 text-background">
        <h2 id="brief-title" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
          <Sparkles className="size-3.5" /> Today&apos;s five
        </h2>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-background/70">
          {humanDate(dateKey)} · about 8 minutes
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        <div className="flex flex-1 items-center gap-1" aria-hidden>
          {brief.map((entry) => (
            <span
              key={entry.id}
              className={cn(
                "h-1 flex-1 transition-colors",
                read.has(entry.id) ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="stat-tick font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {complete ? "5 of 5" : `${done} of ${brief.length}`}
        </span>
        {streak > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
            <Flame className="size-3" /> Day {streak}
          </span>
        ) : null}
        {deskLabel ? (
          <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">
            {deskLabel}
          </span>
        ) : null}
      </div>

      <ol className="divide-y divide-border/70">
        {brief.map((entry, index) => {
          const isRead = read.has(entry.id);
          const isOpen = expanded === entry.id;
          return (
            <li key={entry.id} className="group flex gap-3 px-3 py-3">
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                aria-pressed={isRead}
                aria-label={isRead ? `Mark ${entry.title} unread` : `Mark ${entry.title} read`}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] transition-colors",
                  isRead
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                {isRead ? <Check className="size-3" strokeWidth={3} /> : String(index + 1).padStart(2, "0")}
              </button>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[1.08rem] leading-[1.25] tracking-[-0.01em]">
                  <Link
                    href={`/item/${entry.id}`}
                    className={cn("headline-link", isRead && "text-muted-foreground line-through decoration-border")}
                  >
                    {entry.title}
                  </Link>
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8.5px] uppercase tracking-[0.09em] text-muted-foreground">
                  {entry.priority === "high" ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <span className="size-1 rounded-full bg-primary" /> Priority
                    </span>
                  ) : null}
                  <span className="text-primary/80">{entry.paperLabel}</span>
                  <span aria-hidden>·</span>
                  <span>{entry.topicLabel}</span>
                  <span aria-hidden>·</span>
                  <span>{entry.source}</span>
                  <span aria-hidden>·</span>
                  <span>{entry.examScore}/100</span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  aria-expanded={isOpen}
                  className="mt-1.5 inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground hover:text-primary"
                >
                  Why it matters
                  <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen ? (
                  <div className="mt-1.5 border-l-2 border-primary/70 pl-2.5">
                    <p className="text-[12px] leading-relaxed text-foreground/85">{entry.why}</p>
                    <p className="mt-1.5 flex gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      <span className="font-mono text-primary">→</span>
                      {entry.hook}
                    </p>
                  </div>
                ) : null}
              </div>

              {!isRead ? (
                <Link
                  href={`/item/${entry.id}`}
                  aria-label={`Read ${entry.title}`}
                  className="mt-0.5 hidden size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-primary sm:inline-flex"
                >
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>

      {complete ? (
        <div className="border-t border-border bg-primary/5 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="display text-[1.35rem] leading-none">Brief filed.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                You read all five.{" "}
                {streak > 0 ? (
                  <span className="text-foreground">
                    That is day {streak} of your streak.
                  </span>
                ) : (
                  "Come back tomorrow to start a streak."
                )}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <Clock3 className="size-3" /> Next edition at 07:00 IST
                {countdown ? ` · in ${countdown}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadReminder}
                className="h-8 rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
              >
                <BellRing className="size-3" /> Remind me
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyNotes}
                className="h-8 rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
              >
                <Copy className="size-3" /> Copy notes
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={share}
                className="h-8 rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
              >
                <Share2 className="size-3" /> Share
              </Button>
            </div>
          </div>

          {questions.length ? (
            <div className="mt-3 border-t border-primary/20 pt-3">
              <BriefQuiz questions={questions} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Read them, tick them off, close the tab. The wire is finished for today.
          </p>
          <Button asChild size="sm" className="h-8 rounded-sm px-3 font-mono text-[9px] uppercase tracking-[0.11em]">
            <Link href={`/item/${firstUnread.id}`}>
              {done > 0 ? "Continue" : "Start with #1"} <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
