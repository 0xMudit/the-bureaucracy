import { z } from "zod";
import { can, effectivePlan, type Entitlement, type Plan } from "./entitlements";
import { completeJson, parseJsonResponse, type ArticleInput } from "./llm";
import { listItems, serviceClient } from "./store";
import type { FeedItem } from "./types";

/**
 * The paid pack that sits on every story.
 *
 * Generation is separate from the free intel on purpose: the free call has to
 * stay small and cheap enough to run on the whole wire, while this one writes a
 * longer, structured artefact. It runs once per story per prompt version and
 * is cached in Postgres; a page view only reads it. The API decides how much of
 * it a reader receives, so a free client never holds the paid text.
 *
 * Provider preference is Groq (the chain still falls back), and every call
 * writes a usage row so cost is visible.
 */

export const PREMIUM_PROMPT_VERSION = "article-premium-v1";

const SYSTEM = `You are the senior editor of a UPSC current-affairs desk writing the paid
companion to a news brief. Return ONE JSON object and nothing else. No markdown fences, no
commentary.

Ground every claim in the supplied headline and excerpt. You may add syllabus framing and
general exam context, but never invent a number, date, name, Article, scheme detail, judgment
or committee that is not in the supplied material. If the excerpt is thin, write a careful
analysis of what is there instead of filling the gap with facts.`;

const TRAP_VERDICTS = ["true", "false"] as const;

export const premiumPackSchema = z.object({
  deep_read: z.string().trim().min(120).max(4000),
  takeaways: z.array(z.string().trim().min(6).max(300)).min(3).max(6),
  prelims_traps: z
    .array(
      z.object({
        statement: z.string().trim().min(15).max(400),
        verdict: z.enum(TRAP_VERDICTS),
        why: z.string().trim().min(10).max(500),
      }),
    )
    .min(2)
    .max(4),
  mains: z.object({
    question: z.string().trim().min(15).max(500),
    intro: z.string().trim().min(30).max(900),
    points: z.array(z.string().trim().min(15).max(600)).min(3).max(5),
    conclusion: z.string().trim().min(30).max(900),
    keywords: z.array(z.string().trim().min(2).max(80)).min(2).max(6),
    data_point: z.string().trim().max(300).default(""),
  }),
  glossary: z
    .array(
      z.object({
        term: z.string().trim().min(2).max(80),
        meaning: z.string().trim().min(10).max(400),
      }),
    )
    .max(4)
    .default([]),
});

export type PremiumPack = z.infer<typeof premiumPackSchema>;

/** The wire shape. Snake case stays in Postgres; the clients read camelCase. */
export interface PremiumPackView {
  deepRead: string;
  takeaways: string[];
  prelimsTraps: { statement: string; verdict: "true" | "false"; why: string }[];
  mains: {
    question: string;
    intro: string;
    points: string[];
    conclusion: string;
    keywords: string[];
    dataPoint: string;
  };
  glossary: { term: string; meaning: string }[];
}

export interface PremiumTeaser {
  headline: string;
  includes: string[];
}

export interface PremiumView {
  locked: boolean;
  /** The plan that applies to this request, after expiry. */
  plan: Plan;
  teaser: PremiumTeaser;
  pack: PremiumPackView | null;
  /** A paid reader, but generation failed or is still running. */
  unavailable: boolean;
  generatedAt: string | null;
  model: string | null;
}

/* -------------------------------- pricing -------------------------------- */

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
  "openai/gpt-oss-20b": { input: 0.075, output: 0.3 },
  "qwen/qwen3.8-27b": { input: 0.8, output: 4 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

/** USD for one call. An unknown model logs 0 rather than a wrong number. */
export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const price = Object.entries(PRICE_PER_MILLION).find(([prefix]) => model.startsWith(prefix))?.[1];
  if (!price) return 0;
  return (tokensIn / 1_000_000) * price.input + (tokensOut / 1_000_000) * price.output;
}

/* -------------------------------- prompts -------------------------------- */

