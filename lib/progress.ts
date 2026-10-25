import type { BriefEntry } from "./types";

/**
 * Reading progress lives on the device, not on a server profile. That keeps
 * the product account-optional: a first-time reader can finish a brief and
 * start a streak without signing up. Everything is keyed by the IST day, so
 * the streak rolls over when the wire does.
 */
const KEY = "tb_progress_v2";
const BRIEF_KEY = "tb_brief_v2";
export const PROGRESS_EVENT = "tb-progress-change";
const IST = "Asia/Kolkata";
const KEEP_DAYS = 60;

export interface ProgressStats {
  current: number;
  longest: number;
  todayRead: number;
  totalRead: number;
  activeToday: boolean;
  visits: number;
  joinedAt: string | null;
}

interface Stored {
  version: 2;
  days: Record<string, string[]>;
  joinedAt: string | null;
  visits: number;
  lastVisit: string | null;
  /** itemId -> primary topic, so coverage can be computed without the wire. */
  topics: Record<string, string>;
  /** dayKey -> retrieval score for that day's brief. */
  quiz: Record<string, { correct: number; total: number }>;
}

const EMPTY: Stored = { version: 2, days: {}, joinedAt: null, visits: 0, lastVisit: null, topics: {}, quiz: {} };

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in Asia/Kolkata, the day the wire turns over. */
export function istDateKey(date: Date = new Date()): string {
  const parts = dayFormatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function humanDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    timeZone: IST,
  }).format(date);
}

function previousKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  date.setUTCDate(date.getUTCDate() - 1);
  return istDateKey(date);
}

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(): Stored {
  if (!hasWindow()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    const days: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.days ?? {})) {
      if (Array.isArray(value)) days[key] = value.filter((id): id is string => typeof id === "string");
    }
    const topics: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.topics ?? {})) {
      if (typeof value === "string") topics[key] = value;
    }
    const quiz: Record<string, { correct: number; total: number }> = {};
    for (const [key, value] of Object.entries(parsed.quiz ?? {})) {
      if (value && typeof value === "object") {
        const entry = value as { correct?: unknown; total?: unknown };
        const correct = Number(entry.correct);
        const total = Number(entry.total);
        if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) quiz[key] = { correct, total };
      }
    }
    return {
      version: 2,
      days,
      joinedAt: typeof parsed.joinedAt === "string" ? parsed.joinedAt : null,
      visits: Number(parsed.visits) || 0,
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : null,
      topics,
      quiz,
    };
  } catch {
    return { ...EMPTY };
  }
}

function prune(days: Record<string, string[]>, today: string): Record<string, string[]> {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  const keep = new Set(keys.slice(-KEEP_DAYS));
  keep.add(today);
  const next: Record<string, string[]> = {};
  for (const key of keys) if (keep.has(key)) next[key] = days[key];
  return next;
}

