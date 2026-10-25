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

export type ReactionKind = "like" | "dislike" | null;

/** The viewer-specific half of a story reaction, separate from cached rank data. */
export interface ViewerReaction {
  reaction: ReactionKind;
  saved: boolean;
  likes: number;
  dislikes: number;
}

export type ExamTrack = "upsc" | "state";

/** What the reader is actually writing. Drives the desk tilt on the feed. */
export type DeskStage = "all" | "prelims" | "mains";

export interface Desk {
  exam: ExamTrack;
  stage: DeskStage;
  optional: OptionalId | "all";
}

/** One of the five stories in the reader's daily brief. */
export interface BriefEntry {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  examScore: number;
  priority: Priority;
  topicId: TopicId | null;
  topicLabel: string;
  paperLabel: string;
  why: string;
  hook: string;
  /** Retrieval question frozen with the brief, so a noon ingest cannot move it. */
  quiz?: QuizQuestion;
}

/** A single retrieval question: a real PYQ when one matches, otherwise the syllabus angle. */
export interface QuizQuestion {
  kind: "pyq" | "topic";
  /** "UPSC Prelims 2019" or "Syllabus angle". */
  label: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  pyqId?: string;
}

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
  likeCount?: number;
  dislikeCount?: number;
  saveCount?: number;
  imageUrl?: string | null;
  imageSource?: string | null;
  imageAttribution?: string | null;
  summaryBullets?: string[];
  examAngle?: string | null;
  gsPaper?: string | null;
  prelimsFact?: string | null;
  mainsAngle?: string | null;
  syllabusHint?: string | null;
  indiaRelevant?: boolean;
  aiRelevance?: number | null;
  aiProvider?: string | null;
  pinned?: boolean;
  hidden?: boolean;
  clusterId?: string | null;
  /** How many near-identical stories from other publishers were merged. */
  clusterCount?: number;
  archivedAt?: string | null;
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
  /** Lowest exam-relevance score a story may carry on this surface. */
  minScore?: number;
}

export interface Comment {
  id: string;
  itemId: string;
  parentId: string | null;
  author: string;
  authorId?: string | null;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  likeCount?: number;
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
