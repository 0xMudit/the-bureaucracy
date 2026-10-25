import { cache } from "react";
import { cookies } from "next/headers";
import { SITE } from "@/lib/config";
import { normalizeAvatarConfig, type AvatarConfig } from "@/lib/avatar";
import { hasPermission, normalizeRole, type Permission, type Role } from "@/lib/rbac";
import { serviceClient } from "@/lib/store";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";

export type { Permission, Role };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  username: string | null;
  avatar: AvatarConfig | null;
  onboardedAt: string | null;
  onboardSkippedAt: string | null;
  publicSaves: boolean;
  state: string | null;
  district: string | null;
}

/** Emails that are always treated as editors, on top of the database role. */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!list.includes(SITE.editor.email.toLowerCase())) list.push(SITE.editor.email.toLowerCase());
  return list;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * The role that actually applies to a request. An address in ADMIN_EMAILS is
 * always an admin, even before `npm run auth:admins` has promoted the row.
 */
export function resolveRole(email: string | null | undefined, dbRole: unknown): Role {
  if (isAdminEmail(email)) return "admin";
  return normalizeRole(dbRole);
}

/**
 * The signed-in user, joined with their profile. Cached per request so the
 * header, page and actions share a single auth call.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!authConfigured()) return null;

  let userId: string;
  let email: string;
  try {
    // No Supabase session cookie means no user â€” skip the auth round trip
    // entirely for anonymous readers.
    const jar = await cookies();
    const hasSession = jar.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
    if (!hasSession) return null;

    const supabase = await createSupabaseServer();
    // getClaims verifies the JWT locally against the project's JWKS instead of
    // asking the auth server on every render.
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    userId = data.claims.sub;
    email = typeof data.claims.email === "string" ? data.claims.email : "";
  } catch {
    return null;
  }

  let profile: {
    display_name: string | null;
    role: string | null;
    status: string | null;
    username: string | null;
    avatar_config: unknown;
    onboarded_at: string | null;
    onboard_skipped_at: string | null;
    public_saves: boolean | null;
    state: string | null;
    district: string | null;
  } | null = null;
  const fallbackName = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "Reader";

  const db = serviceClient();
  if (db) {
    const { data } = await db
      .from("profiles")
      .select("display_name, role, status, username, avatar_config, onboarded_at, onboard_skipped_at, public_saves, state, district")
      .eq("id", userId)
      .maybeSingle();
    profile = data;

    // Self-heal accounts created before the trigger existed (or by an admin
    // API call that bypassed it). The insert is idempotent and never promotes.
    // `username` is not-null after the social migration, so generate one here
    // rather than allowing a stranded account.
    if (!profile) {
      try {
        await db
          .from("profiles")
          .upsert(
            {
              id: userId,
              email,
              display_name: fallbackName.slice(0, 48),
              username: `reader_${userId.replace(/-/g, "").slice(0, 8)}`,
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
      } catch {
        // A transient write failure must not lock the reader out.
      }
    }
  }

  // A suspension is enforced on every request, not just at sign-in: an existing
  // cookie stops resolving to a user the moment the flag is flipped.
  if (profile?.status === "suspended") return null;

  const role = resolveRole(email, profile?.role);

  return {
    id: userId,
    email,
    name: profile?.display_name?.trim() || fallbackName,
    role,
    username: profile?.username ?? null,
    avatar: normalizeAvatarConfig(profile?.avatar_config),
    onboardedAt: profile?.onboarded_at ?? null,
    onboardSkippedAt: profile?.onboard_skipped_at ?? null,
    publicSaves: profile?.public_saves !== false,
    state: profile?.state ?? null,
    district: profile?.district ?? null,
  };
});

/** Server-side permission check for pages, actions and route handlers. */
export function userCan(user: SessionUser | null | undefined, permission: Permission): boolean {
  return Boolean(user && hasPermission(user.role, permission));
}

export async function logAuthEvent(input: {
  userId: string | null;
  email: string | null;
  kind: "signup" | "login" | "logout";
}): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  try {
    await db.from("tb_login_events").insert({
      user_id: input.userId,
      email: input.email,
      kind: input.kind,
    });
    if (input.userId) {
      await db
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", input.userId);
    }
  } catch {
    // Analytics must never break a sign-in.
  }
}

/**
 * Only allow same-origin, path-style redirects. Rejects protocol-relative
 * (`//evil`), backslash (`/\evil`), encoded separators and control characters,
 * all of which a browser can turn into an off-site navigation.
 */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  const next = (value ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (/^\/%2f|^\/%5c/i.test(next)) return fallback;
  return next;
}

