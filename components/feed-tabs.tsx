import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SortKey } from "@/lib/types";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
  { key: "best", label: "Best" },
  { key: "discussed", label: "Discussed" },
];

interface FeedTabsProps {
  sort: SortKey;
  topic: string;
  q: string;
  optional?: string;
  paper?: string;
}

export function FeedTabs({ sort, topic, q, optional, paper }: FeedTabsProps) {
  const href = (next: SortKey) => {
    const params = new URLSearchParams();
    if (next !== "top") params.set("sort", next);
    if (topic && topic !== "all") params.set("topic", topic);
    if (optional && optional !== "all") params.set("optional", optional);
    if (paper && paper !== "all") params.set("paper", paper);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <nav aria-label="Sort stories" className="flex items-center gap-0.5 border-y border-border/80">
      {SORTS.map((item) => (
        <Link
          key={item.key}
          href={href(item.key)}
          aria-current={sort === item.key ? "page" : undefined}
          className={cn(
            "relative px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.13em] transition-colors",
            sort === item.key
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
          {sort === item.key ? (
            <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" aria-hidden />
          ) : null}
        </Link>
      ))}
      <span className="ml-auto hidden pr-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70 sm:block">
        Decay 1.8 · 24h window
      </span>
    </nav>
  );
}
