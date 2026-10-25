import { OPTIONALS } from "./taxonomy";
import type { Desk, DeskStage, ExamTrack, OptionalId } from "./types";

/**
 * The reader's desk is the only personalisation we need: exam track, stage
 * and optional subject. It lives in a first-party cookie so the server can
 * tilt the ranking before the page is sent, with no account and no profile.
 */
export const DESK_COOKIE = "tb_desk";
export const DESK_SKIP_COOKIE = "tb_desk_skip";
export const DESK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const EXAMS: ExamTrack[] = ["upsc", "state"];
const STAGES: DeskStage[] = ["all", "prelims", "mains"];
const OPTIONAL_IDS = Object.keys(OPTIONALS) as OptionalId[];

export const DEFAULT_DESK: Desk = { exam: "upsc", stage: "all", optional: "all" };

export function normalizeDesk(input: Partial<Desk> | null | undefined): Desk {
  const exam = EXAMS.includes(input?.exam as ExamTrack) ? (input!.exam as ExamTrack) : "upsc";
  const stage = STAGES.includes(input?.stage as DeskStage) ? (input!.stage as DeskStage) : "all";
  const optional =
    input?.optional === "all" || OPTIONAL_IDS.includes(input?.optional as OptionalId)
      ? (input!.optional as OptionalId | "all")
      : "all";
  return { exam, stage, optional };
}

/** Returns null when the reader has not set a desk yet. */
export function parseDesk(raw: string | null | undefined): Desk | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Desk>;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeDesk(parsed);
  } catch {
    return null;
  }
}

export function encodeDesk(desk: Desk): string {
  return encodeURIComponent(JSON.stringify(normalizeDesk(desk)));
}

/**
 * The native app has no cookie jar, so its desk travels in query params. Any
 * one of exam/stage/optional counts as "a desk was set"; with none, ranking
 * stays neutral for a first-time reader.
 */
export function deskFromSearch(params: URLSearchParams): Desk | null {
  // The app sends one JSON parameter, `desk`, so exam/stage/optional stay free
  // for the feed's own filters.
  const packed = params.get("desk");
  if (packed) {
    try {
      const parsed = JSON.parse(packed) as Partial<Desk>;
      if (parsed && typeof parsed === "object") return normalizeDesk(parsed);
    } catch {
      // Fall through to the individual parameters below.
    }
  }

  if (!params.has("exam") && !params.has("stage") && !params.has("optional")) return null;
  return normalizeDesk({
    exam: (params.get("exam") ?? undefined) as ExamTrack | undefined,
    stage: (params.get("stage") ?? undefined) as DeskStage | undefined,
    optional: (params.get("optional") ?? undefined) as OptionalId | "all" | undefined,
  });
}

export function deskSummary(desk: Desk): string {
  const bits = [desk.exam === "state" ? "State PSC" : "UPSC CSE"];
  if (desk.stage === "prelims") bits.push("Prelims");
  if (desk.stage === "mains") bits.push("Mains");
  if (desk.optional !== "all") bits.push(OPTIONALS[desk.optional].short);
  return bits.join(" · ");
}

export function deskIsDefault(desk: Desk): boolean {
  return desk.exam === "upsc" && desk.stage === "all" && desk.optional === "all";
}
