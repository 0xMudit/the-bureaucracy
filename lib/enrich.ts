import { assignClusters } from "./dedupe";
import { resolveArticleImage } from "./images";
import {
  aiConfigured,
  generateArticleIntel,
  inputFromItem,
  type ArticleIntel,
} from "./llm";
import { rowToItem } from "./rows";
import { applyItemIntel, serviceClient } from "./store";
import type { FeedItem, Priority, TopicId } from "./types";

/**
 * Ingestion enrichment.
 *
 * Two side effects happen here, both once per story:
 *   1. an image is resolved from RSS or the publisher page (SSRF-guarded), and
 *   2. one validated LLM call produces the five bullets and the exam angle.
 *
 * The output is written onto the FeedItem so the normal `items` upsert persists
 * it. Nothing in the rendering path calls a provider or an external page.
 */

const CONCURRENCY = Math.max(1, Number(process.env.ENRICH_CONCURRENCY ?? 3));

export interface EnrichSummary {
  imagesResolved: number;
  imagesFailed: number;
  aiProcessed: number;
  aiFallback: number;
  aiSkipped: number;
  queued: number;
  notes: string[];
}

function priorityFor(score: number): Priority {
  return score >= 70 ? "high" : score >= 48 ? "medium" : "low";
}

/** Merge the model's filing decision with the keyword classifier conservatively. */
export function applyIntel(item: FeedItem, intel: ArticleIntel, provider: string): FeedItem {
  const topic = intel.topic as TopicId;
  const aiScore = intel.india_relevant ? intel.relevance : Math.min(28, intel.relevance);
  // The classifier is good at cue words; the model is good at syllabus intent.
  // Weight the model, but never let a single call erase a clearly relevant story.
  const blended = Math.round(item.examScore * 0.35 + aiScore * 0.65);
  const examScore = Math.max(5, Math.min(98, intel.india_relevant ? blended : Math.min(blended, 32)));
  const topics = [topic, ...item.topics.filter((entry) => entry !== topic)].slice(0, 3);

  return {
    ...item,
    topics,
    primaryTopic: topic,
    examScore,
    priority: intel.india_relevant ? priorityFor(examScore) : "low",
    summaryBullets: intel.bullets,
    examAngle: intel.why_it_matters,
    gsPaper: intel.gs_paper,
    prelimsFact: intel.prelims_fact,
    mainsAngle: intel.mains_angle || null,
    syllabusHint: intel.syllabus_hint || null,
    indiaRelevant: intel.india_relevant,
    aiRelevance: intel.relevance,
    aiProvider: provider,
  };
}

async function recordJob(input: {
  itemId: string;
  status: "queued" | "running" | "done" | "failed" | "skipped";
  provider?: string;
  model?: string;
  attempts?: number;
  error?: string;
  latencyMs?: number;
  result?: unknown;
  nextAttemptAt?: string;
}): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  try {
    await db.from("ai_jobs").upsert(
      {
        item_id: input.itemId,
        status: input.status,
        provider: input.provider ?? null,
        model: input.model ?? null,
        attempts: input.attempts ?? 0,
        error: input.error ?? null,
        latency_ms: input.latencyMs ?? null,
        result: input.result ?? null,
        next_attempt_at: input.nextAttemptAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" },
    );
  } catch {
    // The queue is an operations nicety; never fail the ingest over it.
  }
}

