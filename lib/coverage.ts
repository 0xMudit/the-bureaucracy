import { istDateKey, topicReadHistory } from "./progress";
import { TOPIC_ORDER, TOPICS } from "./taxonomy";
import type { TopicId } from "./types";

/**
 * The long-term hook: what the reader has not touched. A gap is more useful
 * than a count, because it names the paper they are drifting away from.
 */
export interface CoverageRow {
  id: TopicId;
  label: string;
  reads: number;
  lastRead: string | null;
  /** Whole days since the last read in this topic; null when never read. */
  gapDays: number | null;
  status: "fresh" | "stale" | "cold" | "untouched";
}

const WINDOW_DAYS = 14;

function gapBetween(day: string, today: string): number {
  const [y1, m1, d1] = day.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const a = Date.UTC(y1, (m1 ?? 1) - 1, d1 ?? 1);
  const b = Date.UTC(y2, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function statusFor(gapDays: number | null): CoverageRow["status"] {
  if (gapDays === null) return "untouched";
  if (gapDays <= 2) return "fresh";
  if (gapDays <= 6) return "stale";
  return "cold";
}

export function coverageRows(now: Date = new Date()): CoverageRow[] {
  const history = topicReadHistory(WINDOW_DAYS, now);
  const today = istDateKey(now);

  const rows: CoverageRow[] = TOPIC_ORDER.map((id) => {
    const entry = history[id];
    const gapDays = entry?.lastRead ? gapBetween(entry.lastRead, today) : null;
    return {
      id,
      label: TOPICS[id].label,
      reads: entry?.reads ?? 0,
      lastRead: entry?.lastRead ?? null,
      gapDays,
      status: statusFor(gapDays),
    };
  });

  return rows.sort((a, b) => {
    // Untouched first, then the widest gap.
    const gapA = a.gapDays ?? Number.POSITIVE_INFINITY;
    const gapB = b.gapDays ?? Number.POSITIVE_INFINITY;
    if (gapA !== gapB) return gapB - gapA;
    return a.label.localeCompare(b.label);
  });
}

export interface CoverageSummary {
  touched: number;
  total: number;
  /** The widest gap worth naming in one line, or null when nothing is read yet. */
  worst: CoverageRow | null;
}

export function coverageSummary(now: Date = new Date()): CoverageSummary {
  const rows = coverageRows(now);
  const touched = rows.filter((row) => row.reads > 0).length;
  const worst = rows.find((row) => row.status === "untouched" || row.status === "cold" || row.status === "stale") ?? null;
  return { touched, total: rows.length, worst };
}
