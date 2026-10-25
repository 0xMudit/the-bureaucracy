import { useSyncExternalStore } from "react";
import type { Desk, DeskStage, ExamTrack } from "@/api/types";
import { readJson, writeJson } from "./storage";

/**
 * The reader's desk: the exam, the stage and the optional that tilt ranking.
 * It is a preference, not a filter — the wire still shows everything, it just
 * orders what matters to this reader first.
 *
 * Onboarding writes it once; the account screen can change it later. The value
 * travels to the API as `?desk=<json>` because a native app has no cookie jar.
 */
export const OPTIONAL_CHOICES: { id: string; label: string; short: string }[] = [
  { id: "psir", label: "Political Science & IR", short: "PSIR" },
  { id: "geography", label: "Geography", short: "GEO" },
  { id: "sociology", label: "Sociology", short: "SOC" },
  { id: "pubadmin", label: "Public Administration", short: "PA" },
  { id: "history", label: "History", short: "HIST" },
  { id: "anthropology", label: "Anthropology", short: "ANTH" },
];

export const MINUTE_CHOICES = [5, 8, 15, 30] as const;

export interface DeskPrefs extends Desk {
  /** The reader's intended daily study window, used in copy and the desk card. */
  minutes: number;
  onboarded: boolean;
}

const KEY = "tb.desk.v1";
const OPTIONAL_IDS = new Set(OPTIONAL_CHOICES.map((entry) => entry.id));

export const DEFAULT_DESK: DeskPrefs = {
  exam: "upsc",
  stage: "all",
  optional: "all",
  minutes: 8,
  onboarded: false,
};

let prefs: DeskPrefs = DEFAULT_DESK;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function normalise(input: Partial<DeskPrefs> | null | undefined): DeskPrefs {
  const exam: ExamTrack = input?.exam === "state" ? "state" : "upsc";
  const stage: DeskStage =
    input?.stage === "prelims" || input?.stage === "mains" ? input.stage : "all";
  const optional =
    typeof input?.optional === "string" &&
    (input.optional === "all" || OPTIONAL_IDS.has(input.optional))
      ? input.optional
      : "all";
  const minutes =
    typeof input?.minutes === "number" && Number.isFinite(input.minutes)
      ? Math.min(60, Math.max(5, Math.round(input.minutes)))
      : 8;
  return { exam, stage, optional, minutes, onboarded: Boolean(input?.onboarded) };
}

export async function hydrateDesk(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const stored = await readJson<Partial<DeskPrefs>>(KEY, {});
  prefs = normalise(stored);
  emit();
}

function commit(next: DeskPrefs): void {
  prefs = normalise(next);
  writeJson(KEY, prefs);
  emit();
}

export function getDesk(): DeskPrefs {
  return prefs;
}

export function setDesk(patch: Partial<DeskPrefs>): void {
  commit({ ...prefs, ...patch });
}

export function finishOnboarding(patch: Partial<DeskPrefs> = {}): void {
  commit({ ...prefs, ...patch, onboarded: true });
}

export function resetDesk(): void {
  commit({ ...DEFAULT_DESK });
}

/** Stable React Query key: ranking changes when any of these change. */
export function deskSignature(desk: DeskPrefs = prefs): string {
  return `${desk.exam}|${desk.stage}|${desk.optional}`;
}

/** The query value for `/api/mobile/feed` and `/api/mobile/brief`. */
export function deskParam(desk: DeskPrefs = prefs): string {
  return JSON.stringify({ exam: desk.exam, stage: desk.stage, optional: desk.optional });
}

export function deskLabel(desk: DeskPrefs = prefs): string {
  const exam = desk.exam === "state" ? "State PSC" : "UPSC CSE";
  const stage =
    desk.stage === "prelims" ? "Prelims" : desk.stage === "mains" ? "Mains" : "Prelims + Mains";
  const optional =
    desk.optional === "all"
      ? "all optionals"
      : (OPTIONAL_CHOICES.find((entry) => entry.id === desk.optional)?.short ?? desk.optional);
  return `${exam} · ${stage} · ${optional}`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDesk() {
  const snapshot = useSyncExternalStore(subscribe, getDesk, getDesk);
  return {
    desk: snapshot,
    setDesk,
    finishOnboarding,
    reset: resetDesk,
    label: deskLabel(snapshot),
    signature: deskSignature(snapshot),
    param: deskParam(snapshot),
  };
}
