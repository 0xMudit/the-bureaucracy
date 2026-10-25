import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { FeedList } from "@/components/feed-list";
import { FeedTabs } from "@/components/feed-tabs";
import { OptionalFilter } from "@/components/optional-filter";
import { Sidebar } from "@/components/sidebar";
import { SearchBox } from "@/components/search-box";
import { TopicFilter } from "@/components/topic-filter";
import { DeskBar } from "@/components/desk-bar";
import { DailyBrief } from "@/components/daily-brief";
import { buildFeed, filterItems, optionalCounts, topicCounts } from "@/lib/rank";
import { briefFromItems } from "@/lib/brief";
import { collapseDuplicates } from "@/lib/dedupe";
import { DESK_COOKIE, DESK_SKIP_COOKIE, deskIsDefault, deskSummary, parseDesk } from "@/lib/desk";
import { istDateKey } from "@/lib/progress";
import { SORT_COPY } from "@/lib/feed-copy";
import { FEED_MIN_SCORE, NEWS_WINDOW_MS } from "@/lib/config";
import { cachedItems } from "@/lib/cached";
import { canWrite } from "@/lib/store";
import { getReactionStates, viewerActor } from "@/lib/social";
import { OPTIONAL_ORDER, OPTIONALS, PAPERS, TOPICS } from "@/lib/taxonomy";
import type { OptionalId, PaperId, SortKey, TopicId } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

