import type { OptionalId } from "./types";

export interface SavedItem {
  id: string;
  title: string;
  kicker: string;
  url: string;
  source: string;
  publishedAt: string;
  primaryTopic: string | null;
  topics: string[];
  examScore: number;
  priority: "high" | "medium" | "low";
  primaryOptional: OptionalId | null;
  /** When the reader saved it. Older saves default to their publish time. */
  savedAt?: string;
}

export const SAVED_KEY = "tb_saved_v1";
export const SAVED_EVENT = "tb-saved-change";

/** How long the reader's own set is kept on this device. */
export const SAVED_KEEP_DAYS = 45;

/**
 * The saved list is the reader's own set, not a public archive: it never leaves
 * the device. Stories still expire from the wire after 24 hours, so an older
 * save links to the publisher rather than to a rebuilt article page.
 */
export function readSaved(keepDays = SAVED_KEEP_DAYS): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedItem[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - keepDays * 24 * 3_600_000;
    return parsed.filter((item) => new Date(item.savedAt ?? item.publishedAt).getTime() >= cutoff);
  } catch {
    return [];
  }
}

/** Saves that still have a live page on the wire. */
export function readLiveSaved(): SavedItem[] {
  const cutoff = Date.now() - 24 * 3_600_000;
  return readSaved().filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
}

export function writeSaved(items: SavedItem[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function savedAtOf(item: SavedItem): number {
  return new Date(item.savedAt ?? item.publishedAt).getTime();
}

export function isExpired(item: SavedItem): boolean {
  return Date.now() - new Date(item.publishedAt).getTime() > 24 * 3_600_000;
}
