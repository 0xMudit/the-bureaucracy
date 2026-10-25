import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser, userCan } from "@/lib/auth";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

type AdminEvent = {
  id: number;
  actor_email: string | null;
  target_email: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  "role.assign": "Role changed",
  "user.suspend": "Account suspended",
  "user.reactivate": "Account reactivated",
  "user.revoke": "Sessions revoked",
};

export default async function AdminAuditPage() {
  const actor = await getSessionUser();

  if (!actor || !userCan(actor, "audit.view")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Admins only.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            The audit trail is limited to admin accounts.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">Back to the desk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const db = serviceClient();
  if (!db) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <h1 className="display text-[2rem] leading-none">No database connected.</h1>
        </div>
      </div>
    );
  }

  const { data } = await db
    .from("tb_admin_events")
    .select("id, actor_email, target_email, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (data ?? []) as AdminEvent[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <ScrollText className="size-3.5" /> Administration
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          The paper trail.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Append-only record of role changes and suspensions. Newest first, last hundred entries.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-2 font-normal">When</th>
              <th className="px-3 py-2 font-normal">Action</th>
              <th className="px-3 py-2 font-normal">Target</th>
              <th className="px-3 py-2 font-normal">Change</th>
              <th className="px-3 py-2 font-normal">By</th>
            </tr>
          </thead>
          <tbody>
            {events.length ? (
              events.map((event) => (
                <tr key={event.id} className="border-b border-border/50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[9px] text-muted-foreground">
                    {timeAgo(event.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[9px] uppercase tracking-[0.06em] text-foreground">
                    {ACTION_LABEL[event.action] ?? event.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-[9px] text-muted-foreground">{event.target_email ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[9px] text-muted-foreground">{event.detail ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[9px] text-muted-foreground">{event.actor_email ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Nothing has been changed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
