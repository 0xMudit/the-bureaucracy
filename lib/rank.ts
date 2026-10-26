import type { Desk, FeedItem, FeedQuery, RankedItem, SortKey } from "./types";
import { OPTIONAL_ORDER, OPTIONALS, TOPICS } from "./taxonomy";
import { sourceAuthority } from "./sources";

export const GRAVITY = 1.8;
export const TOP_WINDOW_DAYS = 1;

/**
 * A small, explained tilt toward the reader's declared exam, stage and
 * optional. It never overrides the public ranking, and it is skipped entirely
 * for readers who have not set a desk.
 */
export function deskTilt(item: FeedItem, desk?: Desk | null): number {
  if (!desk) return 1;
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  let tilt = 1;

  if (desk.stage === "mains") {
    // Mains rewards material you can build an answer from, so depth of copy
    // matters more than the raw news score.
    const depth = Math.min(1, item.summary.length / 320);
    tilt += depth * 0.32;
    if (topic && topic.paper !== "prelims" && topic.id !== "exam") tilt += 0.08;
  } else if (desk.stage === "prelims") {
    tilt += (item.examScore / 100) * 0.3;
    if (topic?.paper === "prelims" || topic?.id === "exam") tilt += 0.32;
    if (item.priority === "high") tilt += 0.1;
  }

  if (desk.optional !== "all") {
    if (item.primaryOptional === desk.optional) tilt += 0.6;
    else if (item.optionals.includes(desk.optional)) tilt += 0.25;
  }

  if (desk.exam === "state" && (topic?.id === "governance" || topic?.id === "society")) {
    tilt += 0.12;
  }

  return tilt;
}

/**
 * Hacker News-style gravity, tilted by exam relevance and source authority.
 * A story has to earn attention twice: from readers (points) and from the syllabus (examScore).
 */
export function rankScore(item: FeedItem, now = Date.now(), desk?: Desk | null): number {
  const ageHours = Math.max(0, (now - new Date(item.publishedAt).getTime()) / 3_600_000);
  const base = (totalPoints(item) + 1) / Math.pow(ageHours + 2, GRAVITY);
  const relevance = 0.78 + (item.examScore / 100) * 0.6;
  const authority = sourceAuthority(item.sourceUrl, item.sourceTier);
  const freshness = ageHours < 3 ? 1.18 : 1;
  return base * relevance * authority * freshness * deskTilt(item, desk);
}

/**
 * The community signal shown to readers: likes carry the weight, a comment is
 * worth more than a like because it costs something, and a dislike removes a
 * little of the noise. Seed points keep an unread story visible.
 */
export function totalPoints(item: FeedItem): number {
  const likes = item.likeCount ?? item.points;
  const dislikes = item.dislikeCount ?? 0;
  const comments = item.commentCount ?? 0;
  return Math.max(0, item.seedPoints + likes + comments * 1.35 - dislikes * 0.55);
}

/**
 * The "Discussed" sort. Same shape as the main score, but a comment is worth
 * substantially more than a like and the decay is gentler, so an active
 * argument can stay on the board longer than a merely popular link.
 */
export function discussionScore(item: FeedItem, now = Date.now(), desk?: Desk | null): number {
  const ageHours = Math.max(0, (now - new Date(item.publishedAt).getTime()) / 3_600_000);
  const likes = item.likeCount ?? item.points;
  const dislikes = item.dislikeCount ?? 0;
  const comments = item.commentCount ?? 0;
  const signal = Math.max(0, item.seedPoints * 0.4 + likes + comments * 2.4 - dislikes * 0.55);
  const relevance = 0.86 + (item.examScore / 100) * 0.4;
  return ((signal + 1) / Math.pow(ageHours + 2, 1.35)) * relevance * deskTilt(item, desk);
}

/** Starting points keep a story visible before the first human vote. */
export function seedPoints(examScore: number): number {
  return Math.max(1, Math.round(examScore * 0.34));
}

