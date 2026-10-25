import { cachedComments, cachedItem, cachedItems } from "@/lib/cached";
import { SITE, NEWS_WINDOW_MS } from "@/lib/config";
import { buildCommentTree, countComments } from "@/lib/comments";
import { enrichItem, mobileError, mobileJson, preflight, readDeviceId, slimCommentTree, voterIdFor } from "@/lib/mobile";
import { buildFeed } from "@/lib/rank";
import { canWrite, getVotedIds } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/mobile/item/[id]
 *
 * One story with its why-it-matters panel, answer hooks, related stories and
 * the threaded discussion. 410 once the story has left the 24-hour window —
 * the wire deletes, it does not archive.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id || id.length > 120) return mobileError(400, "A story id is required.");

  try {
    const item = await cachedItem(id);
    if (!item) return mobileError(404, "Story not found. It may have left the wire.");

    const age = Date.now() - new Date(item.publishedAt).getTime();
    if (age > NEWS_WINDOW_MS) {
      return mobileError(410, "This story has left the 24-hour wire and been deleted.");
    }

    const [comments, all] = await Promise.all([cachedComments(item.id), cachedItems()]);
    const tree = buildCommentTree(comments);

    const related = buildFeed(
      all.filter((other) => other.id !== item.id && other.primaryTopic === item.primaryTopic),
      { sort: "best", limit: 3 },
    );

    const deviceId = readDeviceId(request);
    const voted = deviceId ? await getVotedIds(voterIdFor(deviceId)) : new Set<string>();

    return mobileJson({
      ok: true,
      item: enrichItem(item),
      related: related.map((entry) => enrichItem(entry, entry.position, entry.rankScore)),
      comments: slimCommentTree(tree),
      commentCount: countComments(tree),
      voted: voted.has(item.id),
      canWrite: canWrite(),
      discussion: {
        writable: canWrite(),
        requiresAccount: true,
        note: "Reading the discussion is open to everyone. Posting needs an account on the web.",
      },
      webUrl: `${SITE.url}/item/${item.id}`,
      expiresAt: new Date(new Date(item.publishedAt).getTime() + NEWS_WINDOW_MS).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The story could not be read.";
    return mobileError(500, message);
  }
}