function write(state: Stored): void {
  if (!hasWindow()) return;
  const today = istDateKey();
  const days = prune(state.days, today);
  const liveIds = new Set(Object.values(days).flat());
  const topics: Record<string, string> = {};
  for (const [id, topic] of Object.entries(state.topics)) if (liveIds.has(id)) topics[id] = topic;
  const dayKeys = new Set(Object.keys(days));
  const quiz: Record<string, { correct: number; total: number }> = {};
  for (const [key, score] of Object.entries(state.quiz)) if (dayKeys.has(key)) quiz[key] = score;
  const next: Stored = { ...state, days, topics, quiz };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: progress is a nicety, never a blocker.
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function readProgress(): Stored {
  return read();
}

export function todayReadIds(): Set<string> {
  const today = istDateKey();
  return new Set(read().days[today] ?? []);
}

export function dayReadCounts(): Record<string, number> {
  const days = read().days;
  const counts: Record<string, number> = {};
  for (const [key, ids] of Object.entries(days)) counts[key] = ids.length;
  return counts;
}

export function isReadToday(itemId: string): boolean {
  return todayReadIds().has(itemId);
}

/** Returns true when this was a new read for today. */
export function markRead(itemId: string, topic?: string | null): boolean {
  const state = read();
  const today = istDateKey();
  const current = state.days[today] ?? [];
  if (topic) state.topics[itemId] = topic;
  if (current.includes(itemId)) return false;
  state.days[today] = [...current, itemId];
  if (!state.joinedAt) state.joinedAt = new Date().toISOString();
  write(state);
  // Signed-in readers also get a durable streak, which powers the evening
  // "streak at risk" push. Anonymous readers get a no-op response.
  if (hasWindow()) {
    void fetch("/api/streak", { method: "POST" }).catch(() => undefined);
  }
  return true;
}

export function unmarkRead(itemId: string): void {
  const state = read();
  const today = istDateKey();
  const current = state.days[today] ?? [];
  if (!current.includes(itemId)) return;
  state.days[today] = current.filter((id) => id !== itemId);
  write(state);
}

export function toggleRead(itemId: string, topic?: string | null): boolean {
  if (isReadToday(itemId)) {
    unmarkRead(itemId);
    return false;
  }
  markRead(itemId, topic);
  return true;
}

/** Counts one visit per IST day, so "day 1" means a day, not a page view. */
export function noteVisit(): void {
  const state = read();
  const today = istDateKey();
  if (state.lastVisit === today) return;
  state.lastVisit = today;
  state.visits += 1;
  if (!state.joinedAt) state.joinedAt = new Date().toISOString();
  write(state);
}

export function statsFor(state: Stored = read(), now: Date = new Date()): ProgressStats {
  const today = istDateKey(now);
  const days = state.days;
  const activeToday = (days[today]?.length ?? 0) > 0;

  let current = 0;
  let cursor = activeToday ? today : previousKey(today);
  while ((days[cursor]?.length ?? 0) > 0) {
    current += 1;
    cursor = previousKey(cursor);
    if (current > KEEP_DAYS) break;
  }

  let longest = 0;
  let run = 0;
  let prior: string | null = null;
  for (const key of Object.keys(days).sort()) {
    if ((days[key]?.length ?? 0) === 0) continue;
    run = prior && previousKey(key) === prior ? run + 1 : 1;
    prior = key;
    if (run > longest) longest = run;
  }

  return {
    current,
    longest: Math.max(longest, current),
    todayRead: days[today]?.length ?? 0,
    totalRead: Object.values(days).reduce((sum, ids) => sum + ids.length, 0),
    activeToday,
    visits: state.visits,
    joinedAt: state.joinedAt,
  };
}

/* ------------------------------- coverage -------------------------------- */

export interface TopicReadHistory {
  lastRead: string | null;
  reads: number;
  days: number;
}

/**
 * Reads per topic over the last `windowDays`, from the device record. The
 * topic map is written at read time, so this works without the wire and
 * without an account.
 */
export function topicReadHistory(windowDays = 14, now: Date = new Date()): Record<string, TopicReadHistory> {
  const state = read();
  const out: Record<string, TopicReadHistory> = {};
  const cutoff = now.getTime() - windowDays * 86_400_000;

  for (const [day, ids] of Object.entries(state.days)) {
    const [year, month, date] = day.split("-").map(Number);
    const stamp = Date.UTC(year, (month ?? 1) - 1, date ?? 1, 12);
    if (stamp < cutoff) continue;
    const seenToday = new Set<string>();
    for (const id of ids) {
      const topic = state.topics[id];
      if (!topic) continue;
      const entry = out[topic] ?? { lastRead: null, reads: 0, days: 0 };
      entry.reads += 1;
      if (!entry.lastRead || day > entry.lastRead) entry.lastRead = day;
      if (!seenToday.has(topic)) {
        seenToday.add(topic);
        entry.days += 1;
      }
      out[topic] = entry;
    }
  }

  return out;
}

/* --------------------------------- quiz ---------------------------------- */

/** Store today's retrieval score. Replaying the quiz overwrites, it does not stack. */
export function recordQuiz(correct: number, total: number): void {
  if (total <= 0) return;
  const state = read();
  state.quiz[istDateKey()] = { correct: Math.max(0, Math.min(total, correct)), total };
  write(state);
}

export function quizScore(dayKey: string = istDateKey()): { correct: number; total: number } | null {
  return read().quiz[dayKey] ?? null;
}

/* ------------------------------- daily brief ------------------------------ */

function briefDb(): Record<string, BriefEntry[]> {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(BRIEF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BriefEntry[]>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * The brief is frozen on first sight each day. Without this, a story arriving
 * at noon would silently push the counter from 5/5 back to 4/5 and take away
 * the finish line.
 */
export function readBrief(dateKey: string): BriefEntry[] | null {
  const entry = briefDb()[dateKey];
  return Array.isArray(entry) && entry.length ? entry : null;
}

export function writeBrief(dateKey: string, entries: BriefEntry[]): void {
  if (!hasWindow() || !entries.length) return;
  const db = briefDb();
  db[dateKey] = entries;
  const keys = Object.keys(db).sort().slice(-3);
  const next: Record<string, BriefEntry[]> = {};
  for (const key of keys) next[key] = db[key];
  try {
    window.localStorage.setItem(BRIEF_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function subscribeProgress(listener: () => void): () => void {
  if (!hasWindow()) return () => {};
  const handler = () => listener();
  window.addEventListener(PROGRESS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
