import { processQueuedAiJobs } from "@/lib/enrich";
import { backfillPremiumPacks } from "@/lib/premium";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: "Unauthorised." }, { status: 401 });
  }
  try {
    const result = await processQueuedAiJobs(8);

    // Premium packs pre-warm only when the free enrichment queue is quiet.
    // Both draw on the same provider account, and the free brief is the
    // product promise; a paid reader's first view can still generate inline.
    // Running this in series also keeps the per-minute token limit in reach.
    const premium =
      result.processed + result.failed === 0
        ? await backfillPremiumPacks(3)
        : { generated: 0, failed: 0, remaining: 0, skipped: "busy" as const };

    return Response.json({ ...result, premium }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Queue failed." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
