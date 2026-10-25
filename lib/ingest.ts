import { analyze } from "./classify";
import { fetchFeed, mapWithConcurrency, canonicalUrl } from "./rss";
import type { RawItem } from "./rss";
import { collapseDuplicates } from "./dedupe";
import { SOURCES, isBlockedSource } from "./sources";
import { seedPoints } from "./rank";
import type { FeedItem, IngestResult, SourceTier } from "./types";
import { hashId } from "./utils";

function cleanSourceName(name: string, url: string): string {
  const trimmed = name.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }
  if (!trimmed || /[^\x00-\x7F]/.test(trimmed)) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }
  return trimmed;
}

function bytesOfSummary(summary: string): string {
  return summary
    .replace(/\s+/g, " ")
    .replace(/^(read|watch|listen)\s+(more|full)[^.]*\.?/i, "")
    .trim()
    .slice(0, 420);
}

export function toFeedItem(raw: RawItem, sourceId: string, now = new Date()): FeedItem | null {
  const source = SOURCES.find((s) => s.id === sourceId);
  if (!source) return null;

  const published = raw.publishedAt ? new Date(raw.publishedAt) : now;
  const ageDays = (now.getTime() - published.getTime()) / 86_400_000;
  const summary = bytesOfSummary(raw.summary);
  const sourceName = cleanSourceName(raw.sourceName, raw.sourceUrl);
  if (!sourceName) return null;
  if (isBlockedSource(raw.sourceUrl) || isBlockedSource(raw.link)) return null;

  const analysis = analyze(raw.title, summary, {
    sourceName,
    sourceTier: raw.tier,
    topicHint: source.topicHint,
    optionalHint: source.optionalHint,
    now,
  });

  if (analysis.isNoise) return null;
  if (ageDays > 1) return null;
  if (!analysis.primaryTopic && analysis.examScore < 20) return null;

  const url = canonicalUrl(raw.link);
  const id = hashId(url);
  const tier: SourceTier = raw.tier === "official" ? "official" : raw.tier;

  return {
    id,
    title: analysis.title,
    kicker: analysis.kicker,
    url,
    source: sourceName,
    sourceUrl: raw.sourceUrl || source.homepage,
    sourceTier: tier,
    summary,
    publishedAt: published.toISOString(),
    fetchedAt: now.toISOString(),
    topics: analysis.topics,
    primaryTopic: analysis.primaryTopic,
    examScore: analysis.examScore,
    priority: analysis.priority,
    keywords: analysis.keywords,
    optionals: analysis.optionals,
    primaryOptional: analysis.primaryOptional,
    points: 0,
    seedPoints: seedPoints(analysis.examScore),
    commentCount: 0,
  };
}

export interface FetchAllResult {
  items: FeedItem[];
  errors: { source: string; message: string }[];
  fetched: number;
}

export async function fetchAllFeeds(now = new Date()): Promise<FetchAllResult> {
  const results = await mapWithConcurrency(SOURCES, 6, async (source) => {
    const raws = await fetchFeed(source);
    return { source, raws };
  });

  const errors: { source: string; message: string }[] = [];
  const collected: FeedItem[] = [];
  let fetched = 0;

  results.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === "rejected") {
      errors.push({ source: source.name, message: String(result.reason?.message || result.reason) });
      return;
    }
    fetched += result.value.raws.length;
    for (const raw of result.value.raws) {
      const item = toFeedItem(raw, source.id, now);
      if (item) collected.push(item);
    }
  });

  return { items: capItems(dedupe(collected)), errors, fetched };
}

/**
 * Batch-level de-duplication. The matching rules live in `lib/dedupe.ts` so the
 * read path can apply the identical cluster test to rows that arrived in
 * different ingest runs.
 */
export function dedupe(items: FeedItem[]): FeedItem[] {
  return collapseDuplicates(items);
}

export { titleTokens, jaccard, overlap, collapseDuplicates } from "./dedupe";

/** Keep the strongest 450 items per ingest so the dataset stays queryable and cheap. */
export function capItems(items: FeedItem[], max = 450): FeedItem[] {
  const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return [...items]
    .sort((a, b) => {
      const p = priorityRank[b.priority] - priorityRank[a.priority];
      if (p !== 0) return p;
      if (b.examScore !== a.examScore) return b.examScore - a.examScore;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, max);
}

export function summariseIngest(items: FeedItem[], existingIds: Set<string>, result: FetchAllResult): IngestResult {
  const inserted = items.filter((i) => !existingIds.has(i.id)).length;
  return {
    fetched: result.fetched,
    kept: items.length,
    inserted,
    updated: items.length - inserted,
    pruned: 0,
    errors: result.errors,
  };
}

export function ensureUniqueIds(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
