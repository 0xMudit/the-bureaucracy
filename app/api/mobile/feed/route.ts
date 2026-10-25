import { cachedItems } from "@/lib/cached";
import { FEED_MIN_SCORE, NEWS_WINDOW_HOURS, NEWS_WINDOW_MS, SITE } from "@/lib/config";
import { SORT_COPY, parseSort } from "@/lib/feed-copy";
import { collapseDuplicates } from "@/lib/dedupe";
import { canWrite, getVotedIds } from "@/lib/store";
import {
  enrichItem,
  mobileError,
  mobileJson,
  preflight,
  readDeviceId,
  voterIdFor,
} from "@/lib/mobile";
import { buildFeed, filterItems, optionalCounts, topicCounts } from "@/lib/rank";
import { deskFromSearch } from "@/lib/desk";
import { OPTIONAL_ORDER, OPTIONALS, PAPERS, TOPICS } from "@/lib/taxonomy";
import type { OptionalId, PaperId, SortKey, TopicId } from "@/lib/types";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 60;

function clampLimit(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

/**
 * GET /api/mobile/feed
 *
 * The ranked 24-hour wire, with every filter the home page understands:
 * `sort`, `topic`, `optional`, `paper`, `q`, `limit`. Each item arrives with its
 * theme and optional lens already resolved, so the client renders without
 * shipping the taxonomy.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const sort: SortKey = parseSort(params.get("sort"));
  const topicRaw = params.get("topic") ?? "all";
  const topic: TopicId | "all" = TOPICS[topicRaw as TopicId] ? (topicRaw as TopicId) : "all";
  const optionalRaw = params.get("optional") ?? "all";
  const optional: OptionalId | "all" = OPTIONAL_ORDER.includes(optionalRaw as OptionalId)
    ? (optionalRaw as OptionalId)
    : "all";
  const paperRaw = params.get("paper") ?? "all";
  const paper: PaperId | "all" = (Object.keys(PAPERS) as PaperId[]).includes(paperRaw as PaperId)
    ? (paperRaw as PaperId)
    : "all";
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const limit = clampLimit(params.get("limit"));
  const desk = deskFromSearch(params);

  try {
    const all = await cachedItems();
    const cutoff = Date.now() - NEWS_WINDOW_MS;
    const fresh = collapseDuplicates(all.filter((item) => new Date(item.publishedAt).getTime() >= cutoff));

    const query = { sort, topic, optional, paper, q, minScore: q ? undefined : FEED_MIN_SCORE };
    const feed = buildFeed(fresh, { ...query, limit }, Date.now(), desk);
    const scope = filterItems(fresh, { query });

    const topicScope = filterItems(fresh, { query: { ...query, topic: "all" as const } });
    const optionalScope = filterItems(fresh, { query: { ...query, optional: "all" as const } });

    // Voted state is per device, not per account — the wire is open to readers.
    const deviceId = readDeviceId(request);
    const voted = deviceId ? await getVotedIds(voterIdFor(deviceId)) : new Set<string>();

    const latestFetchedAt =
      scope.length > 0
        ? new Date(Math.max(...scope.map((item) => new Date(item.fetchedAt).getTime()))).toISOString()
        : null;

    const copy = SORT_COPY[sort];
    const topicInfo = topic !== "all" ? TOPICS[topic] : null;
    const optionalInfo = optional !== "all" ? OPTIONALS[optional] : null;
    const paperInfo = paper !== "all" ? PAPERS[paper] : null;

    const title = q
      ? `Search: “${q}”`
      : optionalInfo
        ? `${optionalInfo.short} optional`
        : paperInfo
          ? paperInfo.label
          : copy.title;

    const blurb = q
      ? `${feed.length} ${feed.length === 1 ? "story" : "stories"} match your search in the last 24 hours.`
      : optionalInfo
        ? `Only stories tagged for ${optionalInfo.label}. ${optionalInfo.description}`
        : paperInfo
          ? paperInfo.description
          : topicInfo
            ? `Stories mapped to ${topicInfo.label} in the last 24 hours.`
            : copy.blurb;

    return mobileJson({
      ok: true,
      generatedAt: new Date().toISOString(),
      filters: { sort, topic, optional, paper, q, limit },
      screen: {
        kicker: "Live · last 24 hours",
        title,
        blurb,
        mode: sort,
        modeLabel: copy.title,
      },
      items: feed.map((item) => enrichItem(item, item.position, item.rankScore)),
      counts: {
        topics: topicCounts(topicScope),
        optionals: optionalCounts(optionalScope),
      },
      meta: {
        count: feed.length,
        scope: scope.length,
        hasMore: scope.length > feed.length,
        latestFetchedAt,
        windowHours: NEWS_WINDOW_HOURS,
        canWrite: canWrite(),
        siteUrl: SITE.url,
      },
      votedIds: [...voted],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The wire could not be read.";
    return mobileError(500, message);
  }
}
