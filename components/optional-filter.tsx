import Link from "next/link";
import { OPTIONAL_ORDER, OPTIONALS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

interface OptionalFilterProps {
  active: string;
  sort: string;
  q: string;
  topic: string;
  paper: string;
  counts: Record<string, number>;
}

export function OptionalFilter({ active, sort, q, topic, paper, counts }: OptionalFilterProps) {
  const href = (optional: string) => {
    const params = new URLSearchParams();
    if (sort && sort !== "top") params.set("sort", sort);
    if (topic && topic !== "all") params.set("topic", topic);
    if (paper && paper !== "all") params.set("paper", paper);
    if (q) params.set("q", q);
    if (optional !== "all") params.set("optional", optional);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex items-center gap-2 border-b border-border/70 pb-3">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Optional
      </span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href={href("all")}
          className={cn(
            "shrink-0 rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.09em] transition-colors",
            active === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          Any
        </Link>
        {OPTIONAL_ORDER.map((id) => {
          const subject = OPTIONALS[id];
          const count = counts[id] ?? 0;
          return (
            <Link
              key={id}
              href={href(id)}
              title={subject.label}
              className={cn(
                "shrink-0 rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.09em] transition-colors",
                active === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                count === 0 && active !== id && "opacity-55",
              )}
            >
              {subject.short}
              <span
                className={cn(
                  "ml-1 tabular-nums",
                  active === id ? "text-primary-foreground/85" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/optional"
        className="ml-auto hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-primary hover:underline sm:block"
      >
        All optionals
      </Link>
    </div>
  );
}
