import { serviceClient } from "./store";
import type { SavedItem } from "./saved";

/**
 * Durable reader state for signed-in accounts.
 *
 * The device remains the source of truth for an anonymous reader. Signing in
 * merges whatever the device has with whatever the account has, so no streak is
 * lost on the first sync and two devices converge instead of overwriting each
 * other. Every field is bounded here because the payload is client-supplied.
 */

export interface QuizScore {
  correct: number;
  total: number;
}

export interface ReaderProgress {
  version: 2;
  /** IST day key -> item ids read that day. */
  days: Record<string, string[]>;
  joinedAt: string | null;
  visits: number;
  lastVisit: string | null;
  /** itemId -> primary topic, so coverage survives the 24h wire. */
  topics: Record<string, string>;
  quiz: Record<string, QuizScore>;
  /** IST day keys whose five-story brief was completed. Unioned on merge. */
  briefDays: string[];
}

export const EMPTY_PROGRESS: ReaderProgress = {
  version: 2,
  days: {},
  joinedAt: null,
  visits: 0,
  lastVisit: null,
  topics: {},
  quiz: {},
  briefDays: [],
};

export interface ReaderState {
  progress: ReaderProgress;
  saves: SavedItem[];
  updatedAt: string | null;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;
const MAX_IDS_PER_DAY = 400;
const MAX_TOPICS = 4000;
const MAX_QUIZ = 400;
const MAX_BRIEF_DAYS = 400;
const MAX_SAVES = 300;

const PRIORITIES = new Set(["high", "medium", "low"]);

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

function finiteInt(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

export function sanitizeProgress(input: unknown): ReaderProgress {
  const raw = (input ?? {}) as Record<string, unknown>;

  const days: Record<string, string[]> = {};
  const rawDays = (raw.days ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(rawDays)) {
    if (!DAY_RE.test(key) || !Array.isArray(value)) continue;
    const ids = Array.from(
      new Set(value.filter((id): id is string => typeof id === "string" && id.length <= 80)),
    ).slice(0, MAX_IDS_PER_DAY);
    if (ids.length) days[key] = ids;
    if (Object.keys(days).length >= MAX_DAYS) break;
  }

  const topics: Record<string, string> = {};
  for (const [id, value] of Object.entries((raw.topics ?? {}) as Record<string, unknown>)) {
    if (id.length > 80 || typeof value !== "string" || value.length > 40) continue;
    topics[id] = value;
    if (Object.keys(topics).length >= MAX_TOPICS) break;
  }

  const quiz: Record<string, QuizScore> = {};
  for (const [key, value] of Object.entries((raw.quiz ?? {}) as Record<string, unknown>)) {
    if (!DAY_RE.test(key) || !value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const total = finiteInt(entry.total, 1, 100);
    if (!total) continue;
    quiz[key] = { correct: finiteInt(entry.correct, 0, total) ?? 0, total };
    if (Object.keys(quiz).length >= MAX_QUIZ) break;
  }

  const briefDays = Array.from(
    new Set(
      (Array.isArray(raw.briefDays) ? raw.briefDays : []).filter(
        (key): key is string => typeof key === "string" && DAY_RE.test(key),
      ),
    ),
  )
    .sort()
    .slice(-MAX_BRIEF_DAYS);

  return {
    version: 2,
    days,
    joinedAt: text(raw.joinedAt, 40),
    visits: finiteInt(raw.visits, 0, 100_000) ?? 0,
    lastVisit: text(raw.lastVisit, 10),
    topics,
    quiz,
    briefDays,
  };
}

export function sanitizeSaves(input: unknown): SavedItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: SavedItem[] = [];

  for (const value of input) {
    if (!value || typeof value !== "object") continue;
    const raw = value as Record<string, unknown>;
    const id = text(raw.id, 120);
    const title = text(raw.title, 400);
    const url = text(raw.url, 2000);
    if (!id || !title || !url || seen.has(id)) continue;
    if (!/^https?:\/\//i.test(url)) continue;

    seen.add(id);
    out.push({
      id,
      title,
      kicker: text(raw.kicker, 400) ?? "",
      url,
      source: text(raw.source, 120) ?? "",
      publishedAt: text(raw.publishedAt, 40) ?? new Date(0).toISOString(),
      primaryTopic: text(raw.primaryTopic, 40),
      topics: Array.isArray(raw.topics)
        ? raw.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 12)
        : [],
      examScore: finiteInt(raw.examScore, 0, 100) ?? 0,
      priority: PRIORITIES.has(String(raw.priority)) ? (raw.priority as SavedItem["priority"]) : "low",
      primaryOptional: text(raw.primaryOptional, 40) as SavedItem["primaryOptional"],
      savedAt: text(raw.savedAt, 40) ?? undefined,
    });
    if (out.length >= MAX_SAVES) break;
  }

  return out;
}

function newestQuiz(a: QuizScore | undefined, b: QuizScore | undefined): QuizScore | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.total !== b.total) return a.total > b.total ? a : b;
  return a.correct >= b.correct ? a : b;
}

