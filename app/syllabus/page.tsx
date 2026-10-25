import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { buildFeed, optionalCounts } from "@/lib/rank";
import { NEWS_WINDOW_MS } from "@/lib/config";
import { cachedItems } from "@/lib/cached";
import { OPTIONAL_ORDER, OPTIONALS, PAPERS, TOPICS, TOPIC_LIST } from "@/lib/taxonomy";
import type { PaperId } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Syllabus map",
  description:
    "The last 24 hours mapped to the UPSC syllabus: Prelims, GS I–IV, Essay and the six popular optional subjects.",
  alternates: { canonical: "/syllabus" },
};

const PAPER_ORDER: PaperId[] = ["prelims", "gs1", "gs2", "gs3", "gs4", "essay"];

export default async function SyllabusPage() {
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const all = await cachedItems();
  const fresh = all.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  const optionCounts = optionalCounts(fresh);
  const mapped = fresh.filter((item) => item.primaryTopic || item.primaryOptional).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">The syllabus desk</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          The syllabus, as it happened today.
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          Every story in the last 24 hours, sorted into the paper and theme it can feed. {mapped} stories carry a
          syllabus tag; the rest are on the wire but not yet worth your revision time.
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {PAPER_ORDER.map((paperId) => {
          const paper = PAPERS[paperId];
          const topics = TOPIC_LIST.filter((topic) => topic.paper === paperId);
          const paperItems = fresh.filter((item) => {
            if (paperId === "essay") return Boolean(item.primaryTopic);
            return item.primaryTopic ? TOPICS[item.primaryTopic].paper === paperId : false;
          });
          const top = buildFeed(paperItems, { sort: "best", limit: 3 });
          const counts = new Map<string, number>();
          for (const item of paperItems) {
            if (item.primaryTopic) counts.set(item.primaryTopic, (counts.get(item.primaryTopic) || 0) + 1);
          }

          return (
            <section key={paperId} className="border border-border bg-card">
              <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">
                    {paperId === "prelims" ? "Objective" : paperId === "essay" ? "Descriptive" : "Mains"}
                  </p>
                  <h2 className="display mt-0.5 text-[1.65rem] leading-none">{paper.label}</h2>
                  <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground">
                    {paper.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="border border-border bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    {paperItems.length} {paperItems.length === 1 ? "story" : "stories"}
                  </span>
                  <Link
                    href={`/?paper=${paperId}`}
                    className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground hover:text-primary"
                  >
                    Open feed <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                  {topics.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((topic) => (
                        <Link
                          key={topic.id}
                          href={`/?topic=${topic.id}`}
                          className="inline-flex items-center gap-1.5 border border-border bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:border-primary/40 hover:text-primary"
                        >
                          {topic.label}
                          <span className="text-muted-foreground">{counts.get(topic.id) ?? 0}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      <BookOpen className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      The essay paper draws on the best-mapped stories from across GS I–IV rather than a fixed
                      theme list.
                    </p>
                  )}

                  <div className="mt-4 border-t border-border/70 pt-3">
                    <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
                      Answer hooks
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {(topics[0]?.hooks ?? ["What is the factual update?", "Which syllabus theme does it test?"]).map(
                        (hook) => (
                          <li key={hook} className="flex gap-1.5 text-[11.5px] leading-relaxed text-foreground/80">
                            <span className="font-mono text-primary">→</span>
                            {hook}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>

                <div>
                  <ul className="divide-y divide-border/70">
                    {top.length ? (
                      top.map((item, index) => (
                        <li key={item.id} className="px-3 py-2.5">
                          <Link href={`/item/${item.id}`} className="group flex gap-2">
                            <span className="mt-0.5 font-mono text-[9px] text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-medium leading-snug group-hover:text-primary">
                                {item.title}
                              </span>
                              <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.09em] text-muted-foreground">
                                {item.source} · {timeAgo(item.publishedAt)} · {item.examScore}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-5 text-[11.5px] italic text-muted-foreground">
                        No mapped stories in the last 24 hours.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-10 border-2 border-foreground/85 bg-secondary/30">
        <div className="flex flex-col justify-between gap-3 border-b border-foreground/20 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">The optional lens</p>
            <h2 className="display mt-0.5 text-[1.8rem] leading-none">Six optionals, tagged separately.</h2>
            <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
              The same daily story can be PSIR evidence, a Geography case, a Sociology illustration or a Public
              Administration example. Open an optional feed to see only that lens.
            </p>
          </div>
          <Link
            href="/optional"
            className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground hover:text-primary"
          >
            The optionals desk <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {OPTIONAL_ORDER.map((id) => {
            const subject = OPTIONALS[id];
            const count = optionCounts.find((o) => o.id === id)?.count ?? 0;
            return (
              <Link
                key={id}
                href={`/?optional=${id}`}
                className="group flex flex-col justify-between gap-2 bg-background px-3 py-3 hover:bg-accent/40"
              >
                <span className="text-[12px] font-medium group-hover:text-primary">{subject.short}</span>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  {count} {count === 1 ? "story" : "stories"} · 24h
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="mt-6 border-l-2 border-border pl-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Mapping is keyword- and taxonomy-based, not a substitute for reading the syllabus. A story can carry more
        than one tag; the primary tag decides its paper and the optional tags decide which optionals see it.
      </p>
    </div>
  );
}