function promptFor(item: FeedItem): string {
  const input: ArticleInput = {
    title: item.title,
    summary: item.summary,
    source: item.source,
    sourceTier: item.sourceTier,
    url: item.url,
    publishedAt: item.publishedAt,
    currentTopic: item.primaryTopic,
  };

  return `HEADLINE: ${input.title}
PUBLISHER: ${input.source} (${input.sourceTier})
PUBLISHED: ${input.publishedAt}
SYLLABUS FILING: ${item.gsPaper ?? "Prelims"}${item.primaryTopic ? ` / ${item.primaryTopic}` : ""}
FREE BRIEF BULLETS: ${JSON.stringify(item.summaryBullets ?? [])}
EXAM ANGLE ALREADY WRITTEN: ${item.examAngle ?? "(none)"}
PRELIMS FACT ALREADY WRITTEN: ${item.prelimsFact ?? "(none)"}
MAINS ANGLE ALREADY WRITTEN: ${item.mainsAngle ?? "(none)"}
EXCERPT: ${input.summary || "(the publisher supplied no excerpt; keep every claim general and safe)"}

Return exactly this shape:
{
  "deep_read": "160-220 words. What happened, why it happened, the institution or rule that owns it, the tension it creates, and what a serious aspirant should retain. Analysis, not a rewrite of the headline.",
  "takeaways": ["3-5 lines a reader could say out loud in a study group"],
  "prelims_traps": [
    {
      "statement": "one statement that can be judged true or false from the excerpt",
      "verdict": "true" or "false",
      "why": "one or two sentences explaining the verdict with the fact that decides it"
    }
  ],
  "mains": {
    "question": "a 10-mark or 15-mark Mains question this story could be the hook for",
    "intro": "a two-to-three sentence opening that defines the issue",
    "points": ["three or four body points, each with the argument and the evidence available"],
    "conclusion": "a forward-looking close that names a trade-off or an implementation risk",
    "keywords": ["three to five terms an examiner would look for"],
    "data_point": "one number, date or scale from the supplied material; empty string if none exists"
  },
  "glossary": [
    { "term": "scheme, Article, institution, judgment or term a beginner may not know", "meaning": "one line, grounded in the excerpt or in settled static knowledge" }
  ]
}

Rules:
- Exactly THREE prelims traps. At least one verdict must be "false", and a false statement must
  contradict a fact in the supplied material rather than invent a new one.
- Never write "as mentioned above" or refer to "the excerpt". Write as the desk, to the reader.
- Do not repeat the free five bullets verbatim; deepen them.
- Keep the language plain. No rhetorical questions in the deep read.
- Glossary: two to four entries. Omit rather than invent.`;
}

/* ------------------------------ normalisation ----------------------------- */

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean).slice(0, max);
}

function normalise(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  const mains = (record.mains && typeof record.mains === "object" ? record.mains : {}) as Record<
    string,
    unknown
  >;
  const traps = Array.isArray(record.prelims_traps) ? record.prelims_traps : [];
  const glossary = Array.isArray(record.glossary) ? record.glossary : [];

  return {
    deep_read: text(record.deep_read),
    takeaways: strings(record.takeaways, 6),
    prelims_traps: traps
      .map((entry) => {
        const trap = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const verdict = String(trap.verdict ?? "").trim().toLowerCase();
        return {
          statement: text(trap.statement),
          verdict: verdict === "true" || verdict === "t" || trap.verdict === true ? "true" : "false",
          why: text(trap.why),
        };
      })
      .slice(0, 4),
    mains: {
      question: text(mains.question),
      intro: text(mains.intro),
      points: strings(mains.points, 5),
      conclusion: text(mains.conclusion),
      keywords: strings(mains.keywords, 6),
      data_point: text(mains.data_point),
    },
    glossary: glossary
      .map((entry) => {
        const term = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        return { term: text(term.term), meaning: text(term.meaning) };
      })
      .filter((entry) => entry.term && entry.meaning)
      .slice(0, 4),
  };
}

export function toPremiumView(pack: PremiumPack): PremiumPackView {
  return {
    deepRead: pack.deep_read,
    takeaways: pack.takeaways,
    prelimsTraps: pack.prelims_traps,
    mains: {
      question: pack.mains.question,
      intro: pack.mains.intro,
      points: pack.mains.points,
      conclusion: pack.mains.conclusion,
      keywords: pack.mains.keywords,
      dataPoint: pack.mains.data_point,
    },
    glossary: pack.glossary,
  };
}

/**
 * The free preview. It is built from the free brief, not from the paid pack,
 * so showing it costs nothing and cannot leak the generation.
 */
export function premiumTeaser(item: FeedItem): PremiumTeaser {
  const source = (item.examAngle ?? item.summary ?? "").replace(/\s+/g, " ").trim();
  const first = source.split(/(?<=[.!?])\s+/)[0] ?? source;
  return {
    headline: first.length > 260 ? `${first.slice(0, 257).trimEnd()}…` : first,
    includes: [
      "A 200-word deep read",
      "Three Prelims traps, with the reasoning",
      "A Mains skeleton you can write from",
      "Keywords and one citable data point",
    ],
  };
}

