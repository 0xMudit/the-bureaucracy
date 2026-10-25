"use client";

import { useEffect, useState } from "react";
import { Check, CircleCheck } from "lucide-react";
import { markRead, subscribeProgress, todayReadIds, toggleRead } from "@/lib/progress";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

/** Quiet read marker used in dense feed rows: absent until it matters. */
export function ReadBadge({ itemId }: { itemId: string }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    const sync = () => setRead(todayReadIds().has(itemId));
    sync();
    return subscribeProgress(sync);
  }, [itemId]);

  if (!read) return null;

  return (
    <>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1 text-primary/80" title="Read today">
        <Check className="size-3" strokeWidth={3} /> read
      </span>
    </>
  );
}

interface ReadButtonProps {
  itemId: string;
  topicId?: string;
  className?: string;
  size?: "sm" | "md";
}

/** Explicit control for readers who do not want passive tracking. */
export function ReadButton({ itemId, topicId, className, size = "sm" }: ReadButtonProps) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    const sync = () => setRead(todayReadIds().has(itemId));
    sync();
    return subscribeProgress(sync);
  }, [itemId]);

  const onClick = () => {
    const next = toggleRead(itemId, topicId);
    setRead(next);
    if (next) trackEvent("story_read", { from: "button" });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={read}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 font-mono uppercase tracking-[0.1em] transition-colors",
        size === "sm" ? "h-7 text-[9px]" : "h-8 text-[10px]",
        read
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        className,
      )}
    >
      {read ? <CircleCheck className="size-3" /> : <Check className="size-3" />}
      {read ? "Read" : "Mark read"}
    </button>
  );
}

/**
 * Two jobs: give the reader a sense of how far through the story they are,
 * and credit the read once they have actually spent time on it. Twelve
 * seconds or half the page, whichever comes first.
 */
export function ReadingProgress({ itemId, topicId }: { itemId: string; topicId?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let marked = false;
    const started = Date.now();

    const credit = () => {
      if (marked) return;
      if (todayReadIds().has(itemId)) {
        marked = true;
        return;
      }
      marked = true;
      markRead(itemId, topicId);
      trackEvent("story_read", { from: "time" });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(ratio);
      if (ratio >= 0.5) credit();
      else if (Date.now() - started >= 12_000) credit();
    };

    const timer = window.setTimeout(credit, 12_000);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [itemId, topicId]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
