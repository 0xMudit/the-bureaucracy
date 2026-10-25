"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { serviceClient } from "@/lib/store";

export interface PrefState {
  ok?: string;
  error?: string;
}

const BOOLEAN_FIELDS = [
  ["dailyBrief", "daily_brief"],
  ["streakAtRisk", "streak_at_risk"],
  ["replies", "replies"],
  ["commentLikes", "comment_likes"],
  ["follows", "follows"],
  ["locationAlerts", "location_alerts"],
] as const;

function timeValue(raw: FormDataEntryValue | null, fallback: string): string {
  const value = String(raw ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fallback;
  return value;
}

export async function updateNotificationPrefsAction(
  _prev: PrefState,
  formData: FormData,
): Promise<PrefState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to change notifications." };

  const db = serviceClient();
  if (!db) return { error: "The database is not connected on this deployment." };

  const patch: Record<string, unknown> = {
    user_id: user.id,
    quiet_start: timeValue(formData.get("quietStart"), "22:30"),
    quiet_end: timeValue(formData.get("quietEnd"), "07:00"),
    timezone: String(formData.get("timezone") ?? "Asia/Kolkata").slice(0, 60) || "Asia/Kolkata",
    max_per_day: Math.max(0, Math.min(2, Number(formData.get("maxPerDay") ?? 2))),
    updated_at: new Date().toISOString(),
  };
  for (const [formKey, column] of BOOLEAN_FIELDS) {
    patch[column] = String(formData.get(formKey) ?? "false") === "true";
  }

  const { error } = await db.from("notification_prefs").upsert(patch, { onConflict: "user_id" });
  if (error) return { error: "The preferences could not be saved. Try again." };

  revalidatePath("/account/notifications");
  return { ok: "Notification preferences saved." };
}

export async function updateLocationAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const db = serviceClient();
  if (!db) return;

  const state = String(formData.get("state") ?? "")
    .replace(/[<>\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  const district = String(formData.get("district") ?? "")
    .replace(/[<>\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  await db
    .from("profiles")
    .update({ state: state || null, district: district || null })
    .eq("id", user.id);
  revalidatePath("/account/notifications");
}