/** Union, not last-write-wins: two devices should grow the same streak. */
export function mergeProgress(a: ReaderProgress, b: ReaderProgress): ReaderProgress {
  const days: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    days[key] = Array.from(new Set([...(a.days[key] ?? []), ...(b.days[key] ?? [])])).slice(
      0,
      MAX_IDS_PER_DAY,
    );
  }

  const joined = [a.joinedAt, b.joinedAt].filter((value): value is string => Boolean(value)).sort();

  const quiz: Record<string, QuizScore> = {};
  for (const key of new Set([...Object.keys(a.quiz), ...Object.keys(b.quiz)])) {
    const winner = newestQuiz(a.quiz[key], b.quiz[key]);
    if (winner) quiz[key] = winner;
  }

  return sanitizeProgress({
    version: 2,
    days,
    joinedAt: joined[0] ?? null,
    visits: Math.max(a.visits, b.visits),
    lastVisit: [a.lastVisit, b.lastVisit].filter(Boolean).sort().at(-1) ?? null,
    topics: { ...a.topics, ...b.topics },
    quiz,
    briefDays: [...a.briefDays, ...b.briefDays],
  });
}

export function mergeSaves(a: SavedItem[], b: SavedItem[]): SavedItem[] {
  const byId = new Map<string, SavedItem>();
  for (const item of [...a, ...b]) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      continue;
    }
    const currentAt = new Date(current.savedAt ?? current.publishedAt).getTime();
    const nextAt = new Date(item.savedAt ?? item.publishedAt).getTime();
    if (nextAt > currentAt) byId.set(item.id, item);
  }

  return Array.from(byId.values())
    .sort(
      (x, y) =>
        new Date(y.savedAt ?? y.publishedAt).getTime() -
        new Date(x.savedAt ?? x.publishedAt).getTime(),
    )
    .slice(0, MAX_SAVES);
}

export async function loadReaderState(userId: string): Promise<ReaderState> {
  const db = serviceClient();
  if (!db) return { progress: EMPTY_PROGRESS, saves: [], updatedAt: null };

  const { data, error } = await db
    .from("tb_reader_state")
    .select("progress, saves, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`reader_state_read_failed: ${error.message}`);
  if (!data) return { progress: EMPTY_PROGRESS, saves: [], updatedAt: null };

  return {
    progress: sanitizeProgress(data.progress),
    saves: sanitizeSaves(data.saves),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

export async function saveReaderState(
  userId: string,
  incoming: { progress?: unknown; saves?: unknown },
): Promise<ReaderState> {
  const db = serviceClient();
  if (!db) throw new Error("reader_state_unavailable");

  const current = await loadReaderState(userId);
  const progress = incoming.progress
    ? mergeProgress(current.progress, sanitizeProgress(incoming.progress))
    : current.progress;
  const saves = incoming.saves
    ? mergeSaves(current.saves, sanitizeSaves(incoming.saves))
    : current.saves;
  const updatedAt = new Date().toISOString();

  const { error } = await db.from("tb_reader_state").upsert(
    { user_id: userId, progress, saves, updated_at: updatedAt },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`reader_state_write_failed: ${error.message}`);

  return { progress, saves, updatedAt };
}

/** Current IST streak from a stored progress blob. Used by study circles. */
export function streakOf(progress: ReaderProgress, todayKey: string): number {
  const active = (key: string) => (progress.days[key]?.length ?? 0) > 0;
  let cursor = todayKey;
  if (!active(cursor)) cursor = previousDay(cursor);
  let streak = 0;
  while (active(cursor) && streak < 400) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function todayCount(progress: ReaderProgress, todayKey: string): number {
  return progress.days[todayKey]?.length ?? 0;
}

function previousDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
