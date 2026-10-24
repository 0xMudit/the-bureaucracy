"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkX, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readSaved, SAVED_EVENT, writeSaved, type SavedItem } from "@/lib/saved";
import { OPTIONALS, TOPICS } from "@/lib/taxonomy";
import { priorityLabel } from "@/lib/taxonomy-extras";
import { timeAgo } from "@/lib/utils";

export function SavedList() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(readSaved());
    sync();
    setReady(true);
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    const timer = setInterval(sync, 60_000);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
      clearInterval(timer);
    };
  }, []);

  const remove = (id: string) => {
    writeSaved(readSaved().filter((item) => item.id !== id));
  };

  const clear = () => {
    writeSaved([]);
  };

  if (!ready) {
    return <div className="h-24 border border-border bg-card" aria-hidden />;
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-border px-6 py-16 text-center">
        <BookmarkX className="size-6 text-muted-foreground" />
        <p className="mt-3 font-display text-2xl">Nothing saved.</p>
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
          Save a story from the feed and it waits here for the rest of the 24-hour cycle. After that, it expires
          with the wire.
        </p>
        <Button asChild size="sm" className="mt-4 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/">Back to the wire</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {items.length} {items.length === 1 ? "story" : "stories"} · stored on this device
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-7 rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" /> Clear
        </Button>
      </div>

      <ul className="divide-y divide-border/70 border-b border-border/70">
        {items.map((item, index) => {
          const topic = item.primaryTopic ? TOPICS[item.primaryTopic as keyof typeof TOPICS] : null;
          return (
            <li key={item.id} className="flex gap-3 py-4">
              <span className="stat-tick mt-1 w-5 shrink-0 font-mono text-[9px] text-muted-foreground/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                {item.kicker ? <p className="kicker truncate">{item.kicker}</p> : null}
                <h2 className="mt-1 font-display text-[1.2rem] leading-snug">
                  <Link href={`/item/${item.id}`} className="headline-link">
                    {item.title}
                  </Link>
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.09em] text-muted-foreground">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {item.source} <ExternalLink className="size-2.5" />
                  </a>
                  <span aria-hidden>·</span>
                  <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
                  {topic ? (
                    <>
                      <span aria-hidden>·</span>
                      <Link href={`/?topic=${topic.id}`} className="hover:text-foreground">
                        {topic.label}
                      </Link>
                    </>
                  ) : null}
                  {item.priority === "high" ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-primary">High priority</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden>·</span>
                      <span>{priorityLabel(item.priority)}</span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{item.examScore}/100</span>
                  {item.primaryOptional && OPTIONALS[item.primaryOptional] ? (
                    <>
                      <span aria-hidden>·</span>
                      <Link href={`/?optional=${item.primaryOptional}`} className="text-primary/80 hover:text-primary">
                        {OPTIONALS[item.primaryOptional].short}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.title} from saved`}
                title="Remove from saved"
                className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
