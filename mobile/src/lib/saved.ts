import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { FeedItem, Priority } from "@/api/types";

/**
 * The reading list: device-local, never synced, and it expires with the wire.
 * A saved story that has left the 24-hour window is silently dropped, exactly
 * like the web's `/saved` page.
 */

export interface SavedItem {
  id: string;
  title: string;
  kicker: string;
  source: string;
  url: string;
  publishedAt: string;
  expiresAt: string;
  examScore: number;
  priority: Priority;
  topicLabel: string | null;
  savedAt: string;
}

const STORAGE_KEY = "tb.saved.v1";

let items: SavedItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
    // The list is a convenience; a failed write must not break the screen.
  });
}

function isExpired(item: SavedItem, now = Date.now()): boolean {
  return new Date(item.expiresAt).getTime() <= now;
}

function prune(list: SavedItem[]): SavedItem[] {
  const now = Date.now();
  return list.filter((item) => !isExpired(item, now));
}

/** Read the list once at startup. Safe to call more than once. */
export async function hydrateSaved(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SavedItem[];
    if (!Array.isArray(parsed)) return;
    const clean = prune(parsed.filter((item) => item && typeof item.id === "string"));
    if (clean.length !== parsed.length) persist();
    items = clean;
    emit();
  } catch {
    items = [];
  }
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
    savedAt: new Date().toISOString(),
  };
}

export function toggleSaved(item: FeedItem): boolean {
  const exists = items.some((entry) => entry.id === item.id);
  items = exists
    ? items.filter((entry) => entry.id !== item.id)
    : [{ ...toSaved(item) }, ...prune(items)];
  emit();
  persist();
  return !exists;
}

export function removeSaved(id: string): void {
  items = items.filter((entry) => entry.id !== id);
  emit();
  persist();
}

export function clearSaved(): void {
  items = [];
  emit();
  persist();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
