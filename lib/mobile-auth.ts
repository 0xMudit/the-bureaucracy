import { serviceClient } from "./store";

/**
 * The mobile app authenticates with the Supabase access token it already holds.
 * There is no second auth system and no session cookie: the token is verified
 * against the same project the web app uses, then the route acts with the
 * service role.
 *
 * `getUser(token)` is a network call, so callers should only use this on routes
 * that genuinely need an account (state sync, circles, push registration). The
 * public wire stays anonymous.
 */
export interface MobileUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function mobileUser(request: Request): Promise<MobileUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;

  const db = serviceClient();
  if (!db) return null;

  const { data, error } = await db.auth.getUser(match[1].trim());
  if (error || !data.user) return null;

  const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    typeof metadata.name === "string"
      ? metadata.name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : null;

  return { id: data.user.id, email: data.user.email ?? null, name };
}

/** A stable, human-readable label for a member with no chosen name. */
export function displayName(user: MobileUser | null): string {
  if (user?.name?.trim()) return user.name.trim().slice(0, 40);
  if (user?.email) return user.email.split("@")[0].slice(0, 40);
  return "Reader";
}
