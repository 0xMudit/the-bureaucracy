import { serviceClient } from "./store";

/**
 * Admin analytics.
 *
 * Everything that can be measured from the first-party `tb_visits` table is
 * real. Session length, device/browser split, traffic-source share, retention
 * cohorts and the state heat map need a richer event stream than the privacy-
 * preserving tracker writes today, so those blocks are DEMO DATA — labelled in
 * the UI with a "Demo data" badge and shaped exactly like the real response so
 * they can be swapped without touching the components.
 */

const DAY = 86_400_000;

export const DEMO_LABEL = "Demo data";

export interface SeriesPoint {
  key: string;
  label: string;
  views: number;
  visitors: number;
}

export interface AdminAnalytics {
  hasDatabase: boolean;
  generatedAt: string;
  totals: {
    visitorsToday: number;
    viewsToday: number;
    sessionsToday: number;
    visitors7: number;
    visitors30: number;
    views7: number;
    views30: number;
    dau: number;
    wau: number;
    mau: number;
    realtime: number;
    bounceRate: number;
    avgSessionSeconds: number;
    finishRate: number;
    d1: number;
    d7: number;
    d30: number;
    accounts: number;
    comments: number;
    items: number;
    archived: number;
    openReports: number;
  };
  series: SeriesPoint[];
  topPages: { path: string; views: number }[];
  sources: { source: string; visits: number; share: number }[];
  devices: { label: string; value: number }[];
  browsers: { label: string; value: number }[];
  states: { state: string; readers: number }[];
  finish: {
    open: number;
    complete: number;
    rate: number;
    byDay: { key: string; label: string; open: number; complete: number }[];
  };
  traffic: { direct: number; search: number; social: number; referral: number; demo: boolean };
}

