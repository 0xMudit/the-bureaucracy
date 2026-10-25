import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, Settings2 } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { listNotifications, unreadNotificationCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Notifications</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Your desk, quietly.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Sign in to keep the 7am brief, replies, comment likes and follows in one place.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/login?next=/notifications">
              <Bell className="size-3.5" /> Log in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 50),
    unreadNotificationCount(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to the wire
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <Bell className="size-3.5" /> Your desk
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            Notifications.
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            At most two pushes a day. Everything else waits here.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
          <Link href="/account/notifications">
            <Settings2 className="size-3.5" /> Preferences
          </Link>
        </Button>
      </div>

      <div className="mt-5">
        <NotificationCenter initial={notifications} initialUnread={unread} />
      </div>

      <p className="mt-5 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Push delivery needs the browser permission and a configured VAPID pair on the deployment. In-app
        notifications work regardless.
      </p>
    </div>
  );
}
