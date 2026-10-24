"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail, logAuthEvent, safeNext } from "@/lib/auth";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/store";

export interface AuthState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (text.includes("email not confirmed")) return "Confirm your email address before signing in.";
  if (text.includes("already registered") || text.includes("already exists")) {
    return "That email already has an account. Sign in instead.";
  }
  if (text.includes("password") && text.includes("least")) return "Use at least 8 characters for the password.";
  if (text.includes("rate limit") || text.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  return message;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };
  if (!authConfigured()) return { error: "Accounts are not configured on this deployment yet." };

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendly(error.message) };
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

  const db = serviceClient();
  if (!db) return { error: "The database is not connected yet." };

  try {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error) return { error: friendly(error.message) };
    if (!data.user) return { error: "The account could not be created." };

    await db.from("tb_profiles").upsert(
      {
        id: data.user.id,
        email,
        display_name: name,
        role: isAdminEmail(email) ? "editor" : "reader",
      },
      { onConflict: "id" },
    );
    await logAuthEvent({ userId: data.user.id, email, kind: "signup" });

    const supabase = await createSupabaseServer();
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      return { error: "Account created. Sign in with your email and password." };
    }
  } catch {
    return { error: "Could not create the account. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(next);
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
