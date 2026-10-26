import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, Clock, Send, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSessionUser, userCan } from "@/lib/auth";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Push campaigns · The desk",
  robots: { index: false, follow: false },
};

/**
 * DEMO DATA: Campaign delivery stats are representative until the
 * tb_push_campaigns table is seeded with real data.
 */
const DEMO_CAMPAIGNS = [
  { id: "1", title: "Today's five are ready", type: "daily_brief", sent: 148, delivered: 141, clicked: 67, sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "2", title: "Streak at risk — read one more story", type: "streak_nudge", sent: 33, delivered: 31, clicked: 19, sentAt: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString() },
  { id: "3", title: "Today's five are ready", type: "daily_brief", sent: 134, delivered: 129, clicked: 58, sentAt: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString() },
];

const TYPE_LABEL: Record<string, string> = {
  daily_brief: "Daily brief",
  streak_nudge: "Streak nudge",
  reply: "Reply",
  follow: "Follow",
  location: "Local alert",
  manual: "Manual",
};

type CampaignRow = typeof DEMO_CAMPAIGNS[number];

export default async function AdminPushPage() {
  const user = await getSessionUser();
  if (!user || !userCan(user, "admin.dashboard")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Not accessible.</h1>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">Back to the desk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const db = serviceClient();
  let campaigns: CampaignRow[] = DEMO_CAMPAIGNS;
  let subscriberCount = 0;
  let hasRealData = false;

  if (db) {
    const [subsRes, campaignsRes] = await Promise.all([
      db.from("push_subscriptions").select("id", { count: "exact", head: true }).then((r) => r, () => ({ count: 0 })),
      db
        .from("tb_push_campaigns")
        .select("id,title,type,sent,delivered,clicked,sent_at")
        .order("sent_at", { ascending: false })
        .limit(20)
        .then((r) => r, () => ({ data: null })),
    ]);
    subscriberCount = (subsRes as { count: number | null }).count ?? 0;
    if (campaignsRes.data && Array.isArray(campaignsRes.data) && campaignsRes.data.length > 0) {
      campaigns = (campaignsRes.data as { id: string; title: string; type: string; sent: number; delivered: number; clicked: number; sent_at: string }[]).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        sent: r.sent,
        delivered: r.delivered,
        clicked: r.clicked,
        sentAt: r.sent_at,
      }));
      hasRealData = true;
    }
  }

  const avgDeliveryRate =
    campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + (c.sent > 0 ? c.delivered / c.sent : 0), 0) / campaigns.length * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <Bell className="size-3.5" /> Push notifications
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Campaigns.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Web push to subscribers. Max 2 pushes per day; quiet hours respected. iOS requires PWA install.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Subscribers", value: subscriberCount || "–", icon: Smartphone },
          { label: "Campaigns sent", value: campaigns.length, icon: Send },
          { label: "Avg delivery rate", value: `${avgDeliveryRate}%`, icon: CheckCircle2 },
          { label: "Frequency cap", value: "2 / day", icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 font-display text-[1.8rem] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Manual push form */}
      <div className="mt-6 border border-border bg-card p-4">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Send a manual notification
        </h2>
        <form
          action="/api/notifications/run"
          method="POST"
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Title
            </span>
            <Input name="title" placeholder="Today's five are ready" className="h-9 rounded-sm text-sm" required />
          </label>
          <label className="flex-1">
            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Body
            </span>
            <Input
              name="body"
              placeholder="Five ranked stories, ready to read."
              className="h-9 rounded-sm text-sm"
            />
          </label>
          <Button
            type="submit"
            className="h-9 shrink-0 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]"
          >
            <Send className="size-3.5" /> Send now
          </Button>
        </form>
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
          Respects per-user frequency cap. Will not send to users who already received 2 pushes today.
        </p>
      </div>

      {/* Campaign history */}
      <div className="mt-5">
        <h2 className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Campaign history</span>
          {!hasRealData && (
            <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[8px] text-warning">
              Demo data
            </span>
          )}
        </h2>
        <div className="mt-2 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-3 py-2 font-normal">Title</th>
                <th className="px-3 py-2 font-normal">Type</th>
                <th className="px-3 py-2 font-normal">Sent</th>
                <th className="px-3 py-2 font-normal">Delivered</th>
                <th className="px-3 py-2 font-normal">Clicked</th>
                <th className="px-3 py-2 font-normal">When</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const deliveryRate = c.sent > 0 ? Math.round((c.delivered / c.sent) * 100) : 0;
                const clickRate = c.delivered > 0 ? Math.round((c.clicked / c.delivered) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 text-[12.5px] font-medium">{c.title}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="font-mono text-[8px] uppercase tracking-[0.08em]">
                        {TYPE_LABEL[c.type] ?? c.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{c.sent}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                      {c.delivered}{" "}
                      <span className="text-[8px] text-success">{deliveryRate}%</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                      {c.clicked}{" "}
                      <span className="text-[8px] text-primary">{clickRate}%</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {timeAgo(c.sentAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 border border-dashed border-border px-4 py-3">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
          Requires VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT in env vars. Generate with:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[8px]">npx web-push generate-vapid-keys</code>
        </p>
      </div>
    </div>
  );
}
