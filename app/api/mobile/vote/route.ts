import { mobileError, mobileJson, preflight, readDeviceId, voterIdFor } from "@/lib/mobile";
import { rateLimit } from "@/lib/rate-limit";
import { canWrite, StoreError, vote } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * POST /api/mobile/vote  { "itemId": "abc123" }
 *
 * Toggles the device's vote, exactly like the web's anonymous `tb_voter`
 * cookie. Voting is open to every reader; commenting is what needs an account.
 */
export async function POST(request: Request) {
  if (!canWrite()) {
    return mobileError(503, "Voting is disabled until a database is connected.");
  }

  const deviceId = readDeviceId(request);
  if (!deviceId) {
    return mobileError(400, "A valid x-device-id header is required.");
  }

  const limit = rateLimit(`mobile:vote:${deviceId}`, 30, 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many votes. Try again shortly.", retryAfter: limit.retryAfter },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const itemId =
    typeof body === "object" && body !== null && "itemId" in body
      ? String((body as { itemId: unknown }).itemId)
      : "";
  if (!itemId || itemId.length > 120) {
    return mobileError(400, "A story id is required.");
  }

  try {
    const result = await vote(itemId, voterIdFor(deviceId));
    return mobileJson({ ok: true, itemId, points: result.points, voted: result.voted });
  } catch (error) {
    // The local store raises `not-found`; the Postgres function raises
    // `item_not_found`. Both mean the story has left the wire.
    const missing =
      (error instanceof StoreError && error.code === "not-found") ||
      (error instanceof Error && error.message.includes("item_not_found"));
    if (missing) {
      return mobileError(404, "That story is no longer on the wire.");
    }
    if (error instanceof StoreError && error.code === "readonly") {
      return mobileError(503, error.message);
    }
    const message = error instanceof Error ? error.message : "The vote could not be recorded.";
    return mobileError(500, message);
  }
}
