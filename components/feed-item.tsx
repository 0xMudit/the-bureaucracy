import Link from "next/link";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { ArticleThumb } from "@/components/article-image";
import { ReactionBar } from "@/components/reaction-bar";
import { SaveButton } from "@/components/save-button";
import { ReadBadge } from "@/components/reading-loop";
import { OPTIONALS, TOPICS } from "@/lib/taxonomy";
import { payoffFor } from "@/lib/taxonomy-extras";
import { matchPyq } from "@/lib/pyq";
import type { FeedItem, ViewerReaction } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface FeedItemRowProps {
  item: FeedItem;
  position?: number;
  viewerReaction: ViewerReaction;
  canWrite: boolean;
}

export function FeedItemRow({ item, position, viewerReaction, canWrite }: FeedItemRowProps) {
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  const pyq = matchPyq(item);
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
      <ReactionBar itemId={item.id} initial={viewerReaction} canWrite={canWrite} />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {position ? (
            <span className="stat-tick font-mono text-[10px] tabular-nums text-muted-foreground">
              {String(position).padStart(2, "0")}
            </span>
          ) : null}
          {item.kicker ? <span className="kicker truncate">{item.kicker}</span> : null}
          {item.priority === "high" ? (
            <span className="inline-flex shrink-0 items-center gap-1 bg-primary/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">
              <span className="size-1 rounded-full bg-primary" /> Priority
            </span>
          ) : null}
          {pyq ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 border border-primary/40 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary"
              title={`A previous-year question is linked to this story: ${pyq.question}`}
            >
              PYQ {pyq.year}
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
            className="ml-1.5 inline-flex translate-y-[-1px] text-muted-foreground hover:text-primary"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        </h3>

        {item.summary ? (
          <p className="mt-1 line-clamp-2 max-w-2xl break-words text-[12.5px] leading-relaxed text-muted-foreground">
            {item.summary}
          </p>
        ) : null}

        <p className="mt-1 flex max-w-2xl gap-1.5 text-[12px] leading-snug text-foreground/75">
          <span aria-hidden className="font-mono text-primary">
            →
          </span>
          <span className="line-clamp-1">{payoffFor(item)}</span>
        </p>

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
            data-comment-link
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <MessageSquare className="size-3" />
            {item.commentCount === 0 ? "Comment" : `${item.commentCount}`}
          </Link>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1" title="Syllabus relevance score">
            <span className="text-primary/80">{item.examScore}</span>
            <span className="text-muted-foreground">relevance</span>
          </span>
          <ReadBadge itemId={item.id} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <SaveButton item={savedItem} />
        {item.imageUrl ? (
          <ArticleThumb src={item.imageUrl} alt={item.title} topic={item.primaryTopic} />
        ) : null}
        {item.clusterCount && item.clusterCount > 1 ? (
          <span
            className="hidden font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground sm:block"
            title={`${item.clusterCount} publishers covered this event`}
          >
            +{item.clusterCount - 1} source{item.clusterCount - 1 === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </li>
  );
}
