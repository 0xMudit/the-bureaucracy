import { serviceClient } from "@/lib/store";
import { notify } from "@/lib/social";
import { sendPushToAll, sendPushToUser } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Notification cron.
 *
 * Suggested schedule: 01:30 UTC (07:00 IST) for the brief, 13:30 UTC (19:00
 * IST) for the streak nudge. The route is idempotent: it will not create a
 * second brief or streak notification for the same IST day.
 */

const IST_OFFSET = 5.5 * 3_600_000;

function istDayKey(date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET).toISOString().slice(0, 10);
}

function istDayStart(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET).toISOString();
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: "Unauthorised." }, { status: 401 });
  }

  const db = serviceClient();
  if (!db) {
    return Response.json({ ok: false, error: "No database configured." }, { status: 503 });
  }

  const mode = new URL(request.url).searchParams.get("mode") ?? "all";
  const today = istDayKey();
  const dayStart = istDayStart();
  const summary: Record<string, unknown> = { ok: true, mode };

  const [
    { data: prefsRows },
    { data: profiles },
    { data: streaks },
    { data: todayNotifications },
    { data: items },
    { data: campaigns },
  ] = await Promise.all([
    db.from("notification_prefs").select("*").limit(2000),
    db.from("profiles").select("id,display_name,state,district").eq("status", "active").limit(2000),
    db.from("streaks").select("user_id,current_count,last_read_date").limit(2000),
    db
      .from("notifications")
      .select("user_id,kind")
      .in("kind", ["daily_brief", "streak_at_risk"])
      .gte("created_at", dayStart)
      .limit(4000),
    db
      .from("items")
      .select("id,title,primary_topic")
      .is("archived_at", null)
      .eq("hidden", false)
      .gte("published_at", new Date(Date.now() - 86_400_000).toISOString())
      .limit(300),
    db
      .from("notification_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(20),
  ]);

  const prefs = new Map((prefsRows ?? []).map((row) => [String(row.user_id), row]));
  const already = new Set((todayNotifications ?? []).map((row) => `${row.user_id}:${row.kind}`));
  const people = (profiles ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.display_name ?? "Reader"),
    state: row.state ? String(row.state) : null,
  }));

  /* ---------------------------- 7am brief ---------------------------- */
  if (mode === "all" || mode === "daily") {
    let sent = 0;
    for (const person of people) {
      if (already.has(`${person.id}:daily_brief`)) continue;
      const pref = prefs.get(person.id);
      if (pref && pref.daily_brief === false) continue;
      await notify({
        userId: person.id,
        kind: "daily_brief",
        title: "Today's five are ready",
        body: "Five stories ranked for the syllabus. Eight minutes, then close the tab.",
        url: "/#brief",
        data: { day: today },
      });
      await sendPushToUser(person.id, {
        kind: "daily_brief",
        title: "Today's five",
        body: "The wire has turned. Five stories, ranked for the syllabus.",
        url: "/#brief",
        tag: `tb-brief-${today}`,
      });
      sent += 1;
    }
    summary.daily = sent;
  }

  /* ------------------------ streak at risk --------------------------- */
  if (mode === "all" || mode === "streak") {
    let sent = 0;
    for (const streak of streaks ?? []) {
      const userId = String(streak.user_id);
      if (Number(streak.current_count ?? 0) < 1) continue;
      if (String(streak.last_read_date ?? "") >= today) continue;
      if (already.has(`${userId}:streak_at_risk`)) continue;
      const pref = prefs.get(userId);
      if (pref && pref.streak_at_risk === false) continue;
      await notify({
        userId,
        kind: "streak_at_risk",
        title: `Your ${streak.current_count}-day streak is at risk`,
        body: "One story before midnight keeps the chain. Today's five are still open.",
        url: "/#brief",
        data: { day: today },
      });
      await sendPushToUser(userId, {
        kind: "streak_at_risk",
        title: "One story keeps the chain",
        body: `Your ${streak.current_count}-day streak ends tonight. Today's five are still open.`,
        url: "/#brief",
        tag: `tb-streak-${today}`,
      });
      sent += 1;
    }
    summary.streak = sent;
  }

  /* ------------------------ location alerts -------------------------- */
  if (mode === "all" || mode === "location") {
    let sent = 0;
    const live = (items ?? []).filter((item) =>
      ["environment", "governance", "security"].includes(String(item.primary_topic ?? "")),
    );
    for (const person of people) {
      if (!person.state) continue;
      const pref = prefs.get(person.id);
      if (pref && pref.location_alerts !== true) continue;
      const match = live.find((item) =>
        String(item.title ?? "").toLowerCase().includes(person.state!.toLowerCase()),
      );
      if (!match) continue;
      await notify({
        userId: person.id,
        kind: "location_alert",
        title: `For ${person.state}: ${String(match.title).slice(0, 110)}`,
        body: "A live story tagged for your state. Open the wire to read it.",
        url: `/item/${match.id}`,
        data: { itemId: match.id, state: person.state },
      });
      await sendPushToUser(person.id, {
        kind: "location_alert",
        title: `${person.state} · local wire`,
        body: String(match.title).slice(0, 140),
        url: `/item/${match.id}`,
        tag: "tb-location",
      });
      sent += 1;
    }
    summary.location = sent;
  }

  /* ------------------------- campaigns ------------------------------- */
  if (mode === "all" || mode === "campaign") {
    let sentCampaigns = 0;
    for (const campaign of campaigns ?? []) {
      if (people.length) {
        await db.from("notifications").insert(
          people.map((person) => ({
            user_id: person.id,
            kind: "campaign",
            title: String(campaign.title),
            body: String(campaign.body),
            url: String(campaign.url ?? "/"),
            data: { campaignId: String(campaign.id) },
          })),
        );
      }

      const result = await sendPushToAll({
        kind: "campaign",
        title: String(campaign.title),
        body: String(campaign.body),
        url: String(campaign.url ?? "/"),
        tag: `tb-campaign-${campaign.id}`,
      });

      await db
        .from("notification_campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);
      sentCampaigns += 1;
      summary.campaigns = { sentCampaigns, delivered: result.sent };
    }
    summary.campaigns = summary.campaigns ?? sentCampaigns;
  }

  return Response.json(summary, { headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
