import { useSyncExternalStore } from "react";
import type { FeedItem, Priority, ReaderSave } from "@/api/types";
import { readJson, writeJson } from "./storage";

/**
 * The reading list.
 *
 * The wire still deletes a story after 24 hours, but a save is the reader's
 * own copy of the headline and link: it stays for 45 days, matching the web's
 * `SAVED_KEEP_DAYS`, and then quietly leaves. A story whose item page has
 * expired opens at the publisher instead.
 */

export const SAVED_KEEP_DAYS = 45;
const MAX_SAVES = 300;

export interface SavedItem {
  id: string;
  title: string;
  kicker: string;
  source: string;
  url: string;
  publishedAt: string;
  /** When the wire drops it. Older synced saves may not carry this. */
  expiresAt?: string;
  examScore: number;
  priority: Priority;
  topicLabel: string | null;
  primaryTopic: string | null;
  topics: string[];
  primaryOptional: string | null;
  savedAt: string;
}

const STORAGE_KEY = "tb.saved.v2";

let items: SavedItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(): void {
  writeJson(STORAGE_KEY, items);
}

function stamp(item: SavedItem): number {
  const value = new Date(item.savedAt || item.publishedAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function savedAtOf(item: SavedItem): number {
  return stamp(item);
}

export function isWireExpired(item: SavedItem, now = Date.now()): boolean {
  const expires = new Date(expiresAtOf(item)).getTime();
  return Number.isFinite(expires) ? expires <= now : true;
}

/** Synced saves from another device may not carry the wire's own expiry. */
export function expiresAtOf(item: SavedItem): string {
  if (item.expiresAt) return item.expiresAt;
  const published = new Date(item.publishedAt).getTime();
  return new Date((Number.isFinite(published) ? published : Date.now()) + 86_400_000).toISOString();
}

function normalise(raw: SavedItem): SavedItem | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  if (typeof raw.url !== "string" || !/^https?:\/\//i.test(raw.url)) return null;
  return {
    id: raw.id,
    title: raw.title,
    kicker: typeof raw.kicker === "string" ? raw.kicker : "",
    source: typeof raw.source === "string" ? raw.source : "",
    url: raw.url,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : new Date(0).toISOString(),
    expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : undefined,
    examScore: Number.isFinite(raw.examScore) ? raw.examScore : 0,
    priority: raw.priority === "high" || raw.priority === "medium" ? raw.priority : "low",
    topicLabel: typeof raw.topicLabel === "string" ? raw.topicLabel : null,
    primaryTopic: typeof raw.primaryTopic === "string" ? raw.primaryTopic : null,
    topics: Array.isArray(raw.topics) ? raw.topics.filter((id) => typeof id === "string") : [],
    primaryOptional: typeof raw.primaryOptional === "string" ? raw.primaryOptional : null,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
  };
}

function clean(list: SavedItem[], now = Date.now()): SavedItem[] {
  const cutoff = now - SAVED_KEEP_DAYS * 86_400_000;
  const seen = new Set<string>();
  const out: SavedItem[] = [];
  for (const raw of list) {
    const item = normalise(raw);
    if (!item || seen.has(item.id)) continue;
    if (stamp(item) < cutoff) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.sort((a, b) => stamp(b) - stamp(a)).slice(0, MAX_SAVES);
}

function commit(next: SavedItem[]): void {
  items = clean(next);
  persist();
  emit();
}

export async function hydrateSaved(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await readJson<SavedItem[]>(STORAGE_KEY, []);
  items = Array.isArray(stored) ? clean(stored) : [];
  emit();
}

export function toSaved(item: FeedItem): SavedItem {
  return {
    id: item.id,
    title: item.title,
    kicker: item.kicker,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    expiresAt: item.expiresAt,
    examScore: item.examScore,
    priority: item.priority,
    topicLabel: item.topic?.label ?? null,
    primaryTopic: item.primaryTopic,
    topics: item.topics,
    primaryOptional: item.primaryOptional,
    savedAt: new Date().toISOString(),
  };
}

export function toggleSaved(item: FeedItem): boolean {
  const exists = items.some((entry) => entry.id === item.id);
  commit(exists ? items.filter((entry) => entry.id !== item.id) : [toSaved(item), ...items]);
  return !exists;
}

export function removeSaved(id: string): void {
  commit(items.filter((entry) => entry.id !== id));
}

export function clearSaved(): void {
  commit([]);
}

export function allSaved(): SavedItem[] {
  return items;
}

export function replaceSaved(next: SavedItem[]): void {
  commit(next);
}

/** Union by id, keeping the newer save. Two devices converge; neither loses. */
export function mergeSavedLists(a: SavedItem[], b: SavedItem[]): SavedItem[] {
  const byId = new Map<string, SavedItem>();
  for (const raw of [...a, ...b]) {
    const item = normalise(raw);
    if (!item) continue;
    const current = byId.get(item.id);
    if (!current || stamp(item) > stamp(current)) byId.set(item.id, item);
  }
  return clean(Array.from(byId.values()));
}

export function toReaderSave(item: SavedItem): ReaderSave {
  return {
    id: item.id,
    title: item.title,
    kicker: item.kicker,
    url: item.url,
    source: item.source,
    publishedAt: item.publishedAt,
    primaryTopic: item.primaryTopic,
    topics: item.topics,
    examScore: item.examScore,
    priority: item.priority,
    primaryOptional: item.primaryOptional,
    savedAt: item.savedAt,
  };
}

export function fromReaderSave(save: ReaderSave): SavedItem | null {
  return normalise({
    ...save,
    topicLabel: null,
    expiresAt: undefined,
    savedAt: save.savedAt ?? new Date().toISOString(),
  } as SavedItem);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SavedItem[] {
  return items;
}

export function useSaved() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    items: list,
    count: list.length,
    isSaved: (id: string) => list.some((entry) => entry.id === id),
    toggle: toggleSaved,
    remove: removeSaved,
    clear: clearSaved,
  };
}

export { subscribe as subscribeSaved };
