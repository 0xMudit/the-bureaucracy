import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { NotificationPrefsForm } from "@/components/notification-prefs";
import { getSessionUser } from "@/lib/auth";
import { getNotificationPrefs } from "@/lib/social";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notification preferences",
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/notifications");

  const prefs = await getNotificationPrefs(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Account
      </Link>

      <div className="mt-4 border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <Bell className="size-3.5" /> Delivery
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.6rem]">
          Notifications.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          The product earns attention; it does not demand it. Every type is optional, quiet hours are
          enforced, and the deployment never sends more than two pushes a day.
        </p>
      </div>

      <div className="mt-5">
        <NotificationPrefsForm
          initial={prefs}
          location={{ state: user.state, district: user.district }}
        />
      </div>

      <p className="mt-5 border-l-2 border-border pl-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Push delivery on iPhone and iPad requires the site to be installed from Safari via Share → Add to
        Home Screen. Android, Chrome, Edge, Firefox and desktop Safari work directly. If notifications were
        blocked, the address bar&apos;s site settings is the only way back in; browsers do not allow a site
        to ask twice.
      </p>
    </div>
  );
}
