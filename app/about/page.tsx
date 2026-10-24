import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Rss } from "lucide-react";
import { GithubMark } from "@/components/github-mark";
import { SITE } from "@/lib/config";
import { SOURCES } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How The Bureaucracy ranks the last 24 hours of news for UPSC and state PSC aspirants: sources, syllabus mapping, optional subjects and the ranking formula.",
  alternates: { canonical: "/about" },
};

const STEPS = [
  {
    n: "01",
    title: "Fetch",
    body: "Every 15 minutes, a scheduled job pulls public RSS feeds from official publishers, newspapers, explainers and Google News queries. No paid APIs, no scraping behind paywalls.",
  },
  {
    n: "02",
    title: "Clean",
    body: "Publisher suffixes are stripped, Hindi and prep material are dropped, coaching domains are blocked, and near-duplicate headlines are merged into a single story.",
  },
  {
    n: "03",
    title: "Map",
    body: "Each headline and excerpt is scored against a syllabus taxonomy: twelve themes across Prelims, GS I–IV and Essay, plus six popular optionals. The strongest signal becomes the primary tag.",
  },
  {
    n: "04",
    title: "Rank & expire",
    body: "Reader votes and the relevance baseline feed the ranking. Everything older than 24 hours is filtered out of queries and deleted by the next ingestion.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">The method</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.9rem]">
          A reading room, not a feed.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          The Bureaucracy is a Hacker News-style radar for people preparing to run the state. It keeps one day of
          policy journalism, ranks it for the syllabus, and then throws it away. The constraint is the product.
        </p>
      </div>

      <section className="mt-8 space-y-3 text-[13.5px] leading-relaxed text-foreground/90">
        <p>
          Most current-affairs products are archives. They reward accumulation: another PDF, another monthly
          compilation, another tab left open. The civil services examination does not test accumulation. It tests
          whether you can take one event, place it against a syllabus theme, and argue about it under time
          pressure.
        </p>
        <p>
          So this site does the opposite of an archive. It shows the last{" "}
          <strong className="font-medium">24 hours</strong>, ranked by reader attention and exam relevance. When a
          story falls out of the window, it is gone from the feed and from the database. If it still matters
          tomorrow, it will be part of a newer story.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => (
          <div key={step.n} className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] text-primary">{step.n}</p>
            <h2 className="mt-1 font-display text-xl leading-none">{step.title}</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 border-l-2 border-primary bg-accent/35 px-4 py-4">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">The ranking</h2>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground">
          score = (points + 1) / (ageHours + 2)<sup>1.8</sup> × relevance × authority × freshness
        </p>
        <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">points</strong> are community upvotes plus a small
            syllabus-relevance baseline, so a useful story is visible before anyone votes.
          </li>
          <li>
            <strong className="font-medium text-foreground">ageHours</strong> is the HN gravity term. A story loses
            half its score roughly every 45 minutes once it is a few hours old.
          </li>
          <li>
            <strong className="font-medium text-foreground">relevance</strong> comes from the taxonomy match;
            official sources get a small authority edge. Freshness adds a brief boost to the first three hours.
          </li>
        </ul>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          The feed also caps how many stories one publisher can hold in the top slots, so a single newspaper cannot
          own the front page.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="border-b border-border pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
          Syllabus and optionals
        </h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">
          Twelve themes cover the general-studies papers: polity, governance, economy, international relations,
          environment, science and technology, security, society, art and culture, ethics, reports and indices, and
          exam alerts. Each theme carries a paper, a short rationale, answer hooks and cue words. The{" "}
          <Link href="/syllabus" className="underline decoration-primary/40 underline-offset-2 hover:text-primary">
            syllabus map
          </Link>{" "}
          shows what is live under each paper.
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">
          The six optionals —{" "}
          <Link href="/optional" className="underline decoration-primary/40 underline-offset-2 hover:text-primary">
            PSIR, Geography, Sociology, Public Administration, History and Anthropology
          </Link>{" "}
          — are a second lens on the same wire. A story can be general current affairs and optional material; the
          optional tags do not change the main ranking, they only unlock the optional feeds.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="border-b border-border pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
          Sources
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          All feeds are public and free. Official releases are marked with a red dot. Google News is used only as a
          discovery layer for English-language Indian publishers; the story always links to the original.
        </p>
        <div className="mt-3 overflow-hidden border border-border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-secondary/70">
              <tr className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {SOURCES.map((source) => (
                <tr key={source.id} className="align-top">
                  <td className="px-3 py-2">
                    <a
                      href={source.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium hover:text-primary"
                    >
                      {source.name} <ArrowUpRight className="size-3 text-muted-foreground" />
                    </a>
                  </td>
                  <td className="hidden px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
                    {source.tier}
                  </td>
                  <td className="hidden px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground md:table-cell">
                    {source.note ?? "Public RSS feed."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="border border-border bg-card p-4">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground">What this is not</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <li>Not affiliated with UPSC, any state PSC, or the Government of India.</li>
            <li>Not a coaching product. No test series, no answer-writing service, no paid notes.</li>
            <li>Not an archive. If you need a permanent record, save the original.</li>
            <li>Not a substitute for the official notification or the judgment itself.</li>
          </ul>
        </div>
        <div className="border border-border bg-card p-4">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground">Build</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Next.js App Router, React, Tailwind, shadcn/ui primitives, Supabase for persistence, and public RSS.
            The code is open source.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground hover:text-primary"
            >
              <GithubMark className="size-3.5" /> GitHub
            </a>
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground hover:text-primary"
            >
              <Rss className="size-3.5" /> RSS
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-border pt-4 text-[11.5px] leading-relaxed text-muted-foreground">
        <p>
          Masthead portrait: <em>VIVA CHE</em>, Jim Fitzpatrick (1968), from the editor&apos;s personal copy. The
          portrait is a masthead reference, not an endorsement of any political position.
        </p>
        <p className="mt-2">
          Headlines and excerpts belong to their publishers. The ranking, taxonomy and interface are released under
          the repository&apos;s licence. Built by{" "}
          <a href={SITE.github} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            {SITE.author}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
