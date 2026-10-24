import Link from "next/link";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { VoteButton } from "@/components/vote-button";
import { SaveButton } from "@/components/save-button";
import { OPTIONALS, TOPICS } from "@/lib/taxonomy";
import type { FeedItem } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface FeedItemRowProps {
  item: FeedItem;
  position?: number;
  voted: boolean;
  canWrite: boolean;
}

export function FeedItemRow({ item, position, voted, canWrite }: FeedItemRowProps) {
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  const savedItem = {
    id: item.id,
    title: item.title,
    kicker: item.kicker,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt,
    primaryTopic: item.primaryTopic,
    topics: item.topics,
    examScore: item.examScore,
    priority: item.priority,
    primaryOptional: item.primaryOptional,
  };

  return (
    <li
      data-feed-item
      className="feed-row relative flex gap-2 px-1 py-4 sm:gap-3 sm:px-2"
    >
      <VoteButton itemId={item.id} points={item.points} seedPoints={item.seedPoints} voted={voted} canWrite={canWrite} />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {position ? (
            <span className="stat-tick font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {String(position).padStart(2, "0")}
            </span>
          ) : null}
          {item.kicker ? <span className="kicker truncate">{item.kicker}</span> : null}
          {item.priority === "high" ? (
            <span className="inline-flex shrink-0 items-center gap-1 bg-primary/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">
              <span className="size-1 rounded-full bg-primary" /> Priority
            </span>
          ) : null}
        </div>

        <h3 className="break-words font-display text-[1.3rem] leading-[1.2] tracking-[-0.01em] sm:text-[1.45rem]">
          <Link href={`/item/${item.id}`} data-item-link className="headline-link">
            {item.title}
          </Link>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open at ${item.source}`}
            className="ml-1.5 inline-flex translate-y-[-1px] text-muted-foreground/60 hover:text-primary"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        </h3>

        {item.summary ? (
          <p className="mt-1 line-clamp-2 max-w-2xl break-words text-[12.5px] leading-relaxed text-muted-foreground">
            {item.summary}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted-foreground">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "inline-flex items-center gap-1 hover:text-foreground",
              item.sourceTier === "official" && "text-primary/90",
            )}
          >
            {item.sourceTier === "official" ? <span className="size-1 rounded-full bg-primary" /> : null}
            {item.source}
          </a>
          <span aria-hidden>·</span>
          <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
          {topic ? (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/?topic=${topic.id}`}
                className="hover:text-foreground"
                title={`${topic.paper.toUpperCase()} · ${topic.label}`}
              >
                {topic.paper === "prelims" ? "Prelims" : topic.paper.toUpperCase()} {topic.label}
              </Link>
            </>
          ) : null}
          {item.primaryOptional ? (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/?optional=${item.primaryOptional}`}
                className="text-primary/80 hover:text-primary"
                title={`Optional: ${OPTIONALS[item.primaryOptional].label}`}
              >
                {OPTIONALS[item.primaryOptional].short}
              </Link>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <Link
            href={`/item/${item.id}#discussion`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <MessageSquare className="size-3" />
            {item.commentCount === 0 ? "Discuss" : `${item.commentCount}`}
          </Link>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1" title="Syllabus relevance score">
            <span className="text-primary/80">{item.examScore}</span>
            <span className="text-muted-foreground/70">relevance</span>
          </span>
        </div>
      </div>

      <div className="shrink-0 pt-0.5">
        <SaveButton item={savedItem} />
      </div>
    </li>
  );
}
