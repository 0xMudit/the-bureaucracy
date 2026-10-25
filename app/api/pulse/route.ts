import { NEWS_WINDOW_MS } from "@/lib/config";
import { ensureUniqueIds, fetchAllFeeds } from "@/lib/ingest";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { canWrite, listItems, pruneOlderThan, upsertItems } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The wire is considered stale once the newest fetched item is this old. */
const STALE_AFTER_MS = 20 * 60_000;
/** Never start two refreshes closer together than this, per instance. */
const COOLDOWN_MS = 5 * 60_000;

let lastAttempt = 0;

/**
 * Nudge for the pipeline: if GitHub's scheduler is late, any visitor holding a
 * tab open pulls the feed instead. Cheap when fresh (one indexed read), runs at
 * most one ingest per instance per cooldown, and does nothing on read-only
 * deployments.
 */
export async function GET(request: Request) {
  if (!canWrite()) {
    return Response.json({ ok: false, reason: "read-only" }, { status: 503 });
  }

  const limit = await rateLimit(`pulse:${clientKey(request.headers)}`, 4, COOLDOWN_MS);
  if (!limit.ok) {
    return Response.json(
      { ok: false, reason: "rate-limited" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  if (Date.now() - lastAttempt < COOLDOWN_MS) {
    return Response.json({ ok: true, skipped: "cooldown" });
  }

  try {
    const items = await listItems();
    const latest = items.reduce((max, item) => Math.max(max, Date.parse(item.fetchedAt) || 0), 0);
    if (Date.now() - latest < STALE_AFTER_MS) {
      return Response.json({ ok: true, skipped: "fresh", latest: latest ? new Date(latest).toISOString() : null });
    }

    lastAttempt = Date.now();
    const started = Date.now();
    const result = await fetchAllFeeds(new Date());
    const unique = ensureUniqueIds(result.items);
    const { inserted, updated } = await upsertItems(unique);
    const pruned = await pruneOlderThan(new Date(Date.now() - NEWS_WINDOW_MS).toISOString());

    return Response.json(
      {
        ok: true,
        refreshed: true,
        fetched: result.fetched,
        kept: unique.length,
        inserted,
        updated,
        pruned,
        errors: result.errors,
        durationMs: Date.now() - started,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    lastAttempt = 0;
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "refresh failed" },
      { status: 500 },
    );
  }
}
