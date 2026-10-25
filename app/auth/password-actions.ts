"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";

export interface ForgotState {
  error?: string;
  sent?: boolean;
}

export interface ResetState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteOrigin(): string {
  return SITE.url.replace(/\/+$/, "");
}

export async function requestPasswordResetAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!authConfigured()) return { error: "Accounts are not configured on this deployment yet." };

  const limit = rateLimit(`forgot:${clientKey(await headers())}`, 3, 15 * 60_000);
  if (!limit.ok) {
    return { error: `Too many reset requests. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
  }

  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Supabase appends `?code=…` to this URL. A dedicated route avoids
      // guessing whether the code arrives with `?` or `&` when the redirect
      // already carries a query string.
      redirectTo: `${siteOrigin()}/auth/recovery`,
    });

    const text = error?.message.toLowerCase() ?? "";
    if (error && (text.includes("rate limit") || text.includes("security purposes"))) {
      return { error: "Too many reset emails. Wait a few minutes and try again." };
    }
  } catch {
    return { error: "Could not reach the mail service. Try again." };
  }

  // Always the same answer: no account-existence oracle.
  return { sent: true };
}

export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const user = await getSessionUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one and try again." };
  }

  const limit = rateLimit(`reset:${clientKey(await headers())}`, 5, 30 * 60_000);
  if (!limit.ok) return { error: "Too many attempts. Wait a few minutes and try again." };

  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("same password")) return { error: "Choose a password different from the current one." };
      if (text.includes("weak") || text.includes("least")) {
        return { error: "Use at least 8 characters and avoid a password you have used elsewhere." };
      }
      if (text.includes("rate limit") || text.includes("too many")) {
        return { error: "Too many attempts. Wait a few minutes and try again." };
      }
      return { error: "The password could not be changed. Try again." };
    }

    // A password reset should end sessions on other devices. Keep this one.
    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  } catch {
    return { error: "The password could not be changed. Try again." };
  }

  revalidatePath("/", "layout");
  redirect("/account?password=1");
}