/* -------------------------------- storage -------------------------------- */

interface StoredPack {
  pack: PremiumPack;
  generatedAt: string;
  provider: string | null;
  model: string | null;
}

export async function readPremiumPack(itemId: string): Promise<StoredPack | null> {
  const db = serviceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("tb_premium_reads")
    .select("pack, provider, model, generated_at")
    .eq("item_id", itemId)
    .eq("prompt_version", PREMIUM_PROMPT_VERSION)
    .maybeSingle();

  if (error || !data) return null;
  const parsed = premiumPackSchema.safeParse(data.pack);
  if (!parsed.success) return null;

  return {
    pack: parsed.data,
    generatedAt: String(data.generated_at ?? new Date().toISOString()),
    provider: typeof data.provider === "string" ? data.provider : null,
    model: typeof data.model === "string" ? data.model : null,
  };
}

async function persistPack(
  itemId: string,
  pack: PremiumPack,
  meta: {
    provider: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  },
): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  const now = new Date().toISOString();

  const { error } = await db.from("tb_premium_reads").upsert(
    {
      item_id: itemId,
      prompt_version: PREMIUM_PROMPT_VERSION,
      pack,
      provider: meta.provider,
      model: meta.model,
      tokens_in: meta.tokensIn,
      tokens_out: meta.tokensOut,
      cost_usd: meta.costUsd,
      generated_at: now,
    },
    { onConflict: "item_id,prompt_version" },
  );

  // A cache write failure still leaves a usable pack in this response, so it
  // is logged rather than thrown.
  if (!error) {
    await db
      .from("tb_ai_usage")
      .insert({
        kind: "premium_pack",
        item_id: itemId,
        provider: meta.provider,
        model: meta.model,
        tokens_in: meta.tokensIn,
        tokens_out: meta.tokensOut,
        cost_usd: meta.costUsd,
        prompt_version: PREMIUM_PROMPT_VERSION,
      })
      .then(() => undefined, () => undefined);
  }
}

/** Kill switch for a bad prompt or a provider incident. */
export function premiumEnabled(): boolean {
  return process.env.PREMIUM_AI_ENABLED !== "0";
}

export interface PremiumGeneration {
  pack: PremiumPack;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}

const REMINDER =
  "\n\nREMINDER: the previous answer was rejected because a required section was missing or too short. Return every key in full: deep_read, takeaways (3+), prelims_traps (exactly 3, each with statement, verdict, why), mains (question, intro, points with 3+ entries, conclusion, keywords with 2+ entries, data_point) and glossary.";

export async function generatePremiumPack(item: FeedItem): Promise<PremiumGeneration> {
  const basePrompt = promptFor(item);
  let lastError = "";

  // Small models occasionally drop the tail of a long schema. One corrective
  // retry costs about a tenth of a paisa and removes the blank-slot case.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await completeJson({
      system: SYSTEM,
      prompt: attempt === 0 ? basePrompt : `${basePrompt}${REMINDER}`,
      maxTokens: 2200,
      temperature: 0.32,
      // Groq is fast enough to generate inline; the cap keeps a stalled
      // provider from holding a page or a mobile request for the full timeout.
      timeoutMs: Number(process.env.PREMIUM_TIMEOUT_MS ?? 14_000),
      // The product promise is a Groq-written pack. The rest of the chain keeps
      // the feature alive when the free tier is rate-limited.
      order: ["groq", "gemini", "openrouter", "cloudflare"],
    });

    const parsed = premiumPackSchema.safeParse(normalise(parseJsonResponse(completion.text)));
    if (parsed.success) {
      return {
        pack: parsed.data,
        provider: completion.provider,
        model: completion.model,
        tokensIn: completion.tokensIn,
        tokensOut: completion.tokensOut,
        costUsd: estimateCostUsd(completion.model, completion.tokensIn, completion.tokensOut),
        latencyMs: completion.latencyMs,
      };
    }

    lastError = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    // A malformed pack is a prompt problem, not a reader problem. Keep the raw
    // response in the server log so a bad schema can be debugged from ops.
    console.error(
      `[premium] invalid pack (attempt ${attempt + 1}) from ${completion.provider}/${completion.model}: ${lastError.slice(0, 300)} | raw: ${completion.text.slice(0, 400)}`,
    );
  }

  throw new Error(`Premium pack failed validation: ${lastError.slice(0, 400)}`);
}

