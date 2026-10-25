import type { Metadata } from "next";
import { PublicBrief } from "@/components/public-brief";
import { briefFromItems } from "@/lib/brief";
import { frozenBrief, type FrozenBriefEntry } from "@/lib/brief-store";
import { cachedItems } from "@/lib/cached";
import { SITE } from "@/lib/config";
import { collapseDuplicates } from "@/lib/dedupe";
import { istDateKey } from "@/lib/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The daily brief — five stories, eight minutes",
  description:
    "Today's five current-affairs stories, ranked for the UPSC and state PSC syllabus, with the angle and one retrieval question.",
  alternates: { canonical: "/brief" },
  openGraph: {
    type: "article",
    url: `${SITE.url}/brief`,
    title: "The daily brief · The Bureaucracy",
    description: "Five stories, eight minutes, one question. The syllabus, finished for today.",
  },
};

export default async function BriefPage() {
  const day = istDateKey();
  const frozen = await frozenBrief(day);
  let entries: FrozenBriefEntry[] = frozen?.entries ?? [];

  if (!entries.length) {
    // Before the first freeze (or if the cron has not run), build the same
    // five live. The next app visit or daily job persists them.
    const items = collapseDuplicates(await cachedItems());
    const urls = new Map(items.map((item) => [item.id, item.url]));
    entries = briefFromItems(items, null).map((entry) => ({ ...entry, url: urls.get(entry.id) }));
  }

  if (!entries.length) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">The daily brief</p>
        <h1 className="mt-2 font-display text-3xl">The wire is quiet.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No story cleared the relevance floor today. The next ingest runs within fifteen minutes.
        </p>
      </main>
    );
  }

  return <PublicBrief day={day} entries={entries} today={day} />;
}
