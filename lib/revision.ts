import { readSaved, savedAtOf, type SavedItem } from "./saved";

/**
 * Spaced revision for the reader's own saves: day 1, 3, 7 and 30 after saving.
 * The schedule is local, forgiving and silent. A missed day does not reset
 * anything; the item simply stays due.
 */
export const REVISION_DAYS = [1, 3, 7, 30] as const;

const KEY = "tb_revision_v1";

type RevisionLog = Record<string, { stage: number; at: string }>;

function readLog(): RevisionLog {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RevisionLog;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLog(log: RevisionLog): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // ignore
  }
}

export interface DueRevision {
  item: SavedItem;
  stage: number;
  /** Whole days since the save, for copy such as "saved 4 days ago". */
  ageDays: number;
}

/** The next stage not yet marked revised, if it is due. */
function stageFor(item: SavedItem, log: RevisionLog, now: number): DueRevision | null {
  const saved = savedAtOf(item);
  if (!Number.isFinite(saved)) return null;
  const ageDays = Math.floor((now - saved) / 86_400_000);
  const done = log[item.id]?.stage ?? 0;

  for (let i = done; i < REVISION_DAYS.length; i += 1) {
    const day = REVISION_DAYS[i];
    if (ageDays < day) break;
    return { item, stage: i + 1, ageDays };
  }
  return null;
}

export function dueRevisions(now = Date.now()): DueRevision[] {
  const log = readLog();
  return readSaved()
    .map((item) => stageFor(item, log, now))
    .filter((entry): entry is DueRevision => entry !== null)
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 5);
}

export function markRevised(itemId: string, stage: number): void {
  const log = readLog();
  log[itemId] = { stage, at: new Date().toISOString() };
  writeLog(log);
}
