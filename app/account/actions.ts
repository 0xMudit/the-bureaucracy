"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminEmail } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/store";

export interface SettingsState {
  error?: string;
  ok?: string;
}

export interface DeleteState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanName(value: string): string {
  return value.replace(/[<>\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);
}

export async function updateNameAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to change your display name." };

  const name = cleanName(String(formData.get("name") ?? ""));
  if (name.length < 2) return { error: "Use at least 2 characters for the display name." };

  const db = serviceClient();
  if (!db) return { error: "The database is not connected on this deployment." };

  const { error } = await db.from("tb_profiles").update({ display_name: name }).eq("id", user.id);
  if (error) return { error: "The display name could not be saved." };

  // Keep auth metadata in step with the profile so future sessions agree.
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.updateUser({ data: { display_name: name } });
  } catch {
    // The profile is authoritative; metadata is a convenience.
  }

  revalidatePath("/", "layout");
  return { ok: "Display name saved." };
}

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to change your password." };

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (password.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (password !== confirm) return { error: "The two new passwords do not match." };
  if (password === current) return { error: "Choose a password different from the current one." };

  const limit = rateLimit(`password:${clientKey(await headers())}`, 5, 30 * 60_000);
  if (!limit.ok) return { error: "Too many attempts. Wait a few minutes and try again." };

  try {
    const supabase = await createSupabaseServer();

    // Prove the current password before replacing it, then restore the session
    // the re-authentication created.
    const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauth.error) return { error: "The current password is not correct." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };

    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  } catch {
    return { error: "The password could not be changed. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: "Password changed. Other devices were signed out." };
}

/**
 * Change the address on the account. Supabase sends a confirmation to the new
 * address (and, when secure email change is on, an approval to the old one).
 * The profile email is kept in step by the `tb_on_auth_user_email_changed`
 * trigger once the change is confirmed.
 */
export async function changeEmailAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to change your email address." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const current = String(formData.get("current") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (email === user.email.toLowerCase()) return { error: "That is already the address on this account." };
  if (!current) return { error: "Enter your current password to prove it is you." };

  const limit = rateLimit(`email:${clientKey(await headers())}`, 3, 60 * 60_000);
  if (!limit.ok) {
    return { error: `Too many email changes. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
  }

  try {
    const supabase = await createSupabaseServer();

    const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauth.error) return { error: "The current password is not correct." };

    const origin = SITE.url.replace(/\/+$/, "");
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${origin}/auth/confirm?type=email_change` },
    );

    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("already") || text.includes("registered")) {
        return { error: "That address already belongs to an account." };
      }
      if (text.includes("rate limit") || text.includes("too many")) {
        return { error: "Too many requests. Wait a few minutes and try again." };
      }
      return { error: "The address could not be changed. Try again." };
    }
  } catch {
    return { error: "The address could not be changed. Try again." };
  }

  revalidatePath("/", "layout");
  return {
    ok: "Check the new inbox to confirm the address. If secure email change is on, approve it from the old inbox too. Open the link in this browser.",
  };
}

/**
 * Permanently delete the signed-in account. Requires the password and the word
 * DELETE. The deployment editor address is protected, and an admin cannot
 * delete the last active admin.
 */
export async function deleteAccountAction(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to delete your account." };
  if (isAdminEmail(user.email)) {
    return { error: "The deployment editor account cannot be deleted from the app. Remove it from ADMIN_EMAILS first." };
  }

  const current = String(formData.get("current") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!current) return { error: "Enter your password to confirm." };
  if (confirm !== "DELETE") return { error: "Type DELETE to confirm." };

  const limit = rateLimit(`delete:${clientKey(await headers())}`, 3, 60 * 60_000);
  if (!limit.ok) return { error: "Too many attempts. Wait a few minutes and try again." };

  const db = serviceClient();
  if (!db) return { error: "The database is not connected on this deployment." };

  if (user.role === "admin") {
    const { count } = await db
      .from("tb_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) return { error: "This is the last active admin. Promote another admin before deleting it." };
  }

  try {
    const supabase = await createSupabaseServer();
    const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauth.error) return { error: "The password is not correct." };

    // The service role removes the auth user; the profile and sessions cascade.
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) return { error: "The account could not be deleted. Try again." };

    await supabase.auth.signOut().catch(() => undefined);
  } catch {
    return { error: "The account could not be deleted. Try again." };
  }

  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}

export async function signOutEverywhereAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // The cookie is cleared locally by proxy on the next request anyway.
  }
  revalidatePath("/", "layout");
  redirect("/");
}
