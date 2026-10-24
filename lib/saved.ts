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
}

export const SAVED_KEY = "tb_saved_v1";
export const SAVED_EVENT = "tb-saved-change";

export function readSaved(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedItem[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - 24 * 3_600_000;
    return parsed.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  } catch {
    return [];
  }
}

export function writeSaved(items: SavedItem[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(SAVED_EVENT));
}
