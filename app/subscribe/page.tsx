import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { SubscribeForm } from "@/components/subscribe-form";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "The 7am brief, by email",
  description:
    "Five current-affairs stories, ranked for the UPSC and state PSC syllabus, delivered every morning at 7 IST. One email, one click to leave.",
  alternates: { canonical: "/subscribe" },
  openGraph: {
    url: `${SITE.url}/subscribe`,
    title: "The 7am brief · The Bureaucracy",
    description: "Five stories and one question in your inbox. No account required.",
  },
};

export default function SubscribePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
        <Mail className="size-3.5" /> The owned channel
      </div>
      <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl">
        Five stories.
        <br />
        Eight minutes.
        <br />
        Every morning at seven.
      </h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        The same daily brief the app gives you: the five stories that matter for the syllabus, the angle
        to take into an answer, and one retrieval question. No infinite feed. No account.
      </p>

      <div className="mt-6 max-w-xl">
        <SubscribeForm />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Ranked, not chronological", "Exam relevance decides the order, not publish time."],
          ["Finite on purpose", "Five stories. When they are read, you are done."],
          ["One click out", "Every email carries an unsubscribe link that works."],
        ].map(([title, body]) => (
          <div key={title} className="border border-border bg-card p-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">{title}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Prefer the wire?{" "}
        <Link href="/" className="text-primary hover:underline">
          Read today&apos;s 24 hours →
        </Link>{" "}
        Or browse the{" "}
        <Link href="/brief" className="text-primary hover:underline">
          daily brief archive
        </Link>
        .
      </p>
    </main>
  );
}
