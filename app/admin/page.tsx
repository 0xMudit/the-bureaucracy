import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, LogIn, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser, userCan } from "@/lib/auth";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editor's desk",
  robots: { index: false, follow: false },
};

const DAY = 86_400_000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-border bg-card px-3 py-3">
      <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-[1.8rem] leading-none ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Gate({ title, copy, cta }: { title: string; copy: string; cta: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="border border-border bg-card p-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
        <h1 className="display mt-1 text-[2rem] leading-none">{title}</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{copy}</p>
        <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Gate
        title="Sign in to the desk."
        copy="The editor's dashboard is private. Sign in with the editor account to see traffic, accounts and activity."
        cta={{ href: "/submit?next=/admin", label: "Log in" }}
      />
    );
  }

  if (!userCan(user, "admin.dashboard")) {
    return (
      <Gate
        title="Editors only."
        copy={`You are signed in as ${user.email}. This dashboard is limited to editor and admin accounts.`}
        cta={{ href: "/", label: "Back to the wire" }}
      />
    );
  }

  const db = serviceClient();
  if (!db) {
    return (
      <Gate
        title="No database connected."
        copy="Analytics and accounts need the Supabase service role key on this deployment."
        cta={{ href: "/", label: "Back to the wire" }}
      />
    );
  }

  const now = Date.now();
  const dayAgo = new Date(now - DAY).toISOString();
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const twoWeeksAgo = new Date(now - 14 * DAY).toISOString();

  const [
    visitsRes,
    loginsRes,
    profilesRes,
    commentsRes,
    newProfilesRes,
    itemsRes,
    totalsRes,
    editorsRes,
    adminsRes,
    suspendedRes,
  ] = await Promise.all([
    db
      .from("tb_visits")
      .select("path, visitor_id, user_id, created_at")
      .gte("created_at", twoWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(5000),
    db
      .from("tb_login_events")
      .select("email, kind, user_id, created_at")
      .gte("created_at", twoWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("tb_profiles")
      .select("id, email, display_name, role, created_at, last_seen_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(250),
    db.from("comments").select("id, item_id, author, body, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("tb_profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    db.from("items").select("id", { count: "exact", head: true }),
    db.from("tb_visits").select("id", { count: "exact", head: true }),
    db.from("tb_profiles").select("id", { count: "exact", head: true }).eq("role", "editor"),
    db.from("tb_profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    db.from("tb_profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  const visits = (visitsRes.data ?? []) as { path: string; visitor_id: string | null; user_id: string | null; created_at: string }[];
  const logins = (loginsRes.data ?? []) as { email: string | null; kind: string; user_id: string | null; created_at: string }[];
  const profiles = (profilesRes.data ?? []) as {
    id: string;
    email: string;
    display_name: string;
    role: string;
    created_at: string;
    last_seen_at: string | null;
  }[];
  const comments = (commentsRes.data ?? []) as { id: string; item_id: string; author: string; body: string; created_at: string }[];

  const visitsToday = visits.filter((visit) => visit.created_at >= dayAgo);
  const visitsWeek = visits.filter((visit) => visit.created_at >= weekAgo);
  const uniqueToday = new Set(visitsToday.map((visit) => visit.visitor_id).filter(Boolean)).size;
  const uniqueWeek = new Set(visitsWeek.map((visit) => visit.visitor_id).filter(Boolean)).size;
  const signedInVisits = visitsWeek.filter((visit) => visit.user_id).length;

  const loginsToday = logins.filter((event) => event.kind !== "logout" && event.created_at >= dayAgo);
  const loginsWeek = logins.filter((event) => event.kind !== "logout" && event.created_at >= weekAgo);
  const signupsWeek = logins.filter((event) => event.kind === "signup" && event.created_at >= weekAgo);

  const pathCounts = new Map<string, number>();
  for (const visit of visitsWeek) pathCounts.set(visit.path, (pathCounts.get(visit.path) ?? 0) + 1);
  const topPaths = [...pathCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date(now - i * DAY);
    days.push({
      key: dayKey(date),
      label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }),
      count: 0,
    });
  }
  const dayIndex = new Map(days.map((day, index) => [day.key, index]));
  for (const visit of visits) {
    const index = dayIndex.get(visit.created_at.slice(0, 10));
    if (index !== undefined) days[index].count += 1;
  }
  const peak = Math.max(1, ...days.map((day) => day.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Private · live
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            The editor&apos;s desk.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Accounts, sign-ins and traffic for the last fourteen days. Signed in as {user.email}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/admin">Refresh</Link>
          </Button>
          <Button asChild size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/">
              Open wire <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Visitors today" value={uniqueToday} hint={`${visitsToday.length} views`} accent />
        <Stat label="Visitors · 7d" value={uniqueWeek} hint={`${signedInVisits} signed-in views`} />
        <Stat label="Logins today" value={loginsToday.length} hint={`${loginsWeek.length} this week`} />
        <Stat label="Accounts" value={profilesRes.count ?? profiles.length} hint={`${newProfilesRes.count ?? 0} new · ${signupsWeek.length} joins/wk`} />
        <Stat label="Page views · 7d" value={visitsWeek.length} hint={`${totalsRes.count ?? 0} all time`} />
        <Stat label="Stories on wire" value={itemsRes.count ?? 0} hint="Last 24 hours" />
        <Stat label="Comments · 7d" value={comments.filter((comment) => comment.created_at >= weekAgo).length} hint="Latest shown below" />
        <Stat label="Editors" value={editorsRes.count ?? 0} hint="Role in database" />
        <Stat label="Admins" value={adminsRes.count ?? 0} hint="Role in database" accent />
        <Stat label="Suspended" value={suspendedRes.count ?? 0} hint="Cannot sign in" />
      </div>

      <section className="mt-6 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">Traffic · 14 days</h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {visits.length} views recorded
          </span>
        </div>
        <div className="px-3 pb-3 pt-4">
          <div className="flex h-32 items-end gap-1">
            {days.map((day) => (
              <div key={day.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(day.count ? 6 : 2, Math.round((day.count / peak) * 100))}%` }}
                  title={`${day.label}: ${day.count} views`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1">
            {days.map((day) => (
              <span key={day.key} className="flex-1 text-center font-mono text-[7.5px] uppercase text-muted-foreground/70">
                {day.label.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
              <Clock className="size-3 text-primary" /> Top pages · 7d
            </h2>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {pathCounts.size} paths
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {topPaths.length ? (
              topPaths.map((entry) => {
                const width = Math.max(4, Math.round((entry.count / Math.max(1, topPaths[0].count)) * 100));
                return (
                  <li key={entry.path} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-[10.5px] text-foreground/90">{entry.path}</span>
                      <span className="stat-tick shrink-0 font-mono text-[9.5px] text-muted-foreground">{entry.count}</span>
                    </div>
                    <div className="mt-1 h-0.5 w-full bg-muted">
                      <div className="h-0.5 bg-primary/70" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                No visits recorded yet
              </li>
            )}
          </ul>
        </section>

        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
              <LogIn className="size-3 text-primary" /> Recent sign-ins
            </h2>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {logins.length} events · 14d
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {logins.length ? (
              logins.slice(0, 8).map((event, index) => (
                <li key={`${event.created_at}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium">{event.email ?? "unknown"}</span>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      {event.kind} · {timeAgo(event.created_at)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] ${
                      event.kind === "signup" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {event.kind === "signup" ? "new" : event.kind === "logout" ? "out" : "in"}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                No sign-ins yet
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
              <Users className="size-3 text-primary" /> Accounts
            </h2>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {profiles.length} shown
            </span>
          </div>
          <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
            {profiles.length ? (
              profiles.slice(0, 20).map((profile) => (
                <li key={profile.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium">
                      {profile.display_name}
                      {profile.role !== "reader" ? <span className="ml-1.5 font-mono text-[8px] uppercase text-primary">{profile.role}</span> : null}
                    </span>
                    <span className="block truncate font-mono text-[8.5px] tracking-[0.06em] text-muted-foreground">{profile.email}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    {profile.last_seen_at ? timeAgo(profile.last_seen_at) : "never"}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                No accounts yet
              </li>
            )}
          </ul>
        </section>

        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
              <MessageSquare className="size-3 text-primary" /> Latest comments
            </h2>
            <Link href="/" className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
              Open wire
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {comments.length ? (
              comments.map((comment) => (
                <li key={comment.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] font-medium">{comment.author}</span>
                    <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{comment.body}</p>
                  <Link
                    href={`/item/${comment.item_id}#discussion`}
                    className="mt-0.5 inline-flex font-mono text-[8px] uppercase tracking-[0.1em] text-primary hover:underline"
                  >
                    Open thread
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                No comments yet
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-5 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
            <ShieldCheck className="size-3 text-primary" /> Recent visits
          </h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Newest first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-border/60 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-3 py-1.5 font-normal">Path</th>
                <th className="px-3 py-1.5 font-normal">Visitor</th>
                <th className="px-3 py-1.5 font-normal">When</th>
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 12).map((visit, index) => (
                <tr key={`${visit.created_at}-${index}`} className="border-b border-border/40 last:border-0">
                  <td className="max-w-0 truncate px-3 py-1.5 font-mono text-[10px] text-foreground/90">{visit.path}</td>
                  <td className="px-3 py-1.5 font-mono text-[9px] text-muted-foreground">
                    {visit.user_id ? "account" : visit.visitor_id ? visit.visitor_id.slice(0, 8) : "anon"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
                    {timeAgo(visit.created_at)}
                  </td>
                </tr>
              ))}
              {!visits.length ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    No visits recorded yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Visits are stored without IP addresses — a rotating browser id, the path and the referrer. Analytics are
        pruned with the rest of the wire.
      </p>
    </div>
  );
}
