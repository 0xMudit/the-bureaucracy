import { createHash } from "node:crypto";
import { serviceClient } from "./store";

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

const buckets = new Map<string, number[]>();

/**
 * Per-instance fallback. Used in local dev (no database) and when the Postgres
 * limiter is unreachable. Serverless instances are not shared, so this alone is
 * a speed bump, not a wall.
 */
function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Shared fixed-window limiter.
 *
 * Backed by `public.tb_rate_limit` so every serverless instance and both
 * clients (web actions and the mobile API) count against the same bucket.
 * Falls back to the in-memory limiter when there is no database, so local
 * development and a limiter outage never lock readers out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const db = serviceClient();
  if (!db) return memoryLimit(key, limit, windowMs);

  try {
    const { data, error } = await db.rpc("tb_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return memoryLimit(key, limit, windowMs);

    return {
      ok: Boolean(row.ok),
      retryAfter: Number(row.retry_after ?? 0),
    };
  } catch (error) {
    // Fail open: a limiter outage must not take sign-in or voting down with it.
    console.warn(`rateLimit(${key}) fell back to memory:`, error);
    return memoryLimit(key, limit, windowMs);
  }
}

/**
 * Stable, non-reversible bucket key for an anonymous request.
 *
 * Limits are persisted in Postgres, so the raw address must never be the key:
 * a plain IPv4 is trivially reversible. A peppered hash keeps the counter
 * meaningful across instances without keeping an IP address on disk.
 */
export function clientKey(headers: Headers): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local";
  return hashKey(ip);
}

export function hashKey(value: string): string {
  const pepper = process.env.RATE_LIMIT_SALT ?? process.env.CRON_SECRET ?? "the-bureaucracy";
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex").slice(0, 40);
}
