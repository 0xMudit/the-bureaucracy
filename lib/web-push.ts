import webpush from "web-push";
import { serviceClient } from "./store";

/**
 * Web Push (VAPID).
 *
 * Push is the retention cue, not a firehose. Every send passes three gates:
 * the per-type preference, quiet hours in the reader's timezone, and a hard
 * cap of two deliveries in any rolling 24 hours. Endpoints the push service
 * reports as gone are deleted immediately.
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  kind:
    | "daily_brief"
    | "streak_at_risk"
    | "reply"
    | "comment_like"
    | "follow"
    | "location_alert"
    | "campaign"
    | "system";
}

let configured: boolean | null = null;

export function webPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  if (!webPushConfigured()) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT as string,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

const PREF_KEY: Record<PushPayload["kind"], string> = {
  daily_brief: "daily_brief",
  streak_at_risk: "streak_at_risk",
  reply: "replies",
  comment_like: "comment_likes",
  follow: "follows",
  location_alert: "location_alerts",
  campaign: "daily_brief",
  system: "daily_brief",
};

function minutesOf(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function localMinutes(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    // IST fallback, the product's default.
    const now = new Date(Date.now() + 5.5 * 3_600_000);
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

function inQuietHours(start: string, end: string, timezone: string): boolean {
  const now = localMinutes(timezone);
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from === to) return false;
  if (from < to) return now >= from && now < to;
  // Window crosses midnight (the default 22:30 → 07:00).
  return now >= from || now < to;
}

export interface PushResult {
  sent: number;
  failed: number;
  skipped: number;
  reason?: string;
}

/** Send one notification to one reader's live subscriptions. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, skipped: 0, reason: "vapid not configured" };

  const db = serviceClient();
  if (!db) return { sent: 0, failed: 0, skipped: 0, reason: "no database" };

  const [{ data: prefs }, { data: subscriptions }, { count: recent }] = await Promise.all([
    db
      .from("notification_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", userId)
      .limit(12),
    db
      .from("push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);

  if (!subscriptions?.length) return { sent: 0, failed: 0, skipped: 0, reason: "no subscriptions" };

  let allowed = subscriptions.length;
  if (prefs) {
    const key = PREF_KEY[payload.kind];
    if (prefs[key] === false) return { sent: 0, failed: 0, skipped: subscriptions.length, reason: "preference off" };
    const timezone = String(prefs.timezone ?? "Asia/Kolkata");
    if (inQuietHours(String(prefs.quiet_start ?? "22:30"), String(prefs.quiet_end ?? "07:00"), timezone)) {
      return { sent: 0, failed: 0, skipped: subscriptions.length, reason: "quiet hours" };
    }
    const cap = Math.max(0, Math.min(2, Number(prefs.max_per_day ?? 2)));
    if ((recent ?? 0) >= cap) {
      return { sent: 0, failed: 0, skipped: subscriptions.length, reason: "daily cap" };
    }
    // The cap counts deliveries, not endpoints: one push to three devices is
    // still three interruptions.
    allowed = Math.max(0, cap - (recent ?? 0));
    if (allowed === 0) return { sent: 0, failed: 0, skipped: subscriptions.length, reason: "daily cap" };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    tag: payload.tag ?? `tb-${payload.kind}`,
  });

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  for (const row of subscriptions.slice(0, allowed)) {
    try {
      await webpush.sendNotification(
        {
          endpoint: String(row.endpoint),
          keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
        },
        body,
        { TTL: 60 * 60 * 12, urgency: payload.kind === "reply" ? "high" : "normal" },
      );
      sent += 1;
      await db.from("push_deliveries").insert({
        user_id: userId,
        kind: payload.kind,
        endpoint: String(row.endpoint),
        status: "sent",
      });
    } catch (error) {
      failed += 1;
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(String(row.endpoint));
      await db.from("push_deliveries").insert({
        user_id: userId,
        kind: payload.kind,
        endpoint: String(row.endpoint),
        status: "failed",
        detail: error instanceof Error ? error.message.slice(0, 200) : "send failed",
      });
    }
  }

  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, failed, skipped: 0 };
}

/** Fan out a campaign to every opted-in reader, respecting the same gates. */
export async function sendPushToAll(payload: PushPayload, limit = 500): Promise<PushResult> {
  const db = serviceClient();
  if (!db) return { sent: 0, failed: 0, skipped: 0, reason: "no database" };
  const { data } = await db.from("push_subscriptions").select("user_id").not("user_id", "is", null).limit(limit);
  const userIds = [...new Set((data ?? []).map((row) => String(row.user_id)))];
  const total: PushResult = { sent: 0, failed: 0, skipped: 0 };
  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    total.sent += result.sent;
    total.failed += result.failed;
    total.skipped += result.skipped;
  }
  return total;
}
