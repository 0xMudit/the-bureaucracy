import { PAPERS, TOPICS } from "./taxonomy";
import { payoffFor } from "./taxonomy-extras";
import { quizFor } from "./quiz";
import { buildFeed } from "./rank";
import { FEED_MIN_SCORE, NEWS_WINDOW_MS } from "./config";
import type { BriefEntry, Desk, FeedItem } from "./types";

export const BRIEF_SIZE = 5;

/** Minutes a focused reader needs for five ranked stories. */
export const BRIEF_MINUTES = 8;

export function freshItems(items: FeedItem[], now = Date.now()): FeedItem[] {
  const cutoff = now - NEWS_WINDOW_MS;
  return items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
}

function toEntry(item: FeedItem): BriefEntry {
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    source: item.source,
    publishedAt: item.publishedAt,
    examScore: item.examScore,
    priority: item.priority,
    topicId: item.primaryTopic ?? null,
    topicLabel: topic?.label ?? "Current affairs",
    paperLabel: topic?.paper ? PAPERS[topic.paper].short : "General",
    why: topic?.why ?? "A general current-affairs item. Place it against a syllabus theme before you commit it to memory.",
    hook: payoffFor(item),
    quiz: quizFor(item),
  };
}

/**
 * The daily brief is deliberately finite: five stories, diversified so one
 * paper or one publisher cannot eat the whole list. It is the session's
 * beginning and its finish line, in contrast to an infinite feed.
 */
export function briefFromItems(items: FeedItem[], desk: Desk | null, now = Date.now()): BriefEntry[] {
  const fresh = freshItems(items, now);
  // "Today's five" is strictly the five most syllabus-relevant stories, not
  // the five with the most likes. Reader signals still decide the wire below.
  let pool = buildFeed(fresh, { sort: "best", limit: 120, minScore: FEED_MIN_SCORE }, now, desk);
  // A quiet wire must still have a finish line today. Relax the floor rather
  // than hand a reader an empty brief, and never relax it below background.
  if (pool.length < BRIEF_SIZE) {
    const relaxed = buildFeed(fresh, { sort: "best", limit: 120, minScore: 25 }, now, desk);
    if (relaxed.length > pool.length) pool = relaxed;
  }
  if (!pool.length) return [];

  const chosen: FeedItem[] = [];
  const paperCount = new Map<string, number>();
  const topicCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();

  const tryTake = (item: FeedItem, strict: boolean): boolean => {
    if (chosen.some((c) => c.id === item.id)) return false;
    if (chosen.length >= BRIEF_SIZE) return false;
    const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
    const paper = topic?.id === "exam" ? "prelims" : (topic?.paper ?? "misc");
    const source = item.source;
    const topicKey = item.primaryTopic ?? "misc";
    if (strict) {
      if ((paperCount.get(paper) ?? 0) >= 2) return false;
      if ((topicCount.get(topicKey) ?? 0) >= 2) return false;
      if ((sourceCount.get(source) ?? 0) >= 2) return false;
    }
    chosen.push(item);
    paperCount.set(paper, (paperCount.get(paper) ?? 0) + 1);
    topicCount.set(topicKey, (topicCount.get(topicKey) ?? 0) + 1);
    sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1);
    return true;
  };

  for (const item of pool) {
    if (chosen.length >= BRIEF_SIZE) break;
    tryTake(item, true);
  }
  for (const item of pool) {
    if (chosen.length >= BRIEF_SIZE) break;
    tryTake(item, false);
  }

  return chosen.map(toEntry);
}
