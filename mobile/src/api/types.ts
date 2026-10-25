/**
 * Types for the `/api/mobile/*` surface in the Next.js app.
 * Source of truth: `lib/mobile.ts` and the four route handlers there.
 */

export type SortKey = "top" | "new" | "best" | "discussed";

export type Priority = "high" | "medium" | "low";

export type SourceTier = "official" | "news" | "analysis" | "aggregator";

export interface TopicRef {
  id: string;
  label: string;
  paper: string;
  paperLabel: string;
}

export interface OptionalRef {
  id: string;
  label: string;
  short: string;
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
  topics: string[];
  primaryTopic: string | null;
  examScore: number;
  priority: Priority;
  keywords: string[];
  optionals: string[];
  primaryOptional: string | null;
  points: number;
  seedPoints: number;
  commentCount: number;
  /** 1-based position in the ranked feed. */
  position?: number;
  rankScore?: number;
  topic: TopicRef | null;
  optional: OptionalRef | null;
  /** When this story drops out of the 24-hour window. */
  expiresAt: string;
}

export interface FeedFilters {
  sort: SortKey;
  topic: string;
  optional: string;
  paper: string;
  q: string;
}

export interface TopicCount {
  id: string;
  label: string;
  count: number;
}

export interface OptionalCount {
  id: string;
  label: string;
  short: string;
  count: number;
}

export interface FeedResponse {
  version: number;
  ok: true;
  generatedAt: string;
  filters: FeedFilters & { limit: number };
  screen: {
    kicker: string;
    title: string;
    blurb: string;
    mode: SortKey;
    modeLabel: string;
  };
  items: FeedItem[];
  counts: { topics: TopicCount[]; optionals: OptionalCount[] };
  meta: {
    count: number;
    scope: number;
    hasMore: boolean;
    latestFetchedAt: string | null;
    windowHours: number;
    canWrite: boolean;
    siteUrl: string;
  };
  votedIds: string[];
}

export interface CommentNode {
  id: string;
  parentId: string | null;
  author: string;
  body: string;
  createdAt: string;
  children: CommentNode[];
}

export interface StoryResponse {
  version: number;
  ok: true;
  item: FeedItem;
  related: FeedItem[];
  comments: CommentNode[];
  commentCount: number;
  voted: boolean;
  canWrite: boolean;
  discussion: {
    writable: boolean;
    requiresAccount: boolean;
    note: string;
  };
  webUrl: string;
  expiresAt: string;
}

export interface Paper {
  id: string;
  label: string;
  short: string;
  description: string;
}

export interface Topic {
  id: string;
  label: string;
  paper: string;
  paperLabel: string;
  why: string;
  hooks: string[];
  cues: string[];
}

export interface OptionalSubject {
  id: string;
  label: string;
  short: string;
  description: string;
  why: string;
  hooks: string[];
  cues: string[];
  topicIds: string[];
}

export interface TaxonomyResponse {
  version: number;
  ok: true;
  windowHours: number;
  windowMs: number;
  sorts: { id: SortKey; title: string; blurb: string }[];
  papers: Paper[];
  topics: Topic[];
  optionals: OptionalSubject[];
}

export interface VoteResponse {
  version: number;
  ok: true;
  itemId: string;
  points: number;
  voted: boolean;
}

export interface ApiFailure {
  version: number;
  ok: false;
  error: string;
  retryAfter?: number;
}

/* ------------------------------- reader desk ------------------------------ */

export type ExamTrack = "upsc" | "state";
export type DeskStage = "all" | "prelims" | "mains";

export interface Desk {
  exam: ExamTrack;
  stage: DeskStage;
  optional: string | "all";
}

/* --------------------------------- brief ---------------------------------- */

export interface QuizQuestion {
  kind: "pyq" | "topic";
  label: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  pyqId?: string;
}

export interface BriefEntry {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  examScore: number;
  priority: Priority;
  topicId: string | null;
  topicLabel: string;
  paperLabel: string;
  why: string;
  hook: string;
  quiz?: QuizQuestion;
  /** Added by the brief route, used by native share and the archive. */
  url?: string;
}

export interface BriefResponse {
  version: number;
  ok: true;
  dateKey: string;
  minutes: number;
  size: number;
  desk: Desk | null;
  entries: BriefEntry[];
  questions: QuizQuestion[];
}

/* ------------------------------ reader state ------------------------------ */

export interface ReaderProgressPayload {
  version: 2;
  days: Record<string, string[]>;
  joinedAt: string | null;
  visits: number;
  lastVisit: string | null;
  topics: Record<string, string>;
  quiz: Record<string, { correct: number; total: number }>;
  briefDays: string[];
}

export interface ReaderSave {
  id: string;
  title: string;
  kicker: string;
  url: string;
  source: string;
  publishedAt: string;
  primaryTopic: string | null;
  topics: string[];
  examScore: number;
  priority: Priority;
  primaryOptional: string | null;
  savedAt?: string;
}

export interface ReaderState {
  progress: ReaderProgressPayload;
  saves: ReaderSave[];
  updatedAt: string | null;
}

export interface ReaderStateResponse {
  version: number;
  ok: true;
  state: ReaderState;
}

/* -------------------------------- circles --------------------------------- */

export interface CircleMember {
  name: string;
  streak: number;
  today: number;
  isYou: boolean;
}

export interface CircleSummary {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  createdAt?: string;
  members?: CircleMember[];
}

export interface CirclesResponse {
  version: number;
  ok: true;
  today: string;
  circles: CircleSummary[];
}

export interface CircleResponse {
  version: number;
  ok: true;
  circle: CircleSummary;
}

/* -------------------------------- subscribe ------------------------------- */

export interface SubscribeResponse {
  ok: boolean;
  already?: boolean;
  pending?: boolean;
  confirmUrl?: string;
  error?: string;
}