export function sortItems(items: FeedItem[], sort: SortKey, now = Date.now(), desk?: Desk | null): RankedItem[] {
  const scored = items.map((item) => ({ ...item, rankScore: rankScore(item, now, desk), position: 0 }));

  switch (sort) {
    case "new":
      scored.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
          b.examScore - a.examScore,
      );
      break;
    case "best":
      // "Best" is the shared ranking formula: syllabus relevance, weighted
      // likes/comments and a dislike penalty, all under time decay. It is not
      // simply "highest exam score" — an old high-relevance story must still
      // lose to a fresher one readers are actually engaging with.
      scored.sort(
        (a, b) =>
          b.rankScore - a.rankScore ||
          b.examScore - a.examScore ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      break;
    case "discussed":
      scored.sort(
        (a, b) =>
          discussionScore(b, now, desk) - discussionScore(a, now, desk) ||
          b.commentCount - a.commentCount ||
          b.rankScore - a.rankScore ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      break;
    default:
      scored.sort(
        (a, b) =>
          b.rankScore - a.rankScore ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  }

  return scored.map((item, index) => ({ ...item, position: index + 1 }));
}

export interface FilterOptions {
  query: FeedQuery;
  now?: number;
}

export function filterItems(items: FeedItem[], { query, now = Date.now() }: FilterOptions): FeedItem[] {
  const days = query.days ?? 1;
  const cutoff = now - days * 86_400_000;
  const q = query.q?.trim().toLowerCase();

  return items.filter((item) => {
    if (new Date(item.publishedAt).getTime() < cutoff) return false;
    if (query.minScore !== undefined && item.examScore < query.minScore) return false;
    if (query.topic && query.topic !== "all" && !item.topics.includes(query.topic)) return false;
    if (query.optional && query.optional !== "all" && !item.optionals.includes(query.optional)) return false;
    if (query.paper && query.paper !== "all" && TOPICS[item.primaryTopic ?? "polity"]?.paper !== query.paper) {
      return false;
    }
    if (q) {
      const haystack = `${item.title} ${item.summary} ${item.source} ${item.keywords.join(" ")} ${item.optionals.join(" ")}` .toLowerCase();
      if (!q.split(/\s+/).every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

export function buildFeed(
  items: FeedItem[],
  query: FeedQuery,
  now = Date.now(),
  desk?: Desk | null,
): RankedItem[] {
  const filtered = filterItems(items, { query, now });
  const ranked = sortItems(filtered, query.sort ?? "top", now, desk);
  const balanced = query.sort === "top" || !query.sort ? topicDiverse(ranked, 5) : ranked;
  const diverse = query.limit && (query.sort ?? "top") === "top" ? diversify(balanced, query.limit, 5) : balanced;
  return query.limit ? diverse.slice(0, query.limit) : diverse;
}

/**
 * The first five are the "today's five" promise, so they should not all be the
 * same story type. Keep the ranking order, but if the head repeats a topic,
 * promote the next distinct story from the tail.
 */
export function topicDiverse(items: RankedItem[], headSize = 5): RankedItem[] {
  if (items.length <= headSize) return items;
  const head: RankedItem[] = [];
  const used = new Set<string>();
  const deferred: RankedItem[] = [];

  for (const item of items) {
    if (head.length >= headSize) break;
    const key = item.primaryTopic ?? "general";
    if (!used.has(key)) {
      head.push(item);
      used.add(key);
    } else {
      deferred.push(item);
    }
  }

  const chosen = new Set(head.map((item) => item.id));
  for (const item of items) {
    if (head.length >= headSize) break;
    if (!chosen.has(item.id)) {
      head.push(item);
      chosen.add(item.id);
    }
  }

  return [...head, ...items.filter((item) => !chosen.has(item.id))];
}

/** Interleave sources so one prolific publisher cannot dominate the front page. */
export function diversify(items: RankedItem[], limit: number, maxPerSource = 5): RankedItem[] {
  const counts = new Map<string, number>();
  const primary: RankedItem[] = [];
  const overflow: RankedItem[] = [];

  for (const item of items) {
    const seen = counts.get(item.source) || 0;
    if (primary.length < limit && seen < maxPerSource) {
      primary.push(item);
      counts.set(item.source, seen + 1);
    } else {
      overflow.push(item);
    }
  }

  for (const item of overflow) {
    if (primary.length >= limit) break;
    primary.push(item);
  }

  return primary;
}

export function topicCounts(items: FeedItem[]): { id: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const t of item.topics) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: TOPICS[id as keyof typeof TOPICS]?.label ?? id, count }))
    .sort((a, b) => b.count - a.count);
}

export function optionalCounts(items: FeedItem[]): { id: string; label: string; short: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const id of item.optionals) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return OPTIONAL_ORDER.map((id) => ({
    id,
    label: OPTIONALS[id].label,
    short: OPTIONALS[id].short,
    count: counts.get(id) ?? 0,
  }));
}
