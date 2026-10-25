import { mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight, readDeviceId } from "@/lib/mobile";
import { isExpoPushToken } from "@/lib/push";
import { hashKey, rateLimit } from "@/lib/rate-limit";
import { normalizeDesk } from "@/lib/desk";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

/**
 * POST /api/mobile/push  { token, platform, deviceId, desk }
 * DELETE /api/mobile/push { token }
 *
 * Registration is allowed before sign-in: the prompt fires after the third
 * completed brief, and forcing an account at that exact moment would trade a
 * habit for a form. A later sign-in attaches the token to the account.
 */
export async function POST(request: Request) {
  const user = await mobileUser(request);
  const deviceId = readDeviceId(request);
  if (!user && !deviceId) {
    return mobileError(400, "A device id or a signed-in account is required.");
  }

  const limit = await rateLimit(
    `mobile:push:${hashKey(user?.id ?? deviceId ?? "anon")}`,
    10,
    60_000,
  );
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many registration attempts.", retryAfter: limit.retryAfter },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  if (!isExpoPushToken(raw.token)) {
    return mobileError(400, "A valid Expo push token is required.");
  }

  const platform = typeof raw.platform === "string" && PLATFORMS.has(raw.platform) ? raw.platform : "unknown";
  const desk = raw.desk && typeof raw.desk === "object" ? normalizeDesk(raw.desk as never) : null;
  const db = serviceClient();
  if (!db) return mobileError(503, "Push registration is not configured.");

  const now = new Date().toISOString();
  const { error } = await db.from("tb_push_tokens").upsert(
    {
      token: raw.token,
      user_id: user?.id ?? null,
      device_id: deviceId,
      platform,
      desk,
      enabled: true,
      last_seen: now,
    },
    { onConflict: "token" },
  );

  if (error) return mobileError(500, "The notification token could not be saved.");
  return mobileJson({ ok: true, registered: true });
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const token = (body as { token?: unknown } | null)?.token;
  if (!isExpoPushToken(token)) return mobileError(400, "A valid Expo push token is required.");

  const user = await mobileUser(request);
  const deviceId = readDeviceId(request);
  const db = serviceClient();
  if (!db) return mobileError(503, "Push registration is not configured.");

  // Only the owner may disable a token; a leaked token is not a mute button.
  let query = db.from("tb_push_tokens").update({ enabled: false }).eq("token", token);
  if (user) query = query.eq("user_id", user.id);
  else if (deviceId) query = query.eq("device_id", deviceId);
  else return mobileError(401, "Sign in or provide a device id.");

  const { error } = await query;
  if (error) return mobileError(500, "The notification token could not be disabled.");
  return mobileJson({ ok: true, registered: false });
}
