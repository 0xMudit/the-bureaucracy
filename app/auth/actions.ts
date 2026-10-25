"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail, logAuthEvent, safeNext } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/store";

export interface AuthState {
  error?: string;
  /** Set when the password was right but the address still needs confirming. */
  email?: string;
  needsVerification?: boolean;
}

export interface ResendState {
  error?: string;
  sent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where Supabase sends the browser after it verifies the one-time token. */
function confirmUrl(): string {
  return `${SITE.url.replace(/\/+$/, "")}/auth/confirm`;
}

function friendly(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (text.includes("email not confirmed")) return "Confirm your email address before signing in.";
  if (text.includes("already registered") || text.includes("already exists")) {
    return "That email already has an account. Sign in instead.";
  }
  if (text.includes("password") && text.includes("least")) return "Use at least 8 characters for the password.";
  if (text.includes("rate limit") || text.includes("too many") || text.includes("security purposes")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (text.includes("expired") || text.includes("otp_expired")) {
    return "That verification link has expired. Send yourself a fresh one.";
  }
  return message;
}

function checkEmailPath(email: string, next: string): string {
  return `/auth/check-email?${new URLSearchParams({ email, next }).toString()}`;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };
  if (!authConfigured()) return { error: "Accounts are not configured on this deployment yet." };

  const limit = rateLimit(`login:${clientKey(await headers())}`, 15, 10 * 60_000);
  if (!limit.ok) return { error: "Too many sign-in attempts. Wait a few minutes and try again." };

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("email not confirmed")) {
        return {
          error: "This address has not been verified yet. Open the link we emailed you, or send a fresh one below.",
          email,
          needsVerification: true,
        };
      }
      return { error: friendly(error.message) };
    }

    // Supabase normally refuses unconfirmed accounts, but enforce it here too so
    // the rule survives a project with email confirmations switched off.
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        error: "Verify your email address before signing in. We can send a fresh link.",
        email,
        needsVerification: true,
      };
    }

    const db = serviceClient();
    if (db && data.user) {
      const { data: profile } = await db
        .from("tb_profiles")
        .select("role, status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.status === "suspended") {
        await supabase.auth.signOut();
        return { error: "This account has been suspended. Contact the editor if you think that is a mistake." };
      }

      // The auth trigger normally creates this row. If a project was migrated
      // mid-flight, create it here so the reader is never stranded.
      if (!profile) {
        await db.from("tb_profiles").upsert(
          {
            id: data.user.id,
            email,
            display_name: String(data.user.user_metadata?.display_name ?? email.split("@")[0] ?? "Reader").slice(0, 48),
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      }

      // An address in ADMIN_EMAILS is always an admin. Keep the row truthful.
      if (isAdminEmail(email) && profile?.role !== "admin") {
        await db.from("tb_profiles").update({ role: "admin" }).eq("id", data.user.id);
      }
    }

    await logAuthEvent({ userId: data.user?.id ?? null, email, kind: "login" });
  } catch {
    return { error: "Could not reach the sign-in service. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (name.length < 2) return { error: "Add a display name (at least 2 characters)." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };
  if (!authConfigured()) return { error: "Accounts are not configured on this deployment yet." };

  const signupLimit = rateLimit(`signup:${clientKey(await headers())}`, 5, 60 * 60_000);
  if (!signupLimit.ok) return { error: "Too many accounts created from this connection. Try again later." };

  try {
    const supabase = await createSupabaseServer();
    // `signUp` (not the admin API) is what triggers Supabase's confirmation
    // email. No session is returned until the token in that email is opened.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmUrl(),
        data: { display_name: name, signup_next: next },
      },
    });

    if (error) return { error: friendly(error.message) };
    if (!data.user) return { error: "The account could not be created." };

    // Supabase hides whether an address is already registered behind an empty
    // identities array (when email enumeration protection is on). Never let
    // that distinction change the response: the page always says "check your
    // inbox", so sign-up cannot be used to probe the register.
    const isNew = (data.user.identities?.length ?? 0) > 0;

    if (data.session) {
      // Confirmations are disabled on the project. Do not let an unverified
      // session through: the whole premise is that the address is proven first.
      await supabase.auth.signOut();
      return {
        error:
          "Email verification is switched off on this deployment, so the account was not activated. Ask the editor to enable confirmations in Supabase.",
      };
    }

    if (isNew) {
      const db = serviceClient();
      if (db) {
        await db
          .from("tb_profiles")
          .upsert(
            {
              id: data.user.id,
              email,
              display_name: name,
              role: isAdminEmail(email) ? "admin" : "reader",
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
        if (isAdminEmail(email)) {
          await db.from("tb_profiles").update({ role: "admin" }).eq("id", data.user.id);
        }
        await logAuthEvent({ userId: data.user.id, email, kind: "signup" });
      }
    }
  } catch {
    return { error: "Could not create the account. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(checkEmailPath(email, next));
}

export async function resendVerificationAction(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!authConfigured()) return { error: "Accounts are not configured on this deployment yet." };

  const limit = rateLimit(`resend:${clientKey(await headers())}`, 3, 10 * 60_000);
  if (!limit.ok) {
    return { error: `Too many requests. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
  }

  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmUrl() },
    });

    // An address that is already confirmed cannot be resent; it also must not
    // become an account-existence oracle. Treat both as "on its way".
    if (error && !/already confirmed/i.test(error.message)) {
      return { error: friendly(error.message) };
    }
  } catch {
    return { error: "Could not reach the mail service. Try again." };
  }

  return { sent: true };
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    await logAuthEvent({ userId: data.user?.id ?? null, email: data.user?.email ?? null, kind: "logout" });
    await supabase.auth.signOut();
  } catch {
    // Already signed out.
  }
  revalidatePath("/", "layout");
  redirect("/");
}
