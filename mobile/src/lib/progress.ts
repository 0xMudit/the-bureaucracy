import { useSyncExternalStore } from "react";
import type { BriefEntry, ReaderProgressPayload } from "@/api/types";
import { readJson, writeJson } from "./storage";

/**
 * Reading progress, ported from the web's `lib/progress.ts`.
 *
 * The semantics are identical — IST days, 60 days of history, a streak that
 * forgives today until the reader opens the app — but the storage is
 * AsyncStorage. A synchronous in-memory snapshot is what React renders from;
 * the async write is an implementation detail.
 *
 * `briefDays` is the only addition: the app explicitly records a completed
 * brief so "prompt for push after the third brief" is a fact, not a guess from
 * the number of read ids.
 */

const KEY = "tb.progress.v1";
const BRIEF_KEY = "tb.brief.v1";
const KEEP_DAYS = 60;
const MAX_BRIEF_DAYS = 60;
export const PROGRESS_KEEP_DAYS = KEEP_DAYS;

export type ProgressState = ReaderProgressPayload;

const EMPTY: ProgressState = {
  version: 2,
  days: {},
  joinedAt: null,
  visits: 0,
  lastVisit: null,
  topics: {},
  quiz: {},
  briefDays: [],
};

let state: ProgressState = EMPTY;
let briefs: Record<string, BriefEntry[]> = {};
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function normalise(input: Partial<ProgressState> | null | undefined): ProgressState {
  const days: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(input?.days ?? {})) {
    if (Array.isArray(value)) {
      days[key] = value.filter((id): id is string => typeof id === "string");
    }
  }

  const topics: Record<string, string> = {};
  for (const [id, value] of Object.entries(input?.topics ?? {})) {
    if (typeof value === "string") topics[id] = value;
  }

  const quiz: Record<string, { correct: number; total: number }> = {};
  for (const [key, value] of Object.entries(input?.quiz ?? {})) {
    if (!value || typeof value !== "object") continue;
    const correct = Number((value as { correct?: unknown }).correct);
    const total = Number((value as { total?: unknown }).total);
    if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
      quiz[key] = { correct, total };
    }
  }

  const briefDays = Array.from(
    new Set(
      (Array.isArray(input?.briefDays) ? input.briefDays : []).filter(
        (day): day is string => typeof day === "string",
      ),
    ),
  )
    .sort()
    .slice(-MAX_BRIEF_DAYS);

  return {
    version: 2,
    days,
    joinedAt: typeof input?.joinedAt === "string" ? input.joinedAt : null,
    visits: Number(input?.visits) || 0,
    lastVisit: typeof input?.lastVisit === "string" ? input.lastVisit : null,
    topics,
    quiz,
    briefDays,
  };
}

function pruneDays(days: Record<string, string[]>, today: string): Record<string, string[]> {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  const keep = new Set(keys.slice(-KEEP_DAYS));
  keep.add(today);
  const next: Record<string, string[]> = {};
  for (const key of keys) if (keep.has(key)) next[key] = days[key];
  return next;
}

function compact(next: ProgressState): ProgressState {
  const today = istDateKey();
  const days = pruneDays(next.days, today);
  const live = new Set(Object.values(days).flat());
  const topics: Record<string, string> = {};
  for (const [id, topic] of Object.entries(next.topics)) if (live.has(id)) topics[id] = topic;
  const dayKeys = new Set(Object.keys(days));
  const quiz: Record<string, { correct: number; total: number }> = {};
  for (const [key, score] of Object.entries(next.quiz)) if (dayKeys.has(key)) quiz[key] = score;
  return { ...next, days, topics, quiz };
}

function commit(next: ProgressState): void {
  state = compact(normalise(next));
  writeJson(KEY, state);
  emit();
}

export async function hydrateProgress(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const [progress, cache] = await Promise.all([
    readJson<Partial<ProgressState>>(KEY, {}),
    readJson<Record<string, BriefEntry[]>>(BRIEF_KEY, {}),
  ]);
  state = compact(normalise(progress));
  briefs = cache && typeof cache === "object" ? cache : {};
  emit();
}

/* --------------------------------- dates ---------------------------------- */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD in Asia/Kolkata. Fixed offset: India has no daylight saving. */
export function istDateKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function humanDate(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  return `${WEEKDAYS[date.getUTCDay()]}, ${String(day).padStart(2, "0")} ${MONTHS[(month ?? 1) - 1]}`;
}

function previousKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/* --------------------------------- reading -------------------------------- */

export function getProgress(): ProgressState {
  return state;
}

export function todayReadIds(): Set<string> {
  return new Set(state.days[istDateKey()] ?? []);
}

export function isReadToday(itemId: string): boolean {
  return (state.days[istDateKey()] ?? []).includes(itemId);
}

export function markRead(itemId: string, topic?: string | null): boolean {
  const today = istDateKey();
  const current = state.days[today] ?? [];
  const next: ProgressState = {
    ...state,
    days: { ...state.days, [today]: current.includes(itemId) ? current : [...current, itemId] },
    topics: topic ? { ...state.topics, [itemId]: topic } : state.topics,
    joinedAt: state.joinedAt ?? new Date().toISOString(),
  };
  const changed = !current.includes(itemId);
  if (changed) commit(next);
  return changed;
}

export function unmarkRead(itemId: string): void {
  const today = istDateKey();
  const current = state.days[today] ?? [];
  if (!current.includes(itemId)) return;
  commit({
    ...state,
    days: { ...state.days, [today]: current.filter((id) => id !== itemId) },
  });
}

export function toggleRead(itemId: string, topic?: string | null): boolean {
  if (isReadToday(itemId)) {
    unmarkRead(itemId);
    return false;
  }
  markRead(itemId, topic);
  return true;
}

