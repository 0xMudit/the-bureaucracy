import { supabaseAuthConfig } from "@/lib/supabase/server";

/**
 * Revoke every refresh token for an auth user. The GoTrue admin endpoint is not
 * exposed by supabase-js's admin client (its `signOut` takes a JWT, not a user
 * id), so call it directly with the service-role key.
 *
 * The app already refuses a suspended profile on the next request; revoking the
 * tokens is defence in depth, so a stolen refresh token cannot keep minting
 * access tokens for a suspended account.
 */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  const config = supabaseAuthConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) return false;

  try {
    const response = await fetch(
      `${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