/** Queue every story that still lacks generated bullets. */
export async function enqueueAiJobs(items: FeedItem[]): Promise<number> {
  const db = serviceClient();
  if (!db) return 0;
  const rows = items
    .filter((item) => !item.summaryBullets?.length)
    .map((item) => ({ item_id: item.id, status: "queued" as const }));
  if (!rows.length) return 0;
  try {
    const { error } = await db
      .from("ai_jobs")
      .upsert(rows, { onConflict: "item_id", ignoreDuplicates: true });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function enrichItems(
  input: FeedItem[],
  options: { maxAi?: number; maxImages?: number } = {},
): Promise<{ items: FeedItem[]; summary: EnrichSummary }> {
  const maxAi = Math.max(
    0,
    options.maxAi ?? Number(process.env.AI_MAX_PER_RUN ?? 10),
  );
  const maxImages = Math.max(
    0,
    options.maxImages ?? Number(process.env.IMAGE_MAX_PER_RUN ?? 24),
  );

  const items = assignClusters(input);
  const summary: EnrichSummary = {
    imagesResolved: 0,
    imagesFailed: 0,
    aiProcessed: 0,
    aiFallback: 0,
    aiSkipped: 0,
    queued: 0,
    notes: [],
  };

  // --- images -------------------------------------------------------------
  if (maxImages > 0) {
    const candidates = items.filter((item) => !item.imageUrl).slice(0, maxImages);
    await pool(candidates, CONCURRENCY, async (item) => {
      // Google News RSS links are redirects; resolving the page both finds the
      // image and hands us the publisher's canonical URL.
      const resolution = await resolveArticleImage({
        url: item.url,
        publisher: item.source,
      });
      const target = items.find((entry) => entry.id === item.id);
      if (!target) return;
      const isAggregator = (() => {
        try {
          return /(^|\.)news\.google\.com$/i.test(new URL(item.url).hostname);
        } catch {
          return false;
        }
      })();
      if (resolution.finalUrl && isAggregator) {
        target.url = resolution.finalUrl;
      }
      if (resolution.imageUrl) {
        target.imageUrl = resolution.imageUrl;
        target.imageSource = resolution.imageSource;
        target.imageAttribution = resolution.imageAttribution;
        summary.imagesResolved += 1;
      } else {
        summary.imagesFailed += 1;
      }
    });
  }

  // RSS-supplied images need no network call, but still carry attribution.
  for (const item of items) {
    if (item.imageUrl && !item.imageSource) {
      item.imageSource = "rss";
      item.imageAttribution = item.source;
    }
  }

  // --- generated briefs ---------------------------------------------------
  const aiCandidates = items
    .filter((item) => !item.summaryBullets?.length)
    .slice(0, maxAi);

  if (aiCandidates.length && aiConfigured()) {
    await pool(aiCandidates, Math.min(CONCURRENCY, 2), async (item) => {
      const result = await generateArticleIntel(inputFromItem(item));
      Object.assign(item, applyIntel(item, result.intel, result.provider));
      summary.aiProcessed += 1;
      if (result.fallback) summary.aiFallback += 1;
      await recordJob({
        itemId: item.id,
        status: result.fallback ? "failed" : "done",
        provider: result.provider,
        model: result.model,
        attempts: result.attempts.length,
        latencyMs: result.latencyMs,
        result: result.intel,
        error: result.fallback
          ? result.attempts.map((attempt) => `${attempt.provider}: ${attempt.message}`).join(" | ").slice(0, 900)
          : undefined,
        nextAttemptAt: result.fallback
          ? new Date(Date.now() + 6 * 60 * 60_000).toISOString()
          : new Date().toISOString(),
      });
    });
  } else if (aiCandidates.length) {
    summary.aiSkipped = aiCandidates.length;
    summary.notes.push("No LLM provider key configured; articles kept the classifier copy.");
  }

  // Anything not processed now is queued for the next cron tick.
  summary.queued = await enqueueAiJobs(items);
  return { items, summary };
}

/**
 * Drain a slice of the queue. Called by `/api/ai/process` from Vercel cron.
 * Only stories still on the wire are worth generating; archived items keep the
 * copy they had.
 */
export async function processQueuedAiJobs(limit = 8): Promise<{
  ok: boolean;
  processed: number;
  failed: number;
  reason?: string;
}> {
  const db = serviceClient();
  if (!db) return { ok: false, processed: 0, failed: 0, reason: "no database" };
  if (!aiConfigured()) return { ok: false, processed: 0, failed: 0, reason: "no provider key" };

  const dailyCap = Number(process.env.AI_DAILY_CAP ?? 180);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from("ai_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["done", "running"])
    .gte("updated_at", dayStart.toISOString());
  if ((count ?? 0) >= dailyCap) {
    return { ok: true, processed: 0, failed: 0, reason: `daily cap ${dailyCap} reached` };
  }

  const { data: jobs, error } = await db
    .from("ai_jobs")
    .select("id, item_id, attempts")
    .in("status", ["queued", "failed"])
    .lt("attempts", 3)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, dailyCap - (count ?? 0))));
  if (error) return { ok: false, processed: 0, failed: 0, reason: error.message };
  if (!jobs?.length) return { ok: true, processed: 0, failed: 0 };

  const itemIds = jobs.map((job) => String(job.item_id));
  const { data: rows } = await db.from("items").select("*").in("id", itemIds);
  const items = new Map((rows ?? []).map((row) => [String(row.id), rowToItem(row)]));

  let processed = 0;
  let failed = 0;

  await pool(jobs, Math.min(CONCURRENCY, 2), async (job) => {
    const item = items.get(String(job.item_id));
    if (!item) {
      await recordJob({ itemId: String(job.item_id), status: "skipped", error: "story no longer on the wire" });
      return;
    }
    const attempts = Number(job.attempts ?? 0) + 1;
    await db.from("ai_jobs").update({ status: "running", locked_at: new Date().toISOString() }).eq("id", job.id);

    const result = await generateArticleIntel(inputFromItem(item));
    const next = applyIntel(item, result.intel, result.provider);
    try {
      await applyItemIntel(item.id, {
        summaryBullets: next.summaryBullets,
        examAngle: next.examAngle,
        gsPaper: next.gsPaper,
        prelimsFact: next.prelimsFact,
        mainsAngle: next.mainsAngle,
        syllabusHint: next.syllabusHint,
        indiaRelevant: next.indiaRelevant,
        aiRelevance: next.aiRelevance,
        aiProvider: next.aiProvider,
        primaryTopic: next.primaryTopic,
        topics: next.topics,
        examScore: next.examScore,
        priority: next.priority,
      });
    } catch {
      failed += 1;
      return;
    }

    await db
      .from("ai_jobs")
      .update({
        status: result.fallback ? "failed" : "done",
        provider: result.provider,
        model: result.model,
        attempts,
        error: result.fallback
          ? result.attempts.map((attempt) => `${attempt.provider}: ${attempt.message}`).join(" | ").slice(0, 900)
          : null,
        latency_ms: result.latencyMs,
        result: result.intel,
        locked_at: null,
        updated_at: new Date().toISOString(),
        next_attempt_at: new Date(Date.now() + Math.min(24, 2 ** attempts) * 60 * 60_000).toISOString(),
      })
      .eq("id", job.id);

    if (result.fallback) failed += 1;
    else processed += 1;
  });

  return { ok: true, processed, failed };
}
