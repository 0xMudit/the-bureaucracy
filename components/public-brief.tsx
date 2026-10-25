import Link from "next/link";
import { ArrowUpRight, Check, Flame } from "lucide-react";
import { SITE } from "@/lib/config";
import { humanDate } from "@/lib/progress";
import type { FrozenBriefEntry } from "@/lib/brief-store";

/**
 * The public, indexable edition of the daily brief. No client JavaScript: the
 * five stories, the syllabus angle and the answer are all in the HTML, which is
 * exactly what a search engine and a reader on a slow connection need.
 */
export function PublicBrief({
  day,
  entries,
  today,
}: {
  day: string;
  entries: FrozenBriefEntry[];
  today: string;
}) {
  const question = entries.find((entry) => entry.quiz)?.quiz;
  const canonical = `${SITE.url}/brief/${day}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `The Bureaucracy daily brief — ${humanDate(day)}`,
    description: "Five current-affairs stories ranked for the UPSC and state PSC syllabus.",
    url: canonical,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.title,
      url: entry.url ?? `${SITE.url}/item/${entry.id}`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        // The payload is built from server-side strings; escape the closing tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          ← The wire
        </Link>
        <span>Daily brief archive</span>
      </div>

      <article className="border border-foreground/80 bg-card">
        <header className="border-b border-foreground/80 bg-foreground px-4 py-3 text-background">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
              <span className="size-1.5 rounded-full bg-primary" /> The daily brief
            </h1>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-background/70">
              Five stories · about 8 minutes
            </span>
          </div>
        </header>

        <div className="border-b border-border px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
            {humanDate(day)}
          </p>
          <p className="mt-2 font-display text-[1.7rem] leading-[1.1] tracking-[-0.02em]">
            What the syllabus asked today.
          </p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            Five stories ranked by exam relevance, each with the syllabus angle and the move it enables.
            Read them, answer the question, and close the tab.
          </p>
        </div>

        <ol className="divide-y divide-border/70">
          {entries.map((entry, index) => {
            const href = day === today ? `/item/${entry.id}` : (entry.url ?? `/item/${entry.id}`);
            const external = day !== today && Boolean(entry.url);
            return (
              <li key={entry.id} className="flex gap-3 px-4 py-4">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/60 font-mono text-[9px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8.5px] uppercase tracking-[0.09em] text-muted-foreground">
                    <span className="text-primary/85">{entry.paperLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{entry.topicLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{entry.source}</span>
                    <span aria-hidden>·</span>
                    <span>{entry.examScore}/100</span>
                    {entry.priority === "high" ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Flame className="size-2.5" /> priority
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-1.5 font-display text-[1.35rem] leading-[1.2] tracking-[-0.015em]">
                    {external ? (
                      <a
                        href={href}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                        className="headline-link inline-flex items-start gap-1"
                      >
                        {entry.title}
                        <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    ) : (
                      <Link href={href} className="headline-link">
                        {entry.title}
                      </Link>
                    )}
                  </h2>

                  {entry.summary ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">{entry.summary}</p>
                  ) : null}

                  <div className="mt-2.5 border-l-2 border-primary/70 pl-2.5">
                    <p className="text-[12.5px] leading-relaxed text-foreground/85">{entry.why}</p>
                    <p className="mt-1.5 flex gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      <span className="font-mono text-primary">→</span>
                      {entry.hook}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {question ? (
          <section
            id="quiz"
            aria-labelledby="quiz-title"
            className="border-t border-border bg-primary/5 px-4 py-4"
          >
            <h2
              id="quiz-title"
              className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary"
            >
              One question · {question.label}
            </h2>
            <p className="mt-2 font-display text-[1.2rem] leading-[1.3]">{question.prompt}</p>
            <ol className="mt-2 space-y-1 text-[13px] leading-relaxed text-foreground/85">
              {question.options.map((option, index) => (
                <li key={option} className="flex gap-2">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </li>
              ))}
            </ol>
            <details className="mt-3 border-t border-primary/20 pt-2">
              <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                Show the answer
              </summary>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={3} />
                <span>
                  <strong className="font-medium">
                    {String.fromCharCode(65 + question.answerIndex)}.
                  </strong>{" "}
                  {question.options[question.answerIndex]}
                </span>
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {question.explanation}
              </p>
            </details>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted-foreground">
          <span>Ranked for the syllabus · not an official UPSC publication</span>
          <Link href="/" className="text-primary hover:underline">
            Today&apos;s wire →
          </Link>
        </footer>
      </article>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3">
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
          Get the same five in the app, with a streak, spaced revision and a study circle. Or have it
          emailed at 7am.
        </p>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.11em]">
          <Link href="/#brief" className="border border-border px-2.5 py-1.5 hover:border-primary hover:text-primary">
            Open the app
          </Link>
          <Link href="/subscribe" className="border border-primary bg-primary px-2.5 py-1.5 text-primary-foreground">
            Email me
          </Link>
        </div>
      </div>
    </main>
  );
}
