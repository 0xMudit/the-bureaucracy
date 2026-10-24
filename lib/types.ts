export type PaperId = "prelims" | "gs1" | "gs2" | "gs3" | "gs4" | "essay";

export type TopicId =
  | "polity"
  | "governance"
  | "economy"
  | "ir"
  | "environment"
  | "science"
  | "security"
  | "society"
  | "history"
  | "ethics"
  | "reports"
  | "exam";

export type OptionalId =
  | "psir"
  | "geography"
  | "sociology"
  | "pubadmin"
  | "history"
  | "anthropology";

export type Priority = "high" | "medium" | "low";

export type SourceTier = "official" | "news" | "analysis" | "aggregator";

export type SortKey = "top" | "new" | "best" | "discussed";

export interface Paper {
  id: PaperId;
  label: string;
  short: string;
  description: string;
}

export interface Topic {
  id: TopicId;
  label: string;
  paper: PaperId;
  weight: number;
  why: string;
  hooks: string[];
  cues: string[];
  keywords: string[];
}

export interface OptionalSubject {
  id: OptionalId;
  label: string;
  short: string;
  description: string;
  why: string;
  cues: string[];
  hooks: string[];
  topicIds: TopicId[];
  keywords: string[];
}

export interface FeedItem {
  id: string;
  title: string;
  kicker: string;
  url: string;
  source: string;
  sourceUrl: string;
  sourceTier: SourceTier;
  summary: string;
  publishedAt: string;
  fetchedAt: string;
  topics: TopicId[];
  primaryTopic: TopicId | null;
  examScore: number;
  priority: Priority;
  keywords: string[];
  optionals: OptionalId[];
  primaryOptional: OptionalId | null;
  points: number;
  seedPoints: number;
  commentCount: number;
}

export interface RankedItem extends FeedItem {
  rankScore: number;
  position: number;
}

export interface FeedQuery {
  sort?: SortKey;
  topic?: TopicId | "all";
  optional?: OptionalId | "all";
  paper?: PaperId | "all";
  q?: string;
  days?: number;
  limit?: number;
}

export interface Comment {
  id: string;
  itemId: string;
  parentId: string | null;
  author: string;
  body: string;
  createdAt: string;
}

export interface CommentNode extends Comment {
  children: CommentNode[];
}

export interface IngestResult {
  fetched: number;
  kept: number;
  inserted: number;
  updated: number;
  pruned: number;
  errors: { source: string; message: string }[];
}
