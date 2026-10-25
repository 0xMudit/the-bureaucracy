import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ArrowLeft, Search } from "lucide-react";
import { ArticleThumb } from "@/components/article-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listArchived } from "@/lib/store";
import { TOPICS, TOPIC_ORDER } from "@/lib/taxonomy";
import { formatDate, timeAgo } from "@/lib/utils";
import type { TopicId } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The archive",
  description:
    "Every story that has left the 24-hour wire, searchable by date, topic and syllabus paper.",
};

function value(input: string | string[] | undefined): string {
  return (Array.isArray(input) ? input[0] : input)?.trim() ?? "";
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = value(params.q).slice(0, 80);
  const topic = value(params.topic);
  const date = value(params.date);

  const from = date ? new Date(`${date}T00:00:00+05:30`) : undefined;
  const to = date ? new Date(`${date}T23:59:59.999+05:30`) : undefined;

  const items = await listArchived({
    q,
    topic: topic && topic !== "all" ? topic : undefined,
    from: from && !Number.isNaN(from.getTime()) ? from.toISOString() : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to.toISOString() : undefined,
    limit: 80,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to the wire
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <Archive className="size-3.5" /> Beyond 24 hours
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            The archive.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            The wire forgets after a day; the record does not. Search older stories by date, topic or
            syllabus paper. Archived stories keep their discussion.
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {items.length} {items.length === 1 ? "story" : "stories"} shown
        </span>
      </div>

      <form className="mt-5 flex flex-wrap items-end gap-2 border border-border bg-card p-3">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Search
          </span>
          <Input name="q" defaultValue={q} placeholder="Title or excerpt" className="h-10 rounded-sm" />
        </label>
        <label>
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Topic
          </span>
          <select
            name="topic"
            defaultValue={topic || "all"}
            className="h-10 min-w-36 rounded-sm border border-input bg-background px-2 text-sm"
          >
            <option value="all">Any topic</option>
            {TOPIC_ORDER.map((id) => (
              <option key={id} value={id}>
                {TOPICS[id].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Date
          </span>
          <Input type="date" name="date" defaultValue={date} className="h-10 rounded-sm" />
        </label>
        <Button type="submit" className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Search className="size-3.5" /> Search archive
        </Button>
        <Button asChild variant="ghost" className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/archive">Reset</Link>
        </Button>
      </form>

      {items.length ? (
        <ol className="mt-5 divide-y divide-border/70 border-y border-border/70">
          {items.map((item) => {
            const topicInfo = item.primaryTopic ? TOPICS[item.primaryTopic as TopicId] : null;
            return (
              <li key={item.id} className="flex gap-3 px-1 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span>{formatDate(item.publishedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{item.source}</span>
                    {topicInfo ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-primary/80">{topicInfo.label}</span>
                      </>
                    ) : null}
                  </p>
                  <h2 className="mt-1 font-display text-[1.35rem] leading-[1.2]">
                    <Link href={`/item/${item.id}`} className="headline-link">
                      {item.title}
                    </Link>
                  </h2>
                  {item.summary ? (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                    Archived {item.archivedAt ? timeAgo(item.archivedAt) : "after 24 hours"} ·{" "}
                    {item.commentCount} {item.commentCount === 1 ? "comment" : "comments"}
                  </p>
                </div>
                <ArticleThumb src={item.imageUrl} alt={item.title} topic={item.primaryTopic} />
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-8 border border-dashed border-border px-6 py-14 text-center">
          <Archive className="mx-auto size-6 text-muted-foreground" />
          <p className="display mt-3 text-2xl">Nothing filed under that search.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stories appear here after they leave the 24-hour wire. Try a broader term or clear the date.
          </p>
        </div>
      )}
    </div>
  );
}
