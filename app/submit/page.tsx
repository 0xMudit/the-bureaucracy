import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldAlert, X } from "lucide-react";
import { SubmitForm } from "@/components/submit-form";
import { canWrite } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a link",
  description:
    "Put a policy report, judgment, government release or data story on The Bureaucracy's 24-hour wire.",
  alternates: { canonical: "/submit" },
};

const GOOD = [
  "Bills, ordinances, rules and gazette notifications",
  "Supreme Court and High Court judgments with a governance question",
  "PIB releases, RBI circulars, ministry data and committee reports",
  "Scheme launches with budgets, beneficiaries or outcome data",
  "International agreements, summits and India's stated position",
  "Official surveys, indices and census-type releases",
];

const BAD = [
  "Coaching notes, test-series promotions and 'daily current affairs' lists",
  "Exam-day motivation, topper interviews and strategy threads",
  "Sports, entertainment, celebrity and lifestyle copy",
  "Partisan commentary with no new fact or document",
  "Rumours, unverified social posts and screenshots",
];

export default function SubmitPage() {
  const writable = canWrite();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">The desk</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Put something on the wire.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          Send a report that a civil servant should have read this morning. We fetch the page, clean the headline,
          score it against the syllabus, and open it for discussion.
        </p>
      </div>

      {!writable ? (
        <p className="mt-5 flex items-start gap-2 border-l-2 border-amber-500 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Submissions are read-only in this environment until Supabase is connected. The form is shown so you can
          see the flow.
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="border border-border bg-card p-4 sm:p-5">
          <SubmitForm disabled={!writable} />
        </section>

        <aside className="space-y-5">
          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
              <Check className="size-3.5 text-primary" /> Belongs here
            </h2>
            <ul className="mt-2 space-y-2">
              {GOOD.map((item) => (
                <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
              <X className="size-3.5 text-destructive" /> Does not
            </h2>
            <ul className="mt-2 space-y-2">
              {BAD.map((item) => (
                <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-border" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
            By submitting, you confirm the link is publicly accessible. Headlines and excerpts remain the
            publisher&apos;s. Read the{" "}
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
