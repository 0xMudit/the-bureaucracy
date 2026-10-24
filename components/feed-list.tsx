import Link from "next/link";
import { Inbox, PenLine } from "lucide-react";
import { FeedItemRow } from "@/components/feed-item";
import { Button } from "@/components/ui/button";
import type { FeedItem } from "@/lib/types";

interface FeedListProps {
  items: FeedItem[];
  voted: Set<string>;
  canWrite: boolean;
  query?: string;
}

export function FeedList({ items, voted, canWrite, query }: FeedListProps) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center border-b border-border/70 px-6 py-20 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-card">
          <Inbox className="size-5 text-muted-foreground" />
        </span>
        <p className="font-display text-2xl">The wire is quiet.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {query
            ? `Nothing in the last 24 hours matches “${query}”. Try a broader term, or clear the filters.`
            : "No stories match these filters in the last 24 hours. The next ingestion will bring fresh copy."}
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-sm">
            <Link href="/">Clear filters</Link>
          </Button>
          <Button asChild size="sm" className="rounded-sm">
            <Link href="/submit">
              <PenLine className="size-3.5" /> Submit a link
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border/70 border-b border-border/70">
      {items.map((item, index) => (
        <FeedItemRow
          key={item.id}
          item={item}
          position={index + 1}
          voted={voted.has(item.id)}
          canWrite={canWrite}
        />
      ))}
    </ol>
  );
}
