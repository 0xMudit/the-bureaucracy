import { isAdminEmail } from "@/lib/auth";
import { mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { hashKey, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";
import { supabaseAuthConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * DELETE /api/mobile/account  { password, confirm }
 *
 * Permanently deletes the signed-in account. The app asks for the password and
 * the word DELETE, then this route re-authenticates against GoTrue before the
 * service role removes the user: a leaked access token alone cannot destroy an
 * account. Mirrors the web `deleteAccountAction`.
 *
 * The profile and its dependent rows cascade from the auth user, so there is no
 * separate cleanup step.
 */
export async function DELETE(request: Request) {
  const user = await mobileUser(request);
  if (!user?.email) {
    return mobileError(401, "Sign in again to delete your account.");
  }

  const limit = await rateLimit(`mobile:delete:${hashKey(user.id)}`, 3, 60 * 60_000);
  if (!limit.ok) {
    return mobileJson(
      {
        ok: false,
        error: "Too many attempts. Wait a while and try again.",
        retryAfter: limit.retryAfter,
      },
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
  const password = typeof raw.password === "string" ? raw.password : "";
  const confirm = typeof raw.confirm === "string" ? raw.confirm.trim().toUpperCase() : "";

  if (!password) return mobileError(400, "Enter your password to confirm.");
  if (confirm !== "DELETE") return mobileError(400, "Type DELETE to confirm.");

  if (isAdminEmail(user.email)) {
    return mobileError(
      403,
      "The deployment editor account cannot be deleted from the app. Remove it from ADMIN_EMAILS first.",
    );
  }

  const db = serviceClient();
  const config = supabaseAuthConfig();
  if (!db || !config) {
    return mobileError(503, "Account deletion is not configured on this deployment.");
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return mobileError(
        409,
        "This is the last active admin. Promote another admin before deleting it.",
      );
    }
  }

  try {
    // Re-authenticate: possession of a refresh token is not enough proof of
    // identity for an irreversible action.
    const verify = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.key, "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
      cache: "no-store",
    });
    if (!verify.ok) {
      return mobileError(403, "The password is not correct.");
    }

    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) {
      return mobileError(502, "The account could not be deleted. Try again.");
    }
  } catch {
    return mobileError(502, "The account could not be deleted. Try again.");
  }

  return mobileJson({ ok: true });
}
