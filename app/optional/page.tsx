import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { buildFeed } from "@/lib/rank";
import { NEWS_WINDOW_MS } from "@/lib/config";
import { cachedItems } from "@/lib/cached";
import { OPTIONAL_ORDER, OPTIONALS } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Optional subjects",
  description:
    "PSIR, Geography, Sociology, Public Administration, History and Anthropology — the last 24 hours of news tagged for each UPSC optional.",
  alternates: { canonical: "/optional" },
};

export default async function OptionalPage() {
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const all = await cachedItems();
  const fresh = all.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  const totalTagged = fresh.filter((item) => item.optionals.length > 0).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">The optionals desk</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Six optionals. One 24-hour wire.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          The same policy story can be general studies and optional material. These tags surface the overlap for
          PSIR, Geography, Sociology, Public Administration, History and Anthropology. They are a reading lens,
          not a substitute for your optional textbooks.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-3 text-primary" /> {totalTagged} tagged stories in the last 24 hours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3" /> Tagging refreshes with every ingestion
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {OPTIONAL_ORDER.map((id) => {
          const subject = OPTIONALS[id];
          const tagged = fresh.filter((item) => item.optionals.includes(id));
          const top = buildFeed(tagged, { sort: "best", optional: id, limit: 3 });

          return (
            <section key={id} className="flex flex-col border border-border bg-card">
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">Optional</p>
                  <h2 className="display mt-0.5 text-[1.7rem] leading-none">{subject.short}</h2>
                  <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {subject.label}
                  </p>
                </div>
                <span className="shrink-0 border border-border bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {tagged.length} {tagged.length === 1 ? "story" : "stories"}
                </span>
              </div>

              <p className="px-4 pt-3 text-[12.5px] leading-relaxed text-muted-foreground">{subject.description}</p>

              <div className="mt-3 flex flex-wrap gap-1 px-4">
                {subject.cues.slice(0, 3).map((cue) => (
                  <span
                    key={cue}
                    className="bg-secondary px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-secondary-foreground"
                  >
                    {cue}
                  </span>
                ))}
              </div>

              <ul className="mt-3 flex-1 divide-y divide-border/60 border-t border-border/60">
                {top.length ? (
                  top.map((item, index) => (
                    <li key={item.id} className="px-4 py-2.5">
                      <Link href={`/item/${item.id}`} className="group flex gap-2">
                        <span className="mt-0.5 font-mono text-[9px] text-primary">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium leading-snug group-hover:text-primary">
                            {item.title}
                          </span>
                          <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                            {item.source} · {timeAgo(item.publishedAt)} · {item.examScore} relevance
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-5 text-[12px] italic text-muted-foreground">
                    No tagged stories in the last 24 hours. The wire will update on the next ingestion.
                  </li>
                )}
              </ul>

              <div className="border-t border-border px-4 py-2.5">
                <Link
                  href={`/?optional=${id}`}
                  className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:text-primary"
                >
                  Open the {subject.short} feed <ArrowRight className="size-3" />
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 border-l-2 border-primary bg-accent/40 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
        A single story may be tagged for more than one optional, because the syllabus overlaps. Use the
        <Link href="/syllabus" className="mx-1 underline hover:text-foreground">
          syllabus map
        </Link>
        for the general-studies view, and the optional chips on the home feed to narrow the wire.
      </p>
    </div>
  );
}
