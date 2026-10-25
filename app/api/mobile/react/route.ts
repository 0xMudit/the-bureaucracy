import { mobileError, mobileJson, preflight, readDeviceId } from "@/lib/mobile";
import { rateLimit, hashKey } from "@/lib/rate-limit";
import { toggleReaction } from "@/lib/social";
import { canWrite, StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * POST /api/mobile/react  { "itemId": "abc123", "kind": "like" | "dislike" }
 *
 * Like and dislike are mutually exclusive and a second tap removes the
 * reaction. The device id is the actor, exactly like the web's `tb_voter`
 * cookie for signed-out readers.
 */
export async function POST(request: Request) {
  if (!canWrite()) {
    return mobileError(503, "Reactions are disabled until a database is connected.");
  }

  const deviceId = readDeviceId(request);
  if (!deviceId) return mobileError(400, "A valid x-device-id header is required.");

  const limit = await rateLimit(`mobile:react:${hashKey(deviceId)}`, 60, 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many reactions. Try again shortly.", retryAfter: limit.retryAfter },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const itemId = String(record.itemId ?? "");
  const kind = String(record.kind ?? "");
  if (!itemId || itemId.length > 120) return mobileError(400, "A story id is required.");
  if (kind !== "like" && kind !== "dislike") return mobileError(400, "kind must be like or dislike.");

  try {
    const result = await toggleReaction({ key: `device:${deviceId}`, userId: null }, itemId, kind);
    return mobileJson({
      ok: true,
      itemId,
      likes: result.likes,
      dislikes: result.dislikes,
      reaction: result.reaction,
    });
  } catch (error) {
    const missing =
      (error instanceof StoreError && error.code === "not-found") ||
      (error instanceof Error && error.message.includes("item_not_found"));
    if (missing) return mobileError(404, "That story is no longer on the wire.");
    if (error instanceof StoreError && error.code === "readonly") {
      return mobileError(503, error.message);
    }
    return mobileError(500, error instanceof Error ? error.message : "The reaction could not be recorded.");
  }
}
