import { z } from "zod";
import { OPTIONAL_ORDER, TOPIC_ORDER } from "./taxonomy";
import type { FeedItem } from "./types";

/**
 * The LLM layer.
 *
 * One call per story at ingestion returns a small, validated object. Page views
 * never call a provider: the result is cached in Postgres and reused until the
 * story leaves the wire. Providers are free tiers and can fail, so every call
 * walks an ordered fallback chain and every failure is recorded on the job.
 *
 * Keys live in env vars only:
 *   GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY,
 *   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN
 *
 * None of the free tiers is unlimited. `AI_MAX_PER_RUN` caps work per ingest
 * and the queue backfills the rest on the next cron tick.
 */

export const PROMPT_VERSION = "article-intel-v1";

export const articleIntelSchema = z.object({
  bullets: z.array(z.string().trim().min(6).max(260)).length(5),
  why_it_matters: z.string().trim().min(30).max(1200),
  gs_paper: z.string().trim().min(2).max(48),
  topic: z.enum(TOPIC_ORDER as [string, ...string[]]),
  optional_subjects: z.array(z.enum(OPTIONAL_ORDER as [string, ...string[]])).max(3).default([]),
  relevance: z.number().int().min(0).max(100),
  india_relevant: z.boolean(),
  prelims_fact: z.string().trim().min(5).max(500),
  mains_angle: z.string().trim().max(500).default(""),
  syllabus_hint: z.string().trim().max(400).default(""),
});

export type ArticleIntel = z.infer<typeof articleIntelSchema>;

export interface LlmFailure {
  provider: string;
  message: string;
}

export interface LlmResult {
  intel: ArticleIntel;
  provider: string;
  model: string;
  latencyMs: number;
  attempts: LlmFailure[];
  fallback: boolean;
}

export interface ArticleInput {
  title: string;
  summary: string;
  source: string;
  sourceTier: string;
  url: string;
  publishedAt: string;
  currentTopic: string | null;
}

export function aiConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
  );
}

const SYSTEM = `You are the current-affairs editor of a UPSC civil-services news desk.
Return ONE JSON object and nothing else. No markdown fences, no commentary.
Every fact you write must be present in the supplied headline and excerpt. Never invent
numbers, dates, names, articles or scheme details. If the excerpt is thin, stay general.
Write for an Indian civil-services aspirant, not a general news reader.`;

function prompt(input: ArticleInput): string {
  return `HEADLINE: ${input.title}
PUBLISHER: ${input.source} (${input.sourceTier})
PUBLISHED: ${input.publishedAt}
URL: ${input.url}
EXCERPT: ${input.summary || "(the publisher supplied no excerpt; keep every claim generic and safe)"}
CURRENT_CLASSIFIER_TOPIC: ${input.currentTopic ?? "unknown"}

Return exactly this shape:
{
  "bullets": ["five short bullets"],
  "why_it_matters": "two to four sentences of exam angle",
  "gs_paper": "Prelims | GS-I | GS-II | GS-III | GS-IV | Essay",
  "topic": one of ${JSON.stringify(TOPIC_ORDER)},
  "optional_subjects": subset of ${JSON.stringify(OPTIONAL_ORDER)},
  "relevance": 0-100,
  "india_relevant": true or false,
  "prelims_fact": "one factual line a Prelims question could test",
  "mains_angle": "one Mains question or analytical angle",
  "syllabus_hint": "one line linking the story to a static syllabus node"
}

Rules for bullets:
- Exactly five. Each at most 15 words. Punchy, factual, no duplication.
- Wrap the key terms (schemes, institutions, Articles, numbers, dates) in **double asterisks**.
- No preamble such as "The article says".

Rules for classification:
- india_relevant is false for foreign domestic politics, foreign sport, gadget launches,
  celebrity news, pure science prizes with no Indian policy dimension, or anything with no
  plausible syllabus use. Set relevance below 35 for those.
- Choose the topic that a UPSC aspirant would file it under, even when the current classifier
  is wrong (for example a physics Nobel prize is "science", not "environment").
- gs_paper must be the paper the story actually serves.`;
}

function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("No JSON object in the response.");
    return JSON.parse(text.slice(first, last + 1));
  }
}

