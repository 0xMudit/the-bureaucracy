import { cache } from "react";
import { cookies } from "next/headers";
import { SITE } from "@/lib/config";
import { serviceClient } from "@/lib/store";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";

export type Role = "reader" | "editor";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
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
 * The signed-in user, joined with their profile. Cached per request so the
 * header, page and actions share a single auth call.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!authConfigured()) return null;

  let userId: string;
  let email: string;
  try {
    // No Supabase session cookie means no user — skip the auth round trip
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

  let profile: { display_name: string | null; role: string | null } | null = null;

  const db = serviceClient();
  if (db) {
    const { data } = await db
      .from("tb_profiles")
      .select("display_name, role")
      .eq("id", userId)
      .maybeSingle();
    profile = data;
  }

  const role: Role = profile?.role === "editor" || isAdminEmail(email) ? "editor" : "reader";
  const fallbackName = email ? email.split("@")[0].replace(/[._-]+/g, " ") : "Reader";

  return {
    id: userId,
    email,
    name: profile?.display_name?.trim() || fallbackName,
    role,
  };
});

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
        .from("tb_profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", input.userId);
    }
  } catch {
    // Analytics must never break a sign-in.
  }
}

/** Only allow same-origin, path-style redirects. */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  const next = (value ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
