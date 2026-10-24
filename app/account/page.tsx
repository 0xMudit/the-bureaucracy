import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, PenLine, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { serviceClient } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/submit?next=/account");

  const db = serviceClient();
  const { data: profile } = db
    ? await db.from("tb_profiles").select("created_at, last_seen_at").eq("id", user.id).maybeSingle()
    : { data: null };

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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="border border-border bg-card px-4 py-3">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Role</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium">
            {user.role === "editor" ? (
              <>
                <ShieldCheck className="size-3.5 text-primary" /> Editor
              </>
            ) : (
              "Reader"
            )}
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
        {user.role === "editor" ? (
          <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">
              <LayoutDashboard className="size-3.5" /> Editor dashboard
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

      <p className="mt-6 border-l-2 border-border pl-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Votes are tied to this browser, not this account, so you can keep voting after signing out. Comments are
        tied to your account and stay with the story until it leaves the 24-hour window.
      </p>
    </div>
  );
}