function normalise(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const topic = String(record.topic ?? "").toLowerCase().trim();
  const paper = String(record.gs_paper ?? "").trim();
  return {
    ...record,
    topic: (TOPIC_ORDER as readonly string[]).includes(topic) ? topic : "polity",
    gs_paper: paper || "Prelims",
    optional_subjects: Array.isArray(record.optional_subjects)
      ? record.optional_subjects
          .map((item) => String(item).toLowerCase().trim())
          .filter((item) => (OPTIONAL_ORDER as readonly string[]).includes(item))
      : [],
    relevance: Number.isFinite(Number(record.relevance)) ? Math.round(Number(record.relevance)) : 40,
    india_relevant: record.india_relevant === true,
    bullets: Array.isArray(record.bullets) ? record.bullets.slice(0, 5) : [],
    why_it_matters: String(record.why_it_matters ?? "").trim(),
    prelims_fact: String(record.prelims_fact ?? "").trim(),
    mains_angle: String(record.mains_angle ?? "").trim(),
    syllabus_hint: String(record.syllabus_hint ?? "").trim(),
  };
}

interface Provider {
  id: string;
  model: string;
  available: () => boolean;
  complete: (prompt: string, system: string, signal: AbortSignal) => Promise<string>;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

const GEMINI_MODEL = () => env("GEMINI_MODEL") ?? "gemini-2.0-flash";
const GROQ_MODEL = () => env("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
const OPENROUTER_MODEL = () => env("OPENROUTER_MODEL") ?? "meta-llama/llama-3.3-70b-instruct:free";
const CLOUDFLARE_MODEL = () => env("CLOUDFLARE_AI_MODEL") ?? "@cf/meta/llama-3.1-8b-instruct";

async function postJson(url: string, body: unknown, headers: Record<string, string>, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${text.slice(0, 180)}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

const PROVIDERS: Provider[] = [
  {
    id: "gemini",
    model: GEMINI_MODEL(),
    available: () => Boolean(env("GEMINI_API_KEY")),
    async complete(promptText, system, signal) {
      const key = env("GEMINI_API_KEY");
      const model = GEMINI_MODEL();
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key ?? "")}`,
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
          },
        },
        {},
        signal,
      );
      const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
      const text = candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text) throw new Error("Gemini returned no text.");
      return text;
    },
  },
  {
    id: "groq",
    model: GROQ_MODEL(),
    available: () => Boolean(env("GROQ_API_KEY")),
    async complete(promptText, system, signal) {
      const data = await postJson(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: GROQ_MODEL(),
          temperature: 0.25,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: promptText },
          ],
        },
        { authorization: `Bearer ${env("GROQ_API_KEY")}` },
        signal,
      );
      const choices = data.choices as { message?: { content?: string } }[] | undefined;
      const text = choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("Groq returned no text.");
      return text;
    },
  },
  {
    id: "openrouter",
    model: OPENROUTER_MODEL(),
    available: () => Boolean(env("OPENROUTER_API_KEY")),
    async complete(promptText, system, signal) {
      const data = await postJson(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: OPENROUTER_MODEL(),
          temperature: 0.25,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: promptText },
          ],
        },
        {
          authorization: `Bearer ${env("OPENROUTER_API_KEY")}`,
          "http-referer": env("NEXT_PUBLIC_SITE_URL") ?? "https://the-bureaucracy.vercel.app",
          "x-title": "The Bureaucracy",
        },
        signal,
      );
      const choices = data.choices as { message?: { content?: string } }[] | undefined;
      const text = choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("OpenRouter returned no text.");
      return text;
    },
  },
  {
    id: "cloudflare",
    model: CLOUDFLARE_MODEL(),
    available: () => Boolean(env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_AI_TOKEN")),
    async complete(promptText, system, signal) {
      const account = env("CLOUDFLARE_ACCOUNT_ID");
      const model = CLOUDFLARE_MODEL();
      const data = await postJson(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account ?? "")}/ai/run/${model}`,
        {
          messages: [
            { role: "system", content: system },
            { role: "user", content: promptText },
          ],
          max_tokens: 900,
          temperature: 0.25,
        },
        { authorization: `Bearer ${env("CLOUDFLARE_AI_TOKEN")}` },
        signal,
      );
      const result = data.result as { response?: string } | string | undefined;
      const text = typeof result === "string" ? result : result?.response ?? "";
      if (!text) throw new Error("Workers AI returned no text.");
      return text;
    },
  },
];

/** Shorten a bullet to the 15-word house limit and keep its bold markers. */
export function trimBullet(value: string, words = 15): string {
  const clean = value.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  if (parts.length <= words) return clean;
  return `${parts.slice(0, words).join(" ").replace(/[.,;/:-]+$/, "")}…`;
}

