import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ShieldAlert } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser, safeNext } from "@/lib/auth";
import { authConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Sign in to comment on The Bureaucracy, submit links to the 24-hour wire, and keep your place in the discussion.",
  alternates: { canonical: "/login" },
};

const BENEFITS = [
  "Comment on any story, and reply inside the thread.",
  "Submit a report, judgment or release to the wire.",
  "Keep your display name on everything you write.",
  "Reading, voting and the daily brief stay free — no account needed.",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : "/", "/");
  const user = await getSessionUser();
  if (user) redirect(next);

  const configured = authConfigured();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">The desk</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Log in to the wire.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          An account lets you comment, reply and put a story on the wire. Reading and voting stay free.
        </p>
      </div>

      {!configured ? (
        <p className="mt-5 flex items-start gap-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Accounts are not configured on this deployment yet. Add the Supabase anon key to enable sign-in.
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border border-border bg-card p-4 sm:p-5">
          <AuthForm next={next} />
        </section>

        <aside className="space-y-5">
          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
              <Check className="size-3.5 text-primary" /> With an account
            </h2>
            <ul className="mt-2 space-y-2">
              {BENEFITS.map((item) => (
                <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
            We only store your email, a display name and what you write. No newsletters, no third-party
            trackers. Read the{" "}
            <Link href="/about" className="underline hover:text-foreground">
              method
            </Link>{" "}
            before dumping a list of links.
          </p>
        </aside>
      </div>
    </div>
  );
}
