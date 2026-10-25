import { useSyncExternalStore } from "react";
import { allSaved, savedAtOf, type SavedItem } from "./saved";
import { readJson, writeJson } from "./storage";

/**
 * Spaced revision for the reader's own saves: day 1, 3, 7 and 30 after saving.
 * A missed day does not reset anything; the item simply stays due. This is the
 * difference between a bookmark folder and a study habit.
 */
export const REVISION_DAYS = [1, 3, 7, 30] as const;

const KEY = "tb.revision.v1";

type RevisionLog = Record<string, { stage: number; at: string }>;

let log: RevisionLog = {};
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export async function hydrateRevision(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await readJson<RevisionLog>(KEY, {});
  log = stored && typeof stored === "object" ? stored : {};
  emit();
}

export interface DueRevision {
  item: SavedItem;
  stage: number;
  /** Whole days since the save, for copy such as "saved 4 days ago". */
  ageDays: number;
}

function stageFor(item: SavedItem, now: number): DueRevision | null {
  const saved = savedAtOf(item);
  if (!Number.isFinite(saved)) return null;
  const ageDays = Math.floor((now - saved) / 86_400_000);
  const done = log[item.id]?.stage ?? 0;

  for (let index = done; index < REVISION_DAYS.length; index += 1) {
    const day = REVISION_DAYS[index];
    if (ageDays < day) break;
    return { item, stage: index + 1, ageDays };
  }
  return null;
}

export function dueRevisions(now = Date.now()): DueRevision[] {
  return allSaved()
    .map((item) => stageFor(item, now))
    .filter((entry): entry is DueRevision => entry !== null)
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 5);
}

export function markRevised(itemId: string, stage: number): void {
  // If several stages are already overdue (a reader was away for a week), one
  // tap should clear all of them rather than asking for the same story four
  // times.
  const item = allSaved().find((entry) => entry.id === itemId);
  let next = stage;
  if (item) {
    const ageDays = Math.floor((Date.now() - savedAtOf(item)) / 86_400_000);
    while (next < REVISION_DAYS.length && ageDays >= REVISION_DAYS[next]) next += 1;
  }

  log = { ...log, [itemId]: { stage: next, at: new Date().toISOString() } };
  // Drop rows for saves that have left the 45-day list; the log is a helper,
  // not an archive.
  const live = new Set(allSaved().map((entry) => entry.id));
  for (const id of Object.keys(log)) if (!live.has(id)) delete log[id];
  writeJson(KEY, log);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRevision() {
  useSyncExternalStore(subscribe, () => log, () => log);
  return {
    due: dueRevisions(),
    markRevised,
    stages: REVISION_DAYS,
  };
}
