import type { FeedItem, FeedQuery, RankedItem, SortKey } from "./types";
import { OPTIONAL_ORDER, OPTIONALS, TOPICS } from "./taxonomy";
import { sourceAuthority } from "./sources";

export const GRAVITY = 1.8;
export const TOP_WINDOW_DAYS = 1;

/**
 * Hacker News-style gravity, tilted by exam relevance and source authority.
 * A story has to earn attention twice: from readers (points) and from the syllabus (examScore).
 */
export function rankScore(item: FeedItem, now = Date.now()): number {
  const ageHours = Math.max(0, (now - new Date(item.publishedAt).getTime()) / 3_600_000);
  const base = (totalPoints(item) + 1) / Math.pow(ageHours + 2, GRAVITY);
  const relevance = 0.78 + (item.examScore / 100) * 0.6;
  const authority = sourceAuthority(item.sourceUrl, item.sourceTier);
  const freshness = ageHours < 3 ? 1.18 : 1;
  return base * relevance * authority * freshness;
}

/** Community votes plus the syllabus-relevance baseline the story arrives with. */
export function totalPoints(item: FeedItem): number {
  return item.points + item.seedPoints;
}

/** Starting points keep a story visible before the first human vote. */
export function seedPoints(examScore: number): number {
  return Math.max(1, Math.round(examScore * 0.34));
}

export function sortItems(items: FeedItem[], sort: SortKey, now = Date.now()): RankedItem[] {
  const scored = items.map((item) => ({ ...item, rankScore: rankScore(item, now), position: 0 }));

  switch (sort) {
    case "new":
      scored.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
          b.examScore - a.examScore,
      );
      break;
    case "best":
      scored.sort(
        (a, b) =>
          b.examScore - a.examScore ||
          b.rankScore - a.rankScore ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      break;
    case "discussed":
      scored.sort(
        (a, b) =>
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
  const sort = query.sort ?? "top";
  const days = query.days ?? 1;
  const cutoff = now - days * 86_400_000;
  const q = query.q?.trim().toLowerCase();

  return items.filter((item) => {
    if (new Date(item.publishedAt).getTime() < cutoff) return false;
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

export function buildFeed(items: FeedItem[], query: FeedQuery, now = Date.now()): RankedItem[] {
  const filtered = filterItems(items, { query, now });
  const ranked = sortItems(filtered, query.sort ?? "top", now);
  const diverse = query.limit && (query.sort ?? "top") === "top" ? diversify(ranked, query.limit, 5) : ranked;
  return query.limit ? diverse.slice(0, query.limit) : diverse;
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
