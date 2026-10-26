import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSessionUser, userCan } from "@/lib/auth";
import { cachedItems } from "@/lib/cached";
import { SOURCES } from "@/lib/sources";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ingestion · The desk",
  robots: { index: false, follow: false },
};

const TIER_LABEL: Record<string, string> = {
  official: "Official",
  news: "News",
  analysis: "Analysis",
  aggregator: "Aggregator",
};

export default async function AdminIngestionPage() {
  const user = await getSessionUser();
  if (!user || !userCan(user, "admin.dashboard")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Not accessible.</h1>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">Back to the desk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const db = serviceClient();
  const items = await cachedItems();

  // Build per-source stats from the live feed
  const sourceCounts = new Map<string, { count: number; latest: string | null }>();
  for (const item of items) {
    const entry = sourceCounts.get(item.source) ?? { count: 0, latest: null };
    entry.count += 1;
    if (!entry.latest || item.fetchedAt > entry.latest) entry.latest = item.fetchedAt;
    sourceCounts.set(item.source, entry);
  }

  // Try to read ingest run log from DB if available
  let lastIngestAt: string | null = null;
  let ingestErrors: { source: string; message: string }[] = [];
  if (db) {
    const { data } = await db
      .from("tb_ingest_log")
      .select("created_at, errors")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));
    if (data) {
      const row = data as { created_at: string; errors: { source: string; message: string }[] };
      lastIngestAt = row.created_at;
      ingestErrors = row.errors ?? [];
    }
  }

  const totalItems = items.length;
  const uniqueSources = sourceCounts.size;
  const officialCount = SOURCES.filter((s) => s.tier === "official").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <Rss className="size-3.5" /> Ingestion
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            Feed health.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {totalItems} stories in the 24-hour window across {uniqueSources} active sources.
            {lastIngestAt ? ` Last synced ${timeAgo(lastIngestAt)}.` : ""}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
          <Link href="/api/ingest">
            <RefreshCw className="size-3.5" /> Trigger ingest
          </Link>
        </Button>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Live stories", value: totalItems, icon: Activity },
          { label: "Sources configured", value: SOURCES.length, icon: Rss },
          { label: "Active sources", value: uniqueSources, icon: CheckCircle2 },
          { label: "Official sources", value: officialCount, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 font-display text-[1.8rem] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Error log */}
      {ingestErrors.length > 0 && (
        <div className="mt-5 border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-destructive">
            <AlertCircle className="size-3.5" />
            {ingestErrors.length} error{ingestErrors.length !== 1 ? "s" : ""} on last run
          </p>
          <ul className="mt-2 space-y-1">
            {ingestErrors.map((err, i) => (
              <li key={i} className="font-mono text-[10px] text-destructive">
                <span className="font-medium">{err.source}</span>:{" "}
                <span className="text-muted-foreground">{err.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source table */}
      <div className="mt-5 overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-2 font-normal">Source</th>
              <th className="px-3 py-2 font-normal">Tier</th>
              <th className="px-3 py-2 font-normal">Stories (24 h)</th>
              <th className="px-3 py-2 font-normal">Last item</th>
              <th className="px-3 py-2 font-normal">Feed</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((src) => {
              const stats = sourceCounts.get(src.name) ?? { count: 0, latest: null };
              const active = stats.count > 0;
              return (
                <tr key={src.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${active ? "bg-success" : "bg-muted-foreground/30"}`}
                        title={active ? "Active" : "No articles in window"}
                      />
                      <a
                        href={src.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12.5px] font-medium hover:text-primary"
                      >
                        {src.name}
                      </a>
                    </div>
                    {src.note ? (
                      <p className="mt-0.5 pl-3.5 font-mono text-[8px] text-muted-foreground">{src.note}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="font-mono text-[8px] uppercase tracking-[0.08em]">
                      {TIER_LABEL[src.tier] ?? src.tier}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {stats.count || "–"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                    {stats.latest ? timeAgo(stats.latest) : "–"}
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[8px] text-muted-foreground hover:text-primary"
                    >
                      RSS <ExternalLink className="size-2.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground">
        Story counts come from the live 24-hour window. Zero means either the source produced no eligible
        articles in this cycle or stories were dropped by the classification guard.
      </p>
    </div>
  );
}
