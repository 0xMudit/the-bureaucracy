import { NEWS_WINDOW_MS } from "./config";
import { OPTIONAL_ORDER, OPTIONALS, PAPERS, TOPIC_ORDER, TOPICS } from "./taxonomy";
import { PAPER_LABEL, payoffFor } from "./taxonomy-extras";
import type {
  CommentNode,
  Comment,
  FeedItem,
  OptionalId,
  PaperId,
  TopicId,
} from "./types";

/**
 * Shared plumbing for the `/api/mobile/*` surface.
 *
 * The web app is server-rendered and the database has RLS enabled with no
 * policies, so a native client cannot read Postgres directly. These endpoints
 * are the app's only door: they reuse the same store, ranking and taxonomy the
 * pages use, and the service role stays on the server.
 */
export const MOBILE_API_VERSION = 1;

export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-device-id",
  "access-control-max-age": "86400",
};

export interface MobileTopicRef {
  id: TopicId;
  label: string;
  paper: PaperId;
  paperLabel: string;
}

export interface MobileOptionalRef {
  id: OptionalId;
  label: string;
  short: string;
}

export type MobileItem = FeedItem & {
  /** 1-based position in the ranked feed, when the item came from one. */
  position?: number;
  rankScore?: number;
  /** Primary theme, resolved server-side so the client needs no taxonomy join. */
  topic: MobileTopicRef | null;
  /** Primary optional-subject lens, resolved server-side. */
  optional: MobileOptionalRef | null;
  /** One line naming the exam move this story enables. */
  payoff: string;
  /** When the item falls out of the 24-hour window. */
  expiresAt: string;
};

/** Resolve the taxonomy references an item needs, once, on the server. */
export function enrichItem(item: FeedItem, position?: number, rankScore?: number): MobileItem {
  const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
  const optional = item.primaryOptional ? OPTIONALS[item.primaryOptional] : null;

  return {
    ...item,
    ...(position ? { position } : {}),
    ...(typeof rankScore === "number" ? { rankScore } : {}),
    topic: topic
      ? { id: topic.id, label: topic.label, paper: topic.paper, paperLabel: PAPER_LABEL[topic.paper] }
      : null,
    optional: optional ? { id: optional.id, label: optional.label, short: optional.short } : null,
    payoff: payoffFor(item),
    expiresAt: new Date(new Date(item.publishedAt).getTime() + NEWS_WINDOW_MS).toISOString(),
  };
}

/**
 * Vote identity on mobile. Device ids are namespaced so they can never collide
 * with the web's `tb_voter` cookie values in the same votes table.
 */
export function voterIdFor(deviceId: string): string {
  return `m_${deviceId}`;
}

const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function readDeviceId(request: Request): string | null {
  const raw = (request.headers.get("x-device-id") ?? "").trim();
  return DEVICE_ID.test(raw) ? raw : null;
}

export function mobileJson(
  body: Record<string, unknown>,
  status = 200,
  cacheControl = "no-store",
): Response {
  return Response.json(
    { version: MOBILE_API_VERSION, ...body },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "cache-control": cacheControl,
        "x-api-version": String(MOBILE_API_VERSION),
      },
    },
  );
}

export function mobileError(status: number, error: string): Response {
  return mobileJson({ ok: false, error }, status);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Trim the payload to what a phone actually renders. */
export function slimComment(comment: Comment): Record<string, unknown> {
  return {
    id: comment.id,
    parentId: comment.parentId,
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

export function slimCommentTree(nodes: CommentNode[]): Record<string, unknown>[] {
  return nodes.map((node) => ({ ...slimComment(node), children: slimCommentTree(node.children) }));
}

/**
 * The syllabus map, without the ~600 classification keywords. The client only
 * needs labels, rationales, answer hooks and cues; the keyword lists stay on
 * the server with the classifier.
 */
export function taxonomyPayload(): Record<string, unknown> {
  return {
    papers: (Object.keys(PAPERS) as PaperId[]).map((id) => ({
      id,
      label: PAPERS[id].label,
      short: PAPERS[id].short,
      description: PAPERS[id].description,
    })),
    topics: TOPIC_ORDER.map((id) => {
      const topic = TOPICS[id];
      return {
        id: topic.id,
        label: topic.label,
        paper: topic.paper,
        paperLabel: PAPER_LABEL[topic.paper],
        why: topic.why,
        hooks: topic.hooks,
        cues: topic.cues,
      };
    }),
    optionals: OPTIONAL_ORDER.map((id) => {
      const optional = OPTIONALS[id];
      return {
        id: optional.id,
        label: optional.label,
        short: optional.short,
        description: optional.description,
        why: optional.why,
        hooks: optional.hooks,
        cues: optional.cues,
        topicIds: optional.topicIds,
      };
    }),
  };
}