/** Read the cached pack, generating it on the first paid request if needed. */
export async function ensurePremiumPack(item: FeedItem): Promise<StoredPack | null> {
  const existing = await readPremiumPack(item.id);
  if (existing) return existing;
  if (!premiumEnabled()) return null;

  try {
    const generation = await generatePremiumPack(item);
    await persistPack(item.id, generation.pack, generation);
    return {
      pack: generation.pack,
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
    };
  } catch {
    // Generation is best effort. The reader keeps the free story and sees the
    // teaser; the next request or the cron backfill retries.
    return null;
  }
}

/**
 * The single gate used by both the web page and the mobile API.
 *
 * Free readers get a teaser built from free material. Paid readers get the
 * pack, with `generate` controlling whether a cache miss may call a provider.
 */
export async function premiumView(
  item: FeedItem,
  entitlement: Entitlement | null | undefined,
  options: { generate?: boolean } = {},
): Promise<PremiumView> {
  const plan = effectivePlan(entitlement);
  const teaser = premiumTeaser(item);
  const base = { plan, teaser, generatedAt: null, model: null };

  if (!can(entitlement, "premium_read")) {
    return { ...base, locked: true, pack: null, unavailable: false };
  }

  const cached = await readPremiumPack(item.id);
  const stored = cached ?? (options.generate === false ? null : await ensurePremiumPack(item));
  if (!stored) {
    return { ...base, locked: false, pack: null, unavailable: true };
  }

  return {
    locked: false,
    plan,
    teaser,
    pack: toPremiumView(stored.pack),
    unavailable: false,
    generatedAt: stored.generatedAt,
    model: stored.model,
  };
}

/**
 * Pre-generate packs for the day's best stories so a paid reader rarely waits
 * on a provider. Called from the AI cron route; bounded so a slow provider
 * cannot make the cron run long.
 *
 * The free Groq tier is metered per minute and per day, and the free article
 * intel draws from the same account. A token budget for the last 24 hours keeps
 * a busy wire from starving the free tier — 120k of the 200k daily tokens,
 * leaving room for the brief and for on-demand packs. When the budget is
 * spent, paid readers still generate on demand, just not ahead of time.
 */
const DEFAULT_DAILY_TOKEN_BUDGET = 120_000;

export async function backfillPremiumPacks(limit = 3): Promise<{
  generated: number;
  failed: number;
  remaining: number;
  skipped?: "budget" | "empty" | "disabled" | "busy";
}> {
  const db = serviceClient();
  if (!db || !premiumEnabled()) return { generated: 0, failed: 0, remaining: 0, skipped: "disabled" };

  const budget = Number(process.env.PREMIUM_DAILY_TOKEN_BUDGET ?? DEFAULT_DAILY_TOKEN_BUDGET);
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: usage } = await db
    .from("tb_ai_usage")
    .select("tokens_in, tokens_out")
    .eq("kind", "premium_pack")
    .gte("created_at", since);
  const spent = (usage ?? []).reduce(
    (sum, row) => sum + Number(row.tokens_in ?? 0) + Number(row.tokens_out ?? 0),
    0,
  );
  if (spent >= budget) {
    return { generated: 0, failed: 0, remaining: 0, skipped: "budget" };
  }

  const items = (await listItems())
    // The free brief is the richer prompt input, but the wire is not always
    // enriched (a missing provider key, a fresh ingest). A long excerpt is
    // enough for the generator, and the pack is better than a blank slot.
    .filter((item) => item.summaryBullets?.length || (item.summary?.length ?? 0) >= 100)
    .sort((a, b) => b.examScore - a.examScore)
    .slice(0, 80);
  if (!items.length) return { generated: 0, failed: 0, remaining: 0, skipped: "empty" };

  const { data } = await db
    .from("tb_premium_reads")
    .select("item_id")
    .eq("prompt_version", PREMIUM_PROMPT_VERSION)
    .in(
      "item_id",
      items.map((item) => item.id),
    );
  const have = new Set((data ?? []).map((row) => String(row.item_id)));
  const todo = items.filter((item) => !have.has(item.id));

  let generated = 0;
  let failed = 0;
  for (const item of todo.slice(0, Math.max(0, limit))) {
    const stored = await ensurePremiumPack(item);
    if (stored) generated += 1;
    else failed += 1;
  }

  return { generated, failed, remaining: Math.max(0, todo.length - generated - failed) };
}
