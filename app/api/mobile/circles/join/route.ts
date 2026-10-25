import { displayName, mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { hashKey, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * POST /api/mobile/circles/join  { code, name? }
 *
 * Codes are case-insensitive and joining twice is a no-op, so a shared code can
 * be tapped from a chat without the app knowing whether it is already in.
 */
export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to join a study circle.");

  const limit = await rateLimit(`mobile:circle:join:${hashKey(user.id)}`, 20, 60 * 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many join attempts. Try again later.", retryAfter: limit.retryAfter },
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
  const code = typeof raw.code === "string" ? raw.code.trim().toUpperCase().slice(0, 12) : "";
  if (!/^[A-F0-9]{6,12}$/.test(code)) {
    return mobileError(400, "That invite code does not look right.");
  }

  const chosen =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().slice(0, 40)
      : displayName(user);

  const db = serviceClient();
  if (!db) return mobileError(503, "Study circles are not configured.");

  const { data: circle, error } = await db
    .from("tb_circles")
    .select("id, name, owner_id, invite_code, created_at")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) return mobileError(500, "The invite could not be read.");
  if (!circle) return mobileError(404, "No circle uses that code.");

  const { error: joinError } = await db.from("tb_circle_members").upsert(
    { circle_id: circle.id, user_id: user.id, name: chosen },
    { onConflict: "circle_id,user_id", ignoreDuplicates: true },
  );

  if (joinError) return mobileError(500, "The circle could not be joined.");

  return mobileJson({
    ok: true,
    circle: {
      id: circle.id,
      name: circle.name,
      inviteCode: circle.invite_code,
      isOwner: circle.owner_id === user.id,
      createdAt: circle.created_at,
    },
  });
}
