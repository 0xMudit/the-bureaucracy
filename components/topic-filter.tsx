import Link from "next/link";
import { TOPICS, TOPIC_ORDER } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

interface TopicFilterProps {
  active: string;
  sort: string;
  q: string;
  counts: Record<string, number>;
  optional?: string;
  paper?: string;
}

export function TopicFilter({ active, sort, q, counts, optional, paper }: TopicFilterProps) {
  const href = (topic: string) => {
    const params = new URLSearchParams();
    if (sort && sort !== "top") params.set("sort", sort);
    if (q) params.set("q", q);
    if (topic !== "all") params.set("topic", topic);
    if (optional && optional !== "all") params.set("optional", optional);
    if (paper && paper !== "all") params.set("paper", paper);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href={href("all")}
        className={cn(
          "shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
          active === "all"
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
      >
        All topics
      </Link>
      {TOPIC_ORDER.map((id) => {
        const topic = TOPICS[id];
        const count = counts[id] ?? 0;
        if (!count && active !== id) return null;
        return (
          <Link
            key={id}
            href={href(id)}
            className={cn(
              "shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
              active === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {topic.label}
            <span className={cn("ml-1 tabular-nums", active === id ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
              {count || "0"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
