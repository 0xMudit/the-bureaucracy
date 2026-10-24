import Link from "next/link";
import { ArrowRight, PenLine, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOPICS } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/utils";
import type { FeedItem } from "@/lib/types";

interface SidebarProps {
  brief: FeedItem[];
  topicCounts: { id: string; label: string; count: number }[];
  sources: { source: string; count: number; official: boolean }[];
  total: number;
  latestFetchedAt: string | null;
}

function Card({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground">{title}</h2>
        {meta ? <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Sidebar({ brief, topicCounts, sources, total, latestFetchedAt }: SidebarProps) {
  const max = Math.max(1, ...topicCounts.map((t) => t.count));

  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
      <Card title="The brief" meta="Top 3 by relevance">
        <ol className="divide-y divide-border/70">
          {brief.map((item, index) => {
            const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
            return (
              <li key={item.id} className="px-3 py-3">
                <Link href={`/item/${item.id}`} className="group block">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 font-mono text-[10px] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium leading-snug group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
                        {topic ? topic.label : "Current affairs"} · {item.examScore}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Syllabus radar" meta="Last 24h">
        <div className="space-y-2.5 px-3 py-3">
          {topicCounts.slice(0, 7).map((topic) => (
            <Link key={topic.id} href={`/?topic=${topic.id}`} className="block group">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-muted-foreground group-hover:text-foreground">
                  {topic.label}
                </span>
                <span className="stat-tick font-mono text-[9.5px] text-muted-foreground">{topic.count}</span>
              </div>
              <div className="mt-1 h-1 w-full bg-muted">
                <div
                  className="h-1 bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ width: `${Math.max(5, Math.round((topic.count / max) * 100))}%` }}
                />
              </div>
            </Link>
          ))}
          <Link
            href="/syllabus"
            className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
          >
            Full syllabus map <ArrowRight className="size-3" />
          </Link>
        </div>
      </Card>

      <Card title="On the wire" meta={`${total} stories`}>
        <ul className="divide-y divide-border/60">
          {sources.slice(0, 6).map((source) => (
            <li key={source.source} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={source.official ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-border"} />
                <span className="truncate text-[11.5px] text-muted-foreground">{source.source}</span>
              </span>
              <span className="stat-tick font-mono text-[9.5px] text-muted-foreground">{source.count}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
          <Radio className="size-3 text-primary" />
          {latestFetchedAt ? `Synced ${timeAgo(latestFetchedAt)}` : "Awaiting first sync"}
        </div>
      </Card>

      <section className="border-l-2 border-primary bg-accent/40 px-4 py-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">How ranking works</p>
        <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-foreground/90">
          (points + 1) / (age + 2)<sup>1.8</sup> × syllabus relevance × source authority
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          Reader votes decide attention. The syllabus decides whether it belongs. Older stories sink, and the
          whole feed turns over every 24 hours.
        </p>
        <Link
          href="/about"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
        >
          Read the method <ArrowRight className="size-3" />
        </Link>
      </section>

      <Button asChild className="w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.14em]">
        <Link href="/submit">
          <PenLine className="size-3.5" /> Put something on the wire
        </Link>
      </Button>
    </aside>
  );
}
