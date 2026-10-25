import { mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { hashKey, rateLimit } from "@/lib/rate-limit";
import { loadReaderState, saveReaderState } from "@/lib/reader-state";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const MAX_BODY_BYTES = 512 * 1024;

/**
 * GET  /api/mobile/state — the account's progress and saves.
 * PUT  /api/mobile/state — merge the device's copy into the account.
 *
 * A signed-in reader's state is a union of every device they have used, not a
 * last-write-wins snapshot. Losing a 30-day streak because a tablet was offline
 * would be the one bug nobody forgives.
 */
export async function GET(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to sync your progress.");

  const limit = await rateLimit(`mobile:state:get:${hashKey(user.id)}`, 120, 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many sync requests. Try again shortly.", retryAfter: limit.retryAfter },
      429,
    );
  }

  try {
    const state = await loadReaderState(user.id);
    return mobileJson({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your progress could not be read.";
    return mobileError(500, message);
  }
}

export async function PUT(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to sync your progress.");

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return mobileError(413, "That progress payload is too large.");
  }

  const limit = await rateLimit(`mobile:state:put:${hashKey(user.id)}`, 60, 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many syncs. Try again shortly.", retryAfter: limit.retryAfter },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  if (!body || typeof body !== "object") {
    return mobileError(400, "Expected { progress, saves }.");
  }

  const payload = body as { progress?: unknown; saves?: unknown };

  try {
    const state = await saveReaderState(user.id, payload);
    return mobileJson({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your progress could not be saved.";
    return mobileError(500, message);
  }
}
