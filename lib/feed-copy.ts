import type { SortKey } from "./types";

/**
 * Editorial copy for the four sort modes. Shared by the web front page and the
 * mobile API so a change to the product's voice lands in one place.
 */
export interface SortCopy {
  title: string;
  blurb: string;
}

export const SORT_COPY: Record<SortKey, SortCopy> = {
  top: {
    title: "The 24-hour wire",
    blurb: "Reader points, freshness and syllabus relevance. Nothing older than a day survives here.",
  },
  new: {
    title: "Fresh off the wire",
    blurb: "Everything ingested in the last 24 hours, newest first. No ranking, no favours.",
  },
  best: {
    title: "Best for the syllabus",
    blurb: "The stories with the highest exam relevance in the last 24 hours.",
  },
  discussed: {
    title: "The discussion",
    blurb: "Where aspirants are arguing about the day's policy. Add your angle.",
  },
};

export const SORT_ORDER: SortKey[] = ["top", "new", "best", "discussed"];

export function parseSort(value: string | null | undefined): SortKey {
  return value === "new" || value === "best" || value === "discussed" ? value : "top";
}
