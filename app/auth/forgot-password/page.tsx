import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { ForgotPasswordForm } from "@/components/password-forms";
import { safeNext } from "@/lib/auth";
import { authConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a single-use link to set a new password for The Bureaucracy.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : "", "/account");
  const configured = authConfigured();
  const error = typeof params.error === "string" ? params.error : "";

  const ERRORS: Record<string, string> = {
    expired: "That reset link has expired. Recovery links are single-use and last one hour — request a fresh one below.",
    invalid: "That reset link is not valid. It may already have been used — request a fresh one below.",
    missing: "That reset link was incomplete. Request a fresh one below.",
    wrong_browser:
      "That link has to be opened in the same browser where you requested it. Open it there, or request a fresh link here.",
    unconfigured: "Accounts are not configured on this deployment yet.",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Account office</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Forgot the password?
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          Give us the account address and we will send a single-use link. It lets you choose a new password; nothing
          changes until you do.
        </p>
      </div>

      {error && ERRORS[error] ? (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive"
        >
          <Clock3 className="mt-0.5 size-4 shrink-0" />
          {ERRORS[error]}
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-primary">
              <KeyRound className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">Password reset</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                The link expires after an hour. Requests are rate-limited, so one message is enough.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {configured ? (
              <ForgotPasswordForm />
            ) : (
              <p className="border-l-2 border-warning bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
                Accounts are not configured on this deployment yet.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> A reset does not
            </h2>
            <ul className="mt-2 space-y-2">
              {[
                "Change your comments or submissions.",
                "Confirm an address that was never verified.",
                "Reveal whether an email is registered.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
            Still stuck? Reply to the verification email or write to the editor. We will never ask for your password.
          </p>

          <Link
            href={`/submit?next=${encodeURIComponent(next)}`}
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground underline hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </aside>
      </div>
    </div>
  );
}