/** Deterministic demo values, clearly marked, shaped like the real data. */
export const DEMO = {
  avgSessionSeconds: 214,
  d1: 41,
  d7: 19,
  d30: 8,
  devices: [
    { label: "Mobile", value: 68 },
    { label: "Desktop", value: 27 },
    { label: "Tablet", value: 5 },
  ],
  browsers: [
    { label: "Chrome", value: 61 },
    { label: "Safari", value: 24 },
    { label: "Edge", value: 8 },
    { label: "Firefox", value: 5 },
    { label: "Other", value: 2 },
  ],
  traffic: { direct: 46, search: 31, social: 17, referral: 6 },
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function label(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function hostOf(referrer: string | null): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceBucket(referrer: string | null): string {
  const host = hostOf(referrer);
  if (!host) return "direct";
  if (/google|bing|duckduckgo|yahoo|brave/i.test(host)) return "google";
  if (/facebook|instagram|x\.com|twitter|linkedin|whatsapp|telegram|reddit|youtube/i.test(host)) return "social";
  return host;
}

export async function loadAdminAnalytics(): Promise<AdminAnalytics> {
  const db = serviceClient();
  const now = Date.now();
  const empty: AdminAnalytics = {
    hasDatabase: false,
    generatedAt: new Date().toISOString(),
    totals: {
      visitorsToday: 0,
      viewsToday: 0,
      sessionsToday: 0,
      visitors7: 0,
      visitors30: 0,
      views7: 0,
      views30: 0,
      dau: 0,
      wau: 0,
      mau: 0,
      realtime: 0,
      bounceRate: 0,
      avgSessionSeconds: DEMO.avgSessionSeconds,
      finishRate: 0,
      d1: DEMO.d1,
      d7: DEMO.d7,
      d30: DEMO.d30,
      accounts: 0,
      comments: 0,
      items: 0,
      archived: 0,
      openReports: 0,
    },
    series: [],
    topPages: [],
    sources: [],
    devices: DEMO.devices,
    browsers: DEMO.browsers,
    states: [],
    finish: { open: 0, complete: 0, rate: 0, byDay: [] },
    traffic: { ...DEMO.traffic, demo: true },
  };

  if (!db) return empty;

  const thirty = new Date(now - 30 * DAY).toISOString();
  const [visitsRes, profilesRes, commentsRes, itemsRes, archivedRes, reportsRes, statesRes] = await Promise.all([
    db
      .from("tb_visits")
      .select("path,referrer,visitor_id,user_id,created_at")
      .gte("created_at", thirty)
      .order("created_at", { ascending: false })
      .limit(20_000),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("comments").select("id", { count: "exact", head: true }).is("hidden_at", null),
    db.from("items").select("id", { count: "exact", head: true }).is("archived_at", null),
    db.from("items").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    db.from("comment_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("profiles").select("state").eq("status", "active").not("state", "is", null).limit(2000),
  ]);

  const visits = (visitsRes.data ?? []) as {
    path: string;
    referrer: string | null;
    visitor_id: string | null;
    user_id: string | null;
    created_at: string;
  }[];

  const pageViews = visits.filter((visit) => !visit.path.startsWith("/_event/"));
  const events = visits.filter((visit) => visit.path.startsWith("/_event/"));

  const visitorSet = (sinceMs: number) =>
    new Set(
      visits
        .filter((visit) => new Date(visit.created_at).getTime() >= sinceMs && visit.visitor_id)
        .map((visit) => visit.visitor_id),
    );

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const startOfToday = todayStart.getTime();

  const visitorsToday = visitorSet(startOfToday);
  const viewsToday = pageViews.filter((visit) => new Date(visit.created_at).getTime() >= startOfToday);
  const visitors7 = visitorSet(now - 7 * DAY);
  const visitors30 = visitorSet(now - 30 * DAY);

  // A session is one visitor inside a rolling 30-minute bucket. Good enough for
  // a bounded, privacy-first counter, and explained in the dashboard footnote.
  const sessions = new Set(
    viewsToday.map((visit) => `${visit.visitor_id ?? "anon"}:${Math.floor(new Date(visit.created_at).getTime() / 1_800_000)}`),
  );

  const pagesByVisitor = new Map<string, number>();
  for (const visit of viewsToday) {
    const key = visit.visitor_id ?? "anon";
    pagesByVisitor.set(key, (pagesByVisitor.get(key) ?? 0) + 1);
  }
  const singlePage = [...pagesByVisitor.values()].filter((count) => count <= 1).length;
  const bounceRate = pagesByVisitor.size ? Math.round((singlePage / pagesByVisitor.size) * 100) : 0;

  const series: SeriesPoint[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(now - offset * DAY);
    const key = dayKey(date);
    const dayViews = pageViews.filter((visit) => visit.created_at.slice(0, 10) === key);
    series.push({
      key,
      label: label(date),
      views: dayViews.length,
      visitors: new Set(dayViews.map((visit) => visit.visitor_id).filter(Boolean)).size,
    });
  }

  const pageCounts = new Map<string, number>();
  for (const visit of pageViews) pageCounts.set(visit.path, (pageCounts.get(visit.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const sourceCounts = new Map<string, number>();
  for (const visit of pageViews) {
    const bucket = sourceBucket(visit.referrer);
    sourceCounts.set(bucket, (sourceCounts.get(bucket) ?? 0) + 1);
  }
  const totalSourced = Math.max(1, pageViews.length);
  const sources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, visits: count, share: Math.round((count / totalSourced) * 100) }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  const stateCounts = new Map<string, number>();
  for (const row of statesRes.data ?? []) {
    const state = String(row.state ?? "").trim();
    if (state) stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
  }
  const states = [...stateCounts.entries()]
    .map(([state, readers]) => ({ state, readers }))
    .sort((a, b) => b.readers - a.readers)
    .slice(0, 8);

  const finishOpen = events.filter((visit) => visit.path.startsWith("/_event/brief_open")).length;
  const finishComplete = events.filter((visit) => visit.path.startsWith("/_event/brief_complete")).length;
  const finishByDay = series.map((point) => {
    const open = events.filter((visit) => visit.path.startsWith("/_event/brief_open") && visit.created_at.slice(0, 10) === point.key).length;
    const complete = events.filter(
      (visit) => visit.path.startsWith("/_event/brief_complete") && visit.created_at.slice(0, 10) === point.key,
    ).length;
    return { key: point.key, label: point.label, open, complete };
  });

  const realtime = new Set(
    pageViews
      .filter((visit) => new Date(visit.created_at).getTime() >= now - 5 * 60_000 && visit.visitor_id)
      .map((visit) => visit.visitor_id),
  ).size;

  return {
    ...empty,
    hasDatabase: true,
    totals: {
      visitorsToday: visitorsToday.size,
      viewsToday: viewsToday.length,
      sessionsToday: sessions.size,
      visitors7: visitors7.size,
      visitors30: visitors30.size,
      views7: pageViews.filter((visit) => new Date(visit.created_at).getTime() >= now - 7 * DAY).length,
      views30: pageViews.length,
      dau: visitorsToday.size,
      wau: visitors7.size,
      mau: visitors30.size,
      realtime,
      bounceRate,
      avgSessionSeconds: DEMO.avgSessionSeconds,
      finishRate: finishOpen ? Math.round((finishComplete / finishOpen) * 100) : 0,
      d1: DEMO.d1,
      d7: DEMO.d7,
      d30: DEMO.d30,
      accounts: profilesRes.count ?? 0,
      comments: commentsRes.count ?? 0,
      items: itemsRes.count ?? 0,
      archived: archivedRes.count ?? 0,
      openReports: reportsRes.count ?? 0,
    },
    series,
    topPages,
    sources,
    states,
    finish: {
      open: finishOpen,
      complete: finishComplete,
      rate: finishOpen ? Math.round((finishComplete / finishOpen) * 100) : 0,
      byDay: finishByDay,
    },
    traffic: { ...DEMO.traffic, demo: true },
  };
}
