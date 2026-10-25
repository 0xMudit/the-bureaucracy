import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, LayoutDashboard, LogOut, PenLine, ShieldCheck } from "lucide-react";
import { signOutEverywhereAction } from "@/app/account/actions";
import { signOutAction } from "@/app/auth/actions";
import {
  ChangeEmailForm,
  ChangePasswordForm,
  DeleteAccountForm,
  DisplayNameForm,
} from "@/components/account-settings";
import { Button } from "@/components/ui/button";
import { getSessionUser, userCan } from "@/lib/auth";
import { roleLabel } from "@/lib/rbac";
import { serviceClient } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const justVerified = params.verified === "1";
  const passwordChanged = params.password === "1";
  const emailChanged = params.email === "1";

  const user = await getSessionUser();
  if (!user) redirect("/submit?next=/account");

  const db = serviceClient();
  const { data: profile } = db
    ? await db.from("tb_profiles").select("created_at, last_seen_at").eq("id", user.id).maybeSingle()
    : { data: null };

  const deskAccess = userCan(user, "admin.dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4 border-b-2 border-foreground pb-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-[15px] uppercase text-foreground">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Your account</p>
          <h1 className="display mt-1 truncate text-[2rem] leading-none tracking-[-0.02em] sm:text-[2.4rem]">
            {user.name}
          </h1>
          <p className="mt-1 truncate font-mono text-[10px] tracking-[0.08em] text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {justVerified ? (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-emerald-600 bg-emerald-600/5 px-3 py-2 text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Address confirmed. Your byline is open — comment, reply and file stories.
        </p>
      ) : null}

      {passwordChanged ? (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-emerald-600 bg-emerald-600/5 px-3 py-2 text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Password changed. Other devices were signed out.
        </p>
      ) : null}

      {emailChanged ? (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-emerald-600 bg-emerald-600/5 px-3 py-2 text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Email address confirmed and updated.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border border-border bg-card px-4 py-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Role</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium">
            {deskAccess ? <ShieldCheck className="size-3.5 text-primary" /> : null}
            {roleLabel(user.role)}
          </p>
        </div>
        <div className="border border-border bg-card px-4 py-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Email</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Verified
          </p>
        </div>
        <div className="border border-border bg-card px-4 py-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Joined</p>
          <p className="mt-1 text-[13px] font-medium">
            {profile?.created_at ? formatDate(String(profile.created_at)) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/submit">
            <PenLine className="size-3.5" /> Submit a link
          </Link>
        </Button>
        {deskAccess ? (
          <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">
              <LayoutDashboard className="size-3.5" /> {user.role === "admin" ? "Admin console" : "Editor's desk"}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/saved">Saved stories</Link>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </form>
      </div>

      <section className="mt-9 border-t-2 border-foreground pt-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Settings</p>
        <h2 className="display mt-1 text-[1.7rem] leading-none tracking-[-0.02em]">The paperwork.</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="border border-border bg-card p-4">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">Profile</h3>
            <p className="mb-3 mt-1 text-[11px] leading-relaxed text-muted-foreground">
              The byline on every comment and reply.
            </p>
            <DisplayNameForm name={user.name} />
          </div>

          <div className="border border-border bg-card p-4">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">Password</h3>
            <p className="mb-3 mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Current password required. Other sessions are revoked.
            </p>
            <ChangePasswordForm />
          </div>

          <div className="border border-border bg-card p-4">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">Email address</h3>
            <p className="mb-3 mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Signed in as <span className="font-mono text-foreground">{user.email}</span>. A change needs a
              confirmation click.
            </p>
            <ChangeEmailForm email={user.email} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4">
          <div className="min-w-0">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">Everywhere</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              End the session on every device, including this one.
            </p>
          </div>
          <form action={signOutEverywhereAction}>
            <Button
              type="submit"
              variant="outline"
              className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              <LogOut className="size-3.5" /> Sign out everywhere
            </Button>
          </form>
        </div>

        <div className="mt-4 border border-destructive/40 bg-card p-4">
          <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-destructive">Delete account</h3>
          <p className="mb-3 mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Permanent. The deployment editor cannot be deleted here.
          </p>
          <DeleteAccountForm />
        </div>
      </section>

      <p className="mt-6 border-l-2 border-border pl-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Votes are tied to this browser, not this account, so you can keep voting after signing out. Comments are
        tied to your account and stay with the story until it leaves the 24-hour window.
      </p>
    </div>
  );
}