/** One visit per IST day, so "day 1" means a day, not a tab switch. */
export function noteVisit(): void {
  const today = istDateKey();
  if (state.lastVisit === today) return;
  commit({
    ...state,
    lastVisit: today,
    visits: state.visits + 1,
    joinedAt: state.joinedAt ?? new Date().toISOString(),
  });
}

/* ---------------------------------- stats --------------------------------- */

export interface ProgressStats {
  current: number;
  longest: number;
  todayRead: number;
  totalRead: number;
  activeToday: boolean;
  visits: number;
  joinedAt: string | null;
  briefsCompleted: number;
}

export function statsFor(source: ProgressState = state, now: Date = new Date()): ProgressStats {
  const today = istDateKey(now);
  const days = source.days;
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
    visits: source.visits,
    joinedAt: source.joinedAt,
    briefsCompleted: source.briefDays.length,
  };
}

/* ---------------------------------- quiz ---------------------------------- */

export function recordQuiz(correct: number, total: number): void {
  if (total <= 0) return;
  const today = istDateKey();
  commit({
    ...state,
    quiz: {
      ...state.quiz,
      [today]: { correct: Math.max(0, Math.min(total, Math.round(correct))), total },
    },
  });
}

export function quizScore(dayKey: string = istDateKey()): { correct: number; total: number } | null {
  return state.quiz[dayKey] ?? null;
}

/* ------------------------------- daily brief ------------------------------ */

export function readBrief(dateKey: string): BriefEntry[] | null {
  const entries = briefs[dateKey];
  return Array.isArray(entries) && entries.length ? entries : null;
}

export function writeBrief(dateKey: string, entries: BriefEntry[]): void {
  if (!entries.length) return;
  briefs = { ...briefs, [dateKey]: entries };
  const keys = Object.keys(briefs).sort().slice(-3);
  const next: Record<string, BriefEntry[]> = {};
  for (const key of keys) next[key] = briefs[key];
  briefs = next;
  writeJson(BRIEF_KEY, next);
}

export function hasCompletedBrief(dayKey: string = istDateKey()): boolean {
  return state.briefDays.includes(dayKey);
}

/** Idempotent: a second render of the finished screen must not double count. */
export function completeBrief(dayKey: string = istDateKey()): boolean {
  if (state.briefDays.includes(dayKey)) return false;
  commit({ ...state, briefDays: [...state.briefDays, dayKey].sort().slice(-MAX_BRIEF_DAYS) });
  return true;
}

/* -------------------------------- coverage -------------------------------- */

export interface TopicReadHistory {
  lastRead: string | null;
  reads: number;
  days: number;
}

export function topicReadHistory(
  windowDays = 14,
  now: Date = new Date(),
): Record<string, TopicReadHistory> {
  const out: Record<string, TopicReadHistory> = {};
  const cutoff = now.getTime() - windowDays * 86_400_000;

  for (const [day, ids] of Object.entries(state.days)) {
    const [year, month, date] = day.split("-").map(Number);
    const stamp = Date.UTC(year, (month ?? 1) - 1, date ?? 1, 12);
    if (stamp < cutoff) continue;
    const seen = new Set<string>();
    for (const id of ids) {
      const topic = state.topics[id];
      if (!topic) continue;
      const entry = out[topic] ?? { lastRead: null, reads: 0, days: 0 };
      entry.reads += 1;
      if (!entry.lastRead || day > entry.lastRead) entry.lastRead = day;
      if (!seen.has(topic)) {
        seen.add(topic);
        entry.days += 1;
      }
      out[topic] = entry;
    }
  }

  return out;
}

/* --------------------------------- syncing -------------------------------- */

export function serializeProgress(): ProgressState {
  return state;
}

export function replaceProgress(next: ProgressState): void {
  commit(next);
}

export function mergeProgressStates(a: ProgressState, b: ProgressState): ProgressState {
  const days: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    days[key] = Array.from(new Set([...(a.days[key] ?? []), ...(b.days[key] ?? [])]));
  }

  const quiz: Record<string, { correct: number; total: number }> = {};
  for (const key of new Set([...Object.keys(a.quiz), ...Object.keys(b.quiz)])) {
    const left = a.quiz[key];
    const right = b.quiz[key];
    if (!left) quiz[key] = right;
    else if (!right) quiz[key] = left;
    else if (left.total !== right.total) quiz[key] = left.total > right.total ? left : right;
    else quiz[key] = left.correct >= right.correct ? left : right;
  }

  const joined = [a.joinedAt, b.joinedAt].filter((value): value is string => Boolean(value)).sort();
  const lastVisit = [a.lastVisit, b.lastVisit].filter((value): value is string => Boolean(value)).sort();

  return normalise({
    version: 2,
    days,
    joinedAt: joined[0] ?? null,
    visits: Math.max(a.visits, b.visits),
    lastVisit: lastVisit.at(-1) ?? null,
    topics: { ...a.topics, ...b.topics },
    quiz,
    briefDays: [...a.briefDays, ...b.briefDays],
  });
}

/* ------------------------------- react glue ------------------------------- */

function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProgress() {
  const snapshot = useSyncExternalStore(subscribeProgress, getProgress, getProgress);
  const stats = statsFor(snapshot);
  return {
    ...stats,
    state: snapshot,
    readIds: new Set(snapshot.days[istDateKey()] ?? []),
    briefDays: snapshot.briefDays,
    quizToday: snapshot.quiz[istDateKey()] ?? null,
    isReadToday,
    markRead,
    unmarkRead,
    toggleRead,
    hasCompletedBrief,
    completeBrief,
    recordQuiz,
  };
}

export { subscribeProgress };
