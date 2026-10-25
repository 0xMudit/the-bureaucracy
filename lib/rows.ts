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
    likeCount: Number(row.like_count ?? 0),
    dislikeCount: Number(row.dislike_count ?? 0),
    saveCount: Number(row.save_count ?? 0),
    imageUrl: row.image_url ? String(row.image_url) : null,
    imageSource: row.image_source ? String(row.image_source) : null,
    imageAttribution: row.image_attribution ? String(row.image_attribution) : null,
    summaryBullets: Array.isArray(row.summary_bullets) ? (row.summary_bullets as string[]) : [],
    examAngle: row.exam_angle ? String(row.exam_angle) : null,
    clusterId: row.cluster_id ? String(row.cluster_id) : null,
    archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : null,
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
    image_url: item.imageUrl ?? null,
    image_source: item.imageSource ?? null,
    image_attribution: item.imageAttribution ?? null,
    summary_bullets: item.summaryBullets ?? [],
    exam_angle: item.examAngle ?? null,
    cluster_id: item.clusterId ?? null,
  };
}

export function rowToComment(row: Row): Comment {
  return {
    id: String(row.id),
    itemId: String(row.item_id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    author: String(row.author ?? ""),
    authorId: row.author_id ? String(row.author_id) : null,
    body: String(row.body ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    editedAt: row.edited_at ? new Date(String(row.edited_at)).toISOString() : null,
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
    likeCount: Number(row.like_count ?? 0),
  };
}