/** Bold obvious exam terms when a provider ignored the ** marker instruction. */
export function emphasiseTerms(bullet: string): string {
  if (/\*\*[^*]+\*\*/.test(bullet)) return bullet;
  const pattern =
    /\b(Article\s+\d+[A-Z]?|Section\s+\d+|(?:Rs\.?|₹)\s?[\d,.]+(?:\s?(?:crore|lakh|billion|trillion))?|\d+(?:\.\d+)?%|\b(?:19|20)\d{2}\b|\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\s+(?:Act|Commission|Scheme|Mission|Authority|Board|Court|Council|Ministry|Bank|Fund|Policy|Yojana|Bill))\b/g;
  return bullet.replace(pattern, (match) => `**${match}**`);
}

/** Deterministic excerpt fallback. Never blank, never invented. */
export function fallbackIntel(input: ArticleInput): ArticleIntel {
  const sentences = input.summary
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    .slice(0, 5);

  const base = sentences.length
    ? sentences
    : [`${input.title.replace(/\s+/g, " ").trim()} — reported by ${input.source}.`];

  const bullets = Array.from({ length: 5 }, (_, index) => {
    const source = base[index % base.length] ?? base[0];
    return emphasiseTerms(trimBullet(source));
  });

  return {
    bullets,
    why_it_matters:
      `This story sits in the current-affairs stream for ${input.currentTopic ?? "general studies"}. ` +
      "The automatic summary could not be generated, so treat the bullets as a plain excerpt. " +
      "Place the event against the syllabus, note the institution that owns it, and prepare one " +
      "Prelims fact and one Mains argument before moving on.",
    gs_paper: "Prelims",
    topic: (input.currentTopic as ArticleIntel["topic"] | null) ?? "polity",
    optional_subjects: [],
    relevance: 40,
    india_relevant: true,
    prelims_fact: input.title.replace(/\s+/g, " ").trim().slice(0, 300),
    mains_angle: "What is the policy objective, and what implementation risk would you flag?",
    syllabus_hint: "Link this to the matching GS paper and revise the static chapter it touches.",
  };
}

async function callProvider(provider: Provider, input: ArticleInput): Promise<LlmResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 25_000));
  const started = Date.now();
  const attempts: LlmFailure[] = [];

  try {
    let lastError = "";
    // One retry per provider, then fall through to the next provider.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const raw = await provider.complete(prompt(input), SYSTEM, controller.signal);
        const parsed = articleIntelSchema.safeParse(normalise(extractJson(raw)));
        if (!parsed.success) {
          lastError = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
          attempts.push({ provider: provider.id, message: `validation: ${lastError.slice(0, 300)}` });
          continue;
        }
        const intel = parsed.data;
        return {
          intel: {
            ...intel,
            bullets: intel.bullets.map((bullet) => emphasiseTerms(trimBullet(bullet))),
          },
          provider: provider.id,
          model: provider.model,
          latencyMs: Date.now() - started,
          attempts,
          fallback: false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "unknown error";
        attempts.push({ provider: provider.id, message: lastError.slice(0, 300) });
        if (controller.signal.aborted) break;
      }
    }
    throw new Error(lastError || "provider failed");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate the article brief. Walks the configured provider chain; on total
 * failure it returns the deterministic excerpt fallback with `fallback: true`.
 */
export async function generateArticleIntel(input: ArticleInput): Promise<LlmResult> {
  const started = Date.now();
  const attempts: LlmFailure[] = [];
  const available = PROVIDERS.filter((provider) => provider.available());

  for (const provider of available) {
    try {
      return await callProvider(provider, input);
    } catch (error) {
      attempts.push({
        provider: provider.id,
        message: error instanceof Error ? error.message : "failed",
      });
    }
  }

  return {
    intel: fallbackIntel(input),
    provider: "fallback",
    model: "excerpt",
    latencyMs: Date.now() - started,
    attempts,
    fallback: true,
  };
}

/** Convert a stored FeedItem into the minimal payload the prompt needs. */
export function inputFromItem(item: FeedItem): ArticleInput {
  return {
    title: item.title,
    summary: item.summary,
    source: item.source,
    sourceTier: item.sourceTier,
    url: item.url,
    publishedAt: item.publishedAt,
    currentTopic: item.primaryTopic,
  };
}
