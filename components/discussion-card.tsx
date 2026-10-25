import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { DiscussionEntry } from "@/lib/people";
import { timeAgo } from "@/lib/utils";

export function DiscussionCard({
  entry,
  showAuthor = true,
}: {
  entry: DiscussionEntry;
  showAuthor?: boolean;
}) {
  return (
    <article className="border-b border-border/70 px-1 py-4 last:border-0">
      <div className="flex items-start gap-3">
        {showAuthor ? (
          <Link
            href={`/u/${entry.authorUsername}`}
            aria-label={`Open ${entry.authorName}'s desk`}
            className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserAvatar
              name={entry.authorName}
              id={entry.authorId}
              config={entry.authorAvatar}
              size={28}
            />
          </Link>
        ) : (
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {showAuthor ? (
              <Link
                href={`/u/${entry.authorUsername}`}
                className="text-[12.5px] font-medium hover:text-primary"
              >
                {entry.authorName}
              </Link>
            ) : null}
            {showAuthor ? (
              <span className="font-mono text-[9px] text-muted-foreground">@{entry.authorUsername}</span>
            ) : null}
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              {timeAgo(entry.createdAt)}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
            {entry.body}
          </p>
          <Link
            href={`/item/${entry.itemId}#discussion`}
            className="group mt-2 inline-flex max-w-full items-baseline gap-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            <span className="truncate font-medium">{entry.itemTitle}</span>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em]">{entry.itemSource}</span>
            <ArrowUpRight className="size-3 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
