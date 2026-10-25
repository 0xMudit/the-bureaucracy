import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Inbox, MailCheck, ShieldCheck } from "lucide-react";
import { ResendVerification } from "@/components/resend-verification";
import { safeNext } from "@/lib/auth";
import { authConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "One click confirms your address and opens your account on The Bureaucracy.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  expired: "That link has expired. Verification links are single-use and last 24 hours — send a fresh one below.",
  invalid: "That link is not valid. It may have already been used, or the address was confirmed in another tab.",
  missing: "That link was incomplete. Send yourself a new verification email below.",
  wrong_browser:
    "That link has to be opened in the same browser where you signed up. Open it there, or send a fresh link below and use this browser.",
  unconfigured: "Accounts are not configured on this deployment yet. Nothing was sent.",
};

const STEPS = [
  {
    icon: Inbox,
    title: "Open the email",
    body: "The subject confirms your address and comes from The Bureaucracy, not a newsletter list.",
  },
  {
    icon: ShieldCheck,
    title: "Click verify",
    body: "The link proves the address is yours and opens the account in the same step.",
  },
  {
    icon: MailCheck,
    title: "Sign in as usual",
    body: "Until that click, the password is deliberately refused. No exceptions.",
  },
];

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const next = safeNext(typeof params.next === "string" ? params.next : "", "/account");
  const error = typeof params.error === "string" ? params.error : "";
  const configured = authConfigured();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Account office</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Check your inbox.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          We sent a verification link{email ? " to " : ""}
          {email ? <span className="font-mono text-[12px] text-foreground">{email}</span> : null}. Your account stays
          dormant until that link is opened — signing in with the password alone will not work.
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

      <p className="mt-5 border-l-2 border-border pl-3 text-[12px] leading-relaxed text-muted-foreground">
        Already had an account? Open the message if one arrives; otherwise{" "}
        <Link href={`/submit?next=${encodeURIComponent(next)}`} className="underline hover:text-foreground">
          sign in instead
        </Link>
        . We do not say whether an address is registered.
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-primary">
              <MailCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">One step remains</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Open the message and click <span className="text-foreground">the confirmation button</span>. Links
                expire after 24 hours and work once.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {configured ? "Need another link?" : "Not configured"}
            </p>
            {configured ? (
              <ResendVerification email={email} />
            ) : (
              <p className="border-l-2 border-warning bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
                Add the Supabase anon key to this deployment to enable accounts.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Nothing arrived? Check spam and promotions first. If the address is wrong,{" "}
              <Link href={`/submit?next=${encodeURIComponent(next)}`} className="underline hover:text-foreground">
                start again with the correct one
              </Link>
              .
            </p>
          </div>
        </section>

        <aside className="min-w-0 space-y-5">
          <section>
            <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">What happens next</h2>
            <ol className="mt-3 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-border bg-card font-mono text-[9px] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                      <step.icon className="size-3.5 text-muted-foreground" />
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <p className="border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
            We store your email, a display name and what you write. Confirmation is the only mail we send unless you
            ask for a new link.
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
