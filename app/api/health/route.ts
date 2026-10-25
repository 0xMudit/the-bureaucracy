import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Uptime probe. Public on purpose: it says nothing that the feed does not
 * already say, and an authenticated health check is useless to a monitor.
 *
 * 200 means the process is up and Postgres answered. 503 means the database is
 * unreachable or unconfigured, which is a real outage for a deployment whose
 * whole feed comes from there.
 */
export async function GET() {
  const started = Date.now();
  const db = serviceClient();

  const payload: {
    status: "ok" | "degraded";
    time: string;
    commit: string | null;
    db: { ok: boolean; latencyMs: number; error?: string };
    wire: { latest: string | null; ageMinutes: number | null; stale: boolean | null };
  } = {
    status: "degraded",
    time: new Date().toISOString(),
    // Empty on CLI deploys, which carry no git metadata; report null rather
    // than an empty string so the probe summary says "unknown".
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
    db: { ok: false, latencyMs: 0 },
    wire: { latest: null, ageMinutes: null, stale: null },
  };

  if (!db) {
    payload.db.error = "database_not_configured";
    return json(payload, 503);
  }

  try {
    const { data, error } = await db
      .from("items")
      .select("published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    payload.db.latencyMs = Date.now() - started;

    if (error) {
      payload.db.error = "query_failed";
      return json(payload, 503);
    }

    payload.db.ok = true;
    payload.status = "ok";

    const latest = data?.published_at ? String(data.published_at) : null;
    if (latest) {
      const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(latest).getTime()) / 60_000));
      payload.wire = { latest, ageMinutes, stale: ageMinutes > 6 * 60 };
    } else {
      // An empty wire is not an outage, but it does mean ingestion has not
      // produced anything yet. The monitor warns without paging.
      payload.wire = { latest: null, ageMinutes: null, stale: true };
    }

    return json(payload, 200);
  } catch {
    payload.db.latencyMs = Date.now() - started;
    payload.db.error = "unreachable";
    return json(payload, 503);
  }
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex",
    },
  });
}
