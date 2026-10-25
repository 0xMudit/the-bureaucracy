import { useSyncExternalStore } from "react";
import type { FeedFilters } from "@/api/types";

/**
 * The wire's filter state, shared across tabs.
 *
 * The Lens screen sets an optional subject and jumps to the wire; search sets
 * a query and closes. Keeping this outside the router means neither screen has
 * to know how the other navigates.
 */

export const DEFAULT_FILTERS: FeedFilters = {
  sort: "top",
  topic: "all",
  optional: "all",
  paper: "all",
  q: "",
};

let state: FeedFilters = DEFAULT_FILTERS;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setFilters(patch: Partial<FeedFilters>): void {
  state = { ...state, ...patch };
  emit();
}

export function resetFilters(): void {
  state = DEFAULT_FILTERS;
  emit();
}

/** Clear the taxonomy filters but keep the sort order. */
export function clearScope(): void {
  state = { ...state, topic: "all", optional: "all", paper: "all", q: "" };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FeedFilters {
  return state;
}

export function useFeedFilters() {
  const filters = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    filters,
    setFilters,
    reset: resetFilters,
    clearScope,
    isScoped:
      filters.topic !== "all" ||
      filters.optional !== "all" ||
      filters.paper !== "all" ||
      filters.q.trim() !== "",
  };
}

/** Stable key for React Query, so identical filters share a cache entry. */
export function filterKey(filters: FeedFilters): string {
  return [filters.sort, filters.topic, filters.optional, filters.paper, filters.q.trim()].join("|");
}
