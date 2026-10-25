import { serviceClient } from "./store";
import type { BriefEntry } from "./types";

/**
 * The wire deletes a story after 24 hours, so a brief that only exists in
 * memory disappears at midnight. Freezing it on first sight gives the public
 * `/brief/[date]` pages something permanent to index, and gives the digest the
 * same five stories every subscriber saw in the app.
 */
export type FrozenBriefEntry = BriefEntry & { url?: string };

export interface FrozenBrief {
  day: string;
  entries: FrozenBriefEntry[];
  createdAt: string;
}

const MAX_ENTRIES = 10;

function clean(entries: FrozenBriefEntry[]): FrozenBriefEntry[] {
  return entries.slice(0, MAX_ENTRIES);
}

/**
 * Insert-only: the first five of the day win. A noon ingest must never move the
 * finish line a reader is three stories into.
 */
export async function freezeBrief(day: string, entries: FrozenBriefEntry[]): Promise<boolean> {
  const db = serviceClient();
  if (!db || !entries.length) return false;

  const { error } = await db.from("tb_briefs").upsert(
    {
      day,
      entries: clean(entries),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day", ignoreDuplicates: true },
  );

  if (error) throw new Error(`brief_freeze_failed: ${error.message}`);
  return true;
}

export async function frozenBrief(day: string): Promise<FrozenBrief | null> {
  const db = serviceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("tb_briefs")
    .select("day, entries, created_at")
    .eq("day", day)
    .maybeSingle();

  if (error) throw new Error(`brief_read_failed: ${error.message}`);
  if (!data || !Array.isArray(data.entries) || !data.entries.length) return null;

  return {
    day: String(data.day),
    entries: data.entries as FrozenBriefEntry[],
    createdAt: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
  };
}

/** Newest first. Used by the public index and the sitemap. */
export async function recentBriefDays(limit = 30): Promise<string[]> {
  const db = serviceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("tb_briefs")
    .select("day")
    .order("day", { ascending: false })
    .limit(Math.min(90, Math.max(1, limit)));

  if (error) return [];
  return (data ?? [])
    .map((row) => (typeof row.day === "string" ? row.day : String(row.day)))
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
}

export async function latestFrozenBrief(): Promise<FrozenBrief | null> {
  const [day] = await recentBriefDays(1);
  return day ? frozenBrief(day) : null;
}
