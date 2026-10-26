import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Bot, CheckCircle2, Clock, RefreshCw, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser, userCan } from "@/lib/auth";
import { cachedItems } from "@/lib/cached";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LLM jobs · The desk",
  robots: { index: false, follow: false },
};

/**
 * DEMO DATA: The LLM job queue and provider stats shown here are representative
 * placeholders. When the Supabase table `tb_llm_jobs` exists (created by the
 * content pipeline migration), the real rows replace these values automatically.
 */
const DEMO_PROVIDERS = [
  { name: "Gemini (free tier)", requests: 42, failures: 1, avgMs: 1240, quota: "60 req/min" },
  { name: "Groq (free tier)", requests: 18, failures: 3, avgMs: 640, quota: "30 req/min" },
  { name: "OpenRouter (free)", requests: 7, failures: 2, avgMs: 2100, quota: "varies" },
  { name: "Cloudflare AI", requests: 3, failures: 0, avgMs: 890, quota: "10k tokens/day" },
];

type LlmJobRow = {
  id: string;
  item_id: string;
  item_title: string | null;
  status: "pending" | "done" | "failed";
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminLlmPage() {
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

  // Real data from tb_llm_jobs if available
  let jobs: LlmJobRow[] = [];
  let hasRealData = false;
  let pendingCount = 0;
  let failedCount = 0;
  let doneCount = 0;

  if (db) {
    const { data } = await db
      .from("tb_llm_jobs")
      .select("id,item_id,item_title,status,provider,model,latency_ms,error,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then((r) => r, () => ({ data: null }));

    if (data && Array.isArray(data) && data.length > 0) {
      jobs = data as LlmJobRow[];
      hasRealData = true;
      pendingCount = jobs.filter((j) => j.status === "pending").length;
      failedCount = jobs.filter((j) => j.status === "failed").length;
      doneCount = jobs.filter((j) => j.status === "done").length;
    }
  }

  // Enrichment coverage from live items
  const enriched = items.filter((i) => i.summaryBullets && i.summaryBullets.length > 0).length;
  const total = items.length;
  const coveragePct = total > 0 ? Math.round((enriched / total) * 100) : 0;

  const providerCounts = new Map<string, number>();
  for (const item of items) {
    if (item.aiProvider) providerCounts.set(item.aiProvider, (providerCounts.get(item.aiProvider) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <Bot className="size-3.5" /> LLM pipeline
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            Enrichment jobs.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {enriched} of {total} live stories enriched ({coveragePct}%). One LLM call per article at
            ingestion; results cached in Postgres, never repeated per page view.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
          <Link href="/api/ai/process">
            <RefreshCw className="size-3.5" /> Run enrichment
          </Link>
        </Button>
      </div>

      {/* Coverage */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Enriched stories", value: enriched, icon: CheckCircle2 },
          { label: "Coverage", value: `${coveragePct}%`, icon: Zap },
          { label: "Pending jobs", value: hasRealData ? pendingCount : "–", icon: Clock },
          { label: "Failed jobs", value: hasRealData ? failedCount : "–", icon: AlertCircle },
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

      {/* Provider breakdown */}
      <div className="mt-6">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Provider usage {!hasRealData && providerCounts.size === 0 ? "· Demo data" : ""}
        </h2>
        <div className="mt-2 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-3 py-2 font-normal">Provider</th>
                <th className="px-3 py-2 font-normal">Requests</th>
                <th className="px-3 py-2 font-normal">Failures</th>
                <th className="px-3 py-2 font-normal">Avg latency</th>
                <th className="px-3 py-2 font-normal">Free quota</th>
              </tr>
            </thead>
            <tbody>
              {providerCounts.size > 0
                ? [...providerCounts.entries()].map(([provider, count]) => (
                    <tr key={provider} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2.5 text-[12.5px] font-medium">{provider}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{count}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">–</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">–</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">–</td>
                    </tr>
                  ))
                : DEMO_PROVIDERS.map((p) => (
                    <tr key={p.name} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="text-[12.5px] font-medium">{p.name}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{p.requests}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                        {p.failures > 0 ? (
                          <span className="text-destructive">{p.failures}</span>
                        ) : (
                          p.failures
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{p.avgMs} ms</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{p.quota}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!hasRealData && providerCounts.size === 0 && (
          <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
            Demo data · Real provider usage will appear once tb_llm_jobs is seeded.
          </p>
        )}
      </div>

      {/* Recent jobs */}
      {hasRealData && jobs.length > 0 && (
        <div className="mt-6">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Recent jobs</h2>
          <div className="mt-2 overflow-x-auto border border-border bg-card">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Article</th>
                  <th className="px-3 py-2 font-normal">Provider</th>
                  <th className="px-3 py-2 font-normal">Latency</th>
                  <th className="px-3 py-2 font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[8px] uppercase tracking-[0.08em] ${
                          job.status === "done"
                            ? "border-success/40 text-success"
                            : job.status === "failed"
                              ? "border-destructive/40 text-destructive"
                              : "border-warning/40 text-warning"
                        }`}
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/item/${job.item_id}`}
                        className="line-clamp-1 max-w-xs text-[12px] font-medium hover:text-primary"
                      >
                        {job.item_title ?? job.item_id}
                      </Link>
                      {job.error ? (
                        <p className="mt-0.5 font-mono text-[8px] text-destructive">{job.error}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {job.provider ?? "–"}{job.model ? ` / ${job.model}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {job.latency_ms ? `${job.latency_ms} ms` : "–"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {timeAgo(job.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 border border-dashed border-border px-4 py-3">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
          LLM keys in env vars: GEMINI_API_KEY · GROQ_API_KEY · OPENROUTER_API_KEY · CLOUDFLARE_ACCOUNT_ID +
          CLOUDFLARE_AI_TOKEN. None of the free tiers is unlimited; AI_MAX_PER_RUN caps work per cron tick.
        </p>
      </div>
    </div>
  );
}
