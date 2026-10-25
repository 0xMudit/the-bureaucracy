import { normalizeTitle } from "./rss";
import type { FeedItem } from "./types";

/**
 * Near-duplicate detection shared by ingest and read paths.
 *
 * Ingest de-duplicates within one batch, but two runs fifteen minutes apart can
 * each keep the same event under different headlines. The front page therefore
 * collapses again at read time, using the same token comparison, so a reader
 * never sees the same story twice on a wire that claims to be edited.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with", "as", "at", "by",
  "from", "is", "are", "be", "will", "says", "said", "after", "over", "new", "india",
  "indian", "special", "session", "likely", "may", "month", "centre", "government", "govt",
  "latest", "live", "update", "updates", "explained", "today", "amid", "ahead", "know",
  "here", "what", "why", "how",
]);

/** Similarity at or above this is treated as the same story. */
export const DUPLICATE_THRESHOLD = 0.66;

const TIER_RANK: Record<string, number> = { official: 3, analysis: 2, news: 1, aggregator: 0 };

export function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/** Overlap coefficient: robust when one headline is a shorter version of another. */
export function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / Math.min(a.size, b.size);
}

export function similarity(a: string, b: string): number {
  const left = titleTokens(a);
  const right = titleTokens(b);
  return Math.max(jaccard(left, right), overlap(left, right));
}

/** True when `candidate` should represent the cluster instead of `current`. */
export function prefers(candidate: FeedItem, current: FeedItem): boolean {
  const tierDiff = (TIER_RANK[candidate.sourceTier] ?? 0) - (TIER_RANK[current.sourceTier] ?? 0);
  if (tierDiff !== 0) return tierDiff > 0;
  if (candidate.examScore !== current.examScore) return candidate.examScore > current.examScore;
  return new Date(candidate.publishedAt).getTime() > new Date(current.publishedAt).getTime();
}

/**
 * Keep the strongest copy of each event. Items are visited strongest-first, so
 * the first member of a cluster is the one a reader sees; later near-duplicates
 * are dropped rather than merged. O(n²) over a wire that is capped at 450 rows.
 */
export function collapseDuplicates(
  items: FeedItem[],
  threshold = DUPLICATE_THRESHOLD,
  maxAgeMs = 5 * 86_400_000,
): FeedItem[] {
  const ordered = [...items].sort((a, b) => (prefers(a, b) ? -1 : prefers(b, a) ? 1 : 0));
  const kept: FeedItem[] = [];
  const keptTokens: Set<string>[] = [];
  const counts: number[] = [];
  const seenUrls = new Set<string>();

  for (const item of ordered) {
    // Same canonical URL, different headline: still one story.
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    const tokens = titleTokens(item.title);
    let duplicateIndex = -1;
    kept.forEach((other, index) => {
      if (duplicateIndex !== -1) return;
      const gap = Math.abs(new Date(other.publishedAt).getTime() - new Date(item.publishedAt).getTime());
      if (gap > maxAgeMs) return;
      if (Math.max(jaccard(tokens, keptTokens[index]), overlap(tokens, keptTokens[index])) >= threshold) {
        duplicateIndex = index;
      }
    });
    if (duplicateIndex !== -1) {
      counts[duplicateIndex] += 1;
      continue;
    }
    kept.push(item);
    keptTokens.push(tokens);
    counts.push(1);
  }

  return kept.map((item, index) => ({
    ...item,
    clusterId: item.clusterId ?? item.id,
    clusterCount: counts[index],
  }));
}

/**
 * Tag every story with the id of the cluster's strongest representative.
 * Unlike `collapseDuplicates` this keeps duplicates, so the archive and the
 * admin console can show that an event was reported by several publishers.
 */
export function assignClusters(
  items: FeedItem[],
  threshold = DUPLICATE_THRESHOLD,
  maxAgeMs = 5 * 86_400_000,
): FeedItem[] {
  const ordered = [...items].sort((a, b) => (prefers(a, b) ? -1 : prefers(b, a) ? 1 : 0));
  const clusters: { id: string; tokens: Set<string>; publishedAt: number }[] = [];

  return ordered.map((item) => {
    const tokens = titleTokens(item.title);
    const publishedAt = new Date(item.publishedAt).getTime();
    const match = clusters.find(
      (cluster) =>
        Math.abs(cluster.publishedAt - publishedAt) <= maxAgeMs &&
        Math.max(jaccard(tokens, cluster.tokens), overlap(tokens, cluster.tokens)) >= threshold,
    );
    if (match) return { ...item, clusterId: match.id };
    clusters.push({ id: item.id, tokens, publishedAt });
    return { ...item, clusterId: item.id };
  });
}
