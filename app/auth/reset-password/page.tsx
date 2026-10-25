import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "@/components/password-forms";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Account office</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Choose a new password.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          This page is only reachable with a live recovery session. Set the password once and every other device is
          signed out.
        </p>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border border-border bg-card p-4 sm:p-5">
          {user ? (
            <>
              <div className="flex items-start gap-3 border-b border-border pb-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-primary">
                  <KeyRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">New credentials</p>
                  <p className="mt-1 truncate text-[12px] leading-relaxed text-muted-foreground">
                    For <span className="font-mono text-foreground">{user.email}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ResetPasswordForm />
              </div>
            </>
          ) : (
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-destructive">
                <Clock3 className="size-3.5" /> Link expired or already used
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                Recovery links are single-use. Request a fresh one and open it in this browser.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
                  <Link href="/auth/forgot-password">Request a new link</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
                  <Link href="/submit">Back to sign in</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> What happens on save
            </h2>
            <ul className="mt-2 space-y-2">
              {[
                "The new password replaces the old one immediately.",
                "Sessions on other browsers are revoked.",
                "This browser stays signed in.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-1.5 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
            <MailCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Never share the recovery link. Anyone with it can choose a password for an hour.
          </p>
        </aside>
      </div>
    </div>
  );
}
