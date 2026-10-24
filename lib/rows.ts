import type { Comment, FeedItem } from "./types";

export type Row = Record<string, unknown>;

export function rowToItem(row: Row): FeedItem {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    kicker: String(row.kicker ?? ""),
    url: String(row.url ?? ""),
    source: String(row.source ?? ""),
    sourceUrl: String(row.source_url ?? ""),
    sourceTier: (row.source_tier as FeedItem["sourceTier"]) ?? "news",
    summary: String(row.summary ?? ""),
    publishedAt: new Date(String(row.published_at)).toISOString(),
    fetchedAt: new Date(String(row.fetched_at)).toISOString(),
    topics: (row.topics as FeedItem["topics"]) ?? [],
    primaryTopic: (row.primary_topic as FeedItem["primaryTopic"]) ?? null,
    examScore: Number(row.exam_score ?? 0),
    priority: (row.priority as FeedItem["priority"]) ?? "low",
    keywords: (row.keywords as string[]) ?? [],
    optionals: (row.optionals as FeedItem["optionals"]) ?? [],
    primaryOptional: (row.primary_optional as FeedItem["primaryOptional"]) ?? null,
    points: Number(row.points ?? 0),
    seedPoints: Number(row.seed_points ?? 0),
    commentCount: Number(row.comment_count ?? 0),
  };
}

export function itemToRow(item: FeedItem): Row {
  return {
    id: item.id,
    title: item.title,
    kicker: item.kicker,
    url: item.url,
    source: item.source,
    source_url: item.sourceUrl,
    source_tier: item.sourceTier,
    summary: item.summary,
    published_at: item.publishedAt,
    fetched_at: item.fetchedAt,
    topics: item.topics,
    primary_topic: item.primaryTopic,
    exam_score: item.examScore,
    priority: item.priority,
    keywords: item.keywords,
    optionals: item.optionals,
    primary_optional: item.primaryOptional,
    seed_points: item.seedPoints,
  };
}

export function rowToComment(row: Row): Comment {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    author: String(row.author ?? ""),
    body: String(row.body ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}
