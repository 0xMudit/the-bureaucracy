"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, safeNext } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cleanDisplayName, normalizeUsername, parseAvatarJson, RESERVED_USERNAMES } from "@/lib/profile";
import { serviceClient } from "@/lib/store";

export interface OnboardingState {
  error?: string;
}

export async function onboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to finish your profile." };

  const displayName = cleanDisplayName(String(formData.get("name") ?? ""));
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const avatar = parseAvatarJson(formData.get("avatar"));
  const next = safeNext(String(formData.get("next") ?? "/"), "/");

  if (displayName.length < 2) return { error: "Use at least 2 characters for your byline." };
  if (username.length < 3 || username.length > 32) {
    return { error: "Usernames need 3–32 letters, numbers or underscores." };
  }
  if (RESERVED_USERNAMES.has(username)) return { error: "That username is reserved. Try another." };
  if (!avatar) return { error: "Choose an avatar before continuing." };

  const db = serviceClient();
  if (!db) return { error: "The database is not connected on this deployment." };

  const { error } = await db
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      avatar_config: avatar,
      onboarded_at: new Date().toISOString(),
      onboard_skipped_at: null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is taken. Try another." };
    return { error: "Your profile could not be saved. Try again." };
  }

  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.updateUser({ data: { display_name: displayName } });
  } catch {
    // The profile remains authoritative.
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function skipOnboardingAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/welcome");
  const next = safeNext(String(formData.get("next") ?? "/"), "/");

  const db = serviceClient();
  if (db) {
    await db
      .from("profiles")
      .update({ onboard_skipped_at: new Date().toISOString() })
      .eq("id", user.id);
  }
  revalidatePath("/", "layout");
  redirect(next);
}