function parseSort(value: string | string[] | undefined): SortKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "new" || v === "best" || v === "discussed" ? v : "top";
}

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const topic = param(params.topic) || "all";
  const q = param(params.q).slice(0, 80);
  const optionalRaw = param(params.optional);
  const optional = OPTIONAL_ORDER.includes(optionalRaw as OptionalId) ? optionalRaw : "all";
  const paperRaw = param(params.paper);
  const paper = (Object.keys(PAPERS) as PaperId[]).includes(paperRaw as PaperId) ? paperRaw : "all";

  const all = await cachedItems();
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  // Collapse again at read time: two ingest runs can each keep the same event.
  const fresh = collapseDuplicates(all.filter((item) => new Date(item.publishedAt).getTime() >= cutoff));

  const jar = await cookies();
  const desk = parseDesk(jar.get(DESK_COOKIE)?.value);
  const deskSkipped = jar.get(DESK_SKIP_COOKIE)?.value === "1";

  const baseQuery = {
    sort,
    topic: topic as TopicId | "all",
    optional: optional as OptionalId | "all",
    paper: paper as PaperId | "all",
    q,
    // Searching is how a reader finds anything; browsing is curated.
    minScore: q ? undefined : FEED_MIN_SCORE,
  };
  const feed = buildFeed(fresh, { ...baseQuery, limit: 40 }, Date.now(), desk);
  const scope = filterItems(fresh, { query: baseQuery });
  const viewer = await viewerActor();
  const reactions = await getReactionStates(
    viewer,
    feed.map((item) => item.id),
  );

  const defaultView = !q && topic === "all" && optional === "all" && paper === "all";
  const showBrief = defaultView && sort !== "new";
  const briefEntries = showBrief ? briefFromItems(fresh, desk) : [];
  const dateKey = istDateKey();

  const topicScope = filterItems(fresh, { query: { ...baseQuery, topic: "all" } });
  const counts = Object.fromEntries(topicCounts(topicScope).map((t) => [t.id, t.count]));
  const optionalScope = filterItems(fresh, { query: { ...baseQuery, optional: "all" } });
  const optionCounts = Object.fromEntries(optionalCounts(optionalScope).map((o) => [o.id, o.count]));

  const latestFetchedAt =
    scope.length > 0
      ? new Date(Math.max(...scope.map((i) => new Date(i.fetchedAt).getTime()))).toISOString()
      : null;

  const sourcesMap = new Map<string, { count: number; official: boolean }>();
  for (const item of scope) {
    const entry = sourcesMap.get(item.source) ?? { count: 0, official: false };
    entry.count += 1;
    entry.official = entry.official || item.sourceTier === "official";
    sourcesMap.set(item.source, entry);
  }
  const sources = [...sourcesMap.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.count - a.count);

  const copy = SORT_COPY[sort];
  const optionalSubject = optional !== "all" ? OPTIONALS[optional as OptionalId] : null;
  const paperInfo = paper !== "all" ? PAPERS[paper as PaperId] : null;
  const topicInfo = topic !== "all" ? TOPICS[topic as TopicId] : null;

  const title = q
    ? `Search: “${q}”`
    : optionalSubject
      ? `${optionalSubject.short} optional`
      : paperInfo
        ? paperInfo.label
        : copy.title;

  const blurb = q
    ? `${feed.length} ${feed.length === 1 ? "story" : "stories"} match your search in the last 24 hours.`
    : optionalSubject
      ? `Only stories tagged for ${optionalSubject.label}. ${optionalSubject.description}`
      : paperInfo
        ? paperInfo.description
        : topicInfo
          ? `Stories mapped to ${topicInfo.label} in the last 24 hours.`
          : showBrief
            ? desk
              ? `Tilted to your desk: ${deskSummary(desk)}. Five stories first, then the rest of the wire.`
              : "The five stories that matter today, ranked for the syllabus. Read them, tick them off, close the tab."
            : copy.blurb;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid gap-8 py-5 lg:grid-cols-[minmax(0,1fr)_292px] lg:gap-10">
        <section aria-labelledby="feed-title" className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Live · last 24 hours
              </div>
              <h2 id="feed-title" className="display mt-1 text-[2rem] leading-none tracking-[-0.02em] sm:text-[2.4rem]">
                {title}
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{blurb}</p>
            </div>
            <div className="flex items-center gap-2">
              <SearchBox className="w-full sm:w-[260px]" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {briefEntries.length ? (
              <DailyBrief
                entries={briefEntries}
                dateKey={dateKey}
                deskLabel={desk && !deskIsDefault(desk) ? deskSummary(desk) : null}
              />
            ) : null}
            <DeskBar desk={desk} skipped={deskSkipped} />
          </div>

          <div className="mt-4">
            <FeedTabs sort={sort} topic={topic} q={q} optional={optional} paper={paper} />
            <TopicFilter
              active={topic}
              sort={sort}
              q={q}
              counts={counts}
              optional={optional}
              paper={paper}
            />
            <OptionalFilter
              active={optional}
              sort={sort}
              q={q}
              topic={topic}
              paper={paper}
              counts={optionCounts}
            />
          </div>

          <div className="mb-2 mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>
              {feed.length} {feed.length === 1 ? "story" : "stories"}
              {topicInfo ? ` in ${topicInfo.label}` : ""}
              {optionalSubject ? ` · ${optionalSubject.short}` : ""}
              {latestFetchedAt ? ` · synced ${timeAgo(latestFetchedAt)}` : ""}
            </span>
            <a
              href="/feed.xml"
              className="hidden items-center gap-1 hover:text-foreground sm:inline-flex"
              title="Subscribe to the ranked feed"
            >
              RSS <ArrowUpRight className="size-3" />
            </a>
          </div>

          <FeedList items={feed} reactions={reactions} canWrite={canWrite()} query={q} />

          <div className="mt-5 flex items-center justify-between gap-4 border border-dashed border-border px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
              The wire turns over every 24 hours. Older stories are archived, never silently deleted.
            </p>
            <Link
              href="/submit"
              className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary hover:underline"
            >
              Submit a link
            </Link>
          </div>
        </section>

        <Suspense fallback={<div className="hidden lg:block" />}>
          <Sidebar
            topicCounts={topicCounts(topicScope)}
            sources={sources}
            total={scope.length}
            latestFetchedAt={latestFetchedAt}
          />
        </Suspense>
      </div>
    </div>
  );
}
