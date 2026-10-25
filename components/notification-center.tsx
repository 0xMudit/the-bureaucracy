"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCheck,
  Flame,
  Info,
  MapPin,
  Megaphone,
  MessageSquare,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { markNotificationsReadAction } from "@/app/social-actions";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  daily_brief: BellRing,
  streak_at_risk: Flame,
  reply: MessageSquare,
  comment_like: ThumbsUp,
  follow: UserPlus,
  location_alert: MapPin,
  campaign: Megaphone,
  system: Info,
};

export function NotificationCenter({
  initial,
  initialUnread,
}: {
  initial: NotificationItem[];
  initialUnread: number;
}) {
  const [items, setItems] = React.useState(initial);
  const [unread, setUnread] = React.useState(initialUnread);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          ok: boolean;
          notifications?: NotificationItem[];
          unread?: number;
        };
        if (cancelled || !payload.ok || !Array.isArray(payload.notifications)) return;
        setItems(payload.notifications);
        setUnread(payload.unread ?? 0);
      } catch {
        // The page still works from the server-rendered copy.
      }
    };
    const timer = window.setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const markAll = () => {
    if (pending) return;
    const stamp = new Date().toISOString();
    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? stamp })));
    setUnread(0);
    startTransition(async () => {
      try {
        await markNotificationsReadAction();
        toast.success("All caught up.");
      } catch {
        setItems(previous);
        toast.error("Could not mark them read. Try again.");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          {unread ? `${unread} unread` : "Nothing unread"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={markAll}
          disabled={pending || unread === 0}
          className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]"
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </Button>
      </div>

      {items.length ? (
        <ol className="divide-y divide-border/60">
          {items.map((item) => {
            const Icon = ICONS[item.kind] ?? Info;
            const unreadItem = !item.readAt;
            return (
              <li key={item.id}>
                <Link
                  href={item.url}
                  className={cn(
                    "flex gap-3 px-1 py-3.5 transition-colors hover:bg-accent/30",
                    unreadItem && "bg-primary/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center border",
                      unreadItem ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("text-[13px] leading-snug", unreadItem ? "font-medium text-foreground" : "text-foreground/80")}>
                        {item.title}
                      </span>
                      {unreadItem ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                    </span>
                    {item.body ? (
                      <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-b border-border/60 py-12 text-center">
          <BellRing className="mx-auto size-5 text-muted-foreground" />
          <p className="display mt-3 text-2xl">Nothing on the desk.</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
            Replies, likes on your comments, new followers and the 7am brief will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
