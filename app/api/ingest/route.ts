import { revalidatePath, revalidateTag } from "next/cache";
import { NEWS_WINDOW_MS } from "@/lib/config";
import { ensureUniqueIds, fetchAllFeeds } from "@/lib/ingest";
import { canWrite, pruneOlderThan, StoreError, upsertItems } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, reason: "CRON_SECRET is not configured." }
      : { ok: true };
  }
  // Header only. A `?secret=` fallback ends up in access logs, proxy logs and
  // Referer headers; the scheduler already sends a bearer token.
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return { ok: true };
  return { ok: false, reason: "Unauthorised." };
}

async function run(request: Request): Promise<Response> {
  const auth = authorised(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  if (!canWrite()) {
    return Response.json(
      {
        ok: false,
        error:
          "No writable store. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run this endpoint locally.",
      },
      { status: 503 },
    );
  }

  const started = Date.now();
  try {
    const result = await fetchAllFeeds(new Date());
    const items = ensureUniqueIds(result.items);
    const { inserted, updated } = await upsertItems(items);
    const pruned = await pruneOlderThan(new Date(Date.now() - NEWS_WINDOW_MS).toISOString());

    revalidatePath("/");
    revalidatePath("/syllabus");
    revalidatePath("/optional");
    revalidateTag("items", { expire: 0 });

    return Response.json(
      {
        ok: true,
        fetched: result.fetched,
        kept: items.length,
        inserted,
        updated,
        pruned,
        errors: result.errors,
        durationMs: Date.now() - started,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof StoreError ? error.message : error instanceof Error ? error.message : "Ingest failed";
    return Response.json({ ok: false, error: message, durationMs: Date.now() - started }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
