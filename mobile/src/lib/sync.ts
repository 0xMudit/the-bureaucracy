import {
  getAuthToken,
  getReaderState,
  putReaderState,
} from "@/api/client";
import type { ReaderProgressPayload, ReaderSave, ReaderState } from "@/api/types";
import {
  allSaved,
  fromReaderSave,
  mergeSavedLists,
  replaceSaved,
  subscribeSaved,
  toReaderSave,
} from "./saved";
import {
  mergeProgressStates,
  replaceProgress,
  serializeProgress,
  subscribeProgress,
} from "./progress";

/**
 * Account sync is a union, never an overwrite.
 *
 * Signing in on a second device should extend the first device's streak, not
 * replace it. Both the client and `/api/mobile/state` merge the same way, so a
 * lost request can safely be retried and two devices converge.
 */

interface Snapshot {
  progress: ReaderProgressPayload;
  saves: ReaderSave[];
}

function snapshot(): Snapshot {
  return { progress: serializeProgress(), saves: allSaved().map(toReaderSave) };
}

function fingerprint(value: Snapshot): string {
  return JSON.stringify(value);
}

let lastSynced = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function apply(state: ReaderState): void {
  replaceProgress(mergeProgressStates(serializeProgress(), state.progress));
  const remote = state.saves
    .map(fromReaderSave)
    .filter((item): item is NonNullable<typeof item> => item !== null);
  replaceSaved(mergeSavedLists(allSaved(), remote));
}

async function push(): Promise<void> {
  if (running || !getAuthToken()) return;

  const payload = snapshot();
  if (fingerprint(payload) === lastSynced) return;

  running = true;
  try {
    const result = await putReaderState(payload);
    apply(result.state);
    lastSynced = fingerprint(snapshot());
  } catch {
    // Offline or a 5xx: the next change (or the next app start) retries. Local
    // state is already saved, so nothing is lost.
  } finally {
    running = false;
  }
}

function schedule(): void {
  if (!getAuthToken()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void push();
  }, 2500);
}

/** Full two-way sync, used after sign-in and by the "Sync now" button. */
export async function syncAccount(): Promise<ReaderState> {
  const remote = await getReaderState();
  apply(remote.state);

  const local = snapshot();
  const result = await putReaderState(local);
  apply(result.state);
  lastSynced = fingerprint(snapshot());
  return {
    progress: serializeProgress(),
    saves: allSaved().map(toReaderSave),
    updatedAt: result.state.updatedAt,
  };
}

/**
 * Debounced push after any read, save or quiz. A burst (finishing a brief) is
 * one request, not five.
 */
export function startAutoSync(): () => void {
  const offProgress = subscribeProgress(schedule);
  const offSaved = subscribeSaved(schedule);
  return () => {
    offProgress();
    offSaved();
    if (timer) clearTimeout(timer);
    timer = null;
    running = false;
  };
}

export function resetSyncCursor(): void {
  lastSynced = "";
}
