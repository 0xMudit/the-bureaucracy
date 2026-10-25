import raw from "@/data/pyq.json";
import type { FeedItem, PaperId, TopicId } from "./types";

/**
 * Previous-year questions, matched conservatively.
 *
 * A false "this was asked in 2019" is worse than no badge at all: it teaches a
 * reader that the labels are decoration. A story only matches when the topic
 * agrees and at least two distinctive keywords appear, or one long phrase does.
 */
export interface PyqQuestion {
  id: string;
  year: number;
  paper: PaperId;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  topics: TopicId[];
  keywords: string[];
}

export interface PyqMatch extends PyqQuestion {
  /** The phrases that caused the match, shown in the expanded view. */
  hits: string[];
}

export const PYQ_BANK: PyqQuestion[] = raw.questions as PyqQuestion[];
export const PYQ_NOTE: string = raw.note;
export const PYQ_UPDATED_AT: string = raw.updatedAt;

const MIN_HITS = 2;

function haystackFor(item: Pick<FeedItem, "title" | "summary" | "keywords" | "topics">): string {
  return `${item.title} ${item.summary} ${item.keywords.join(" ")}`.toLowerCase();
}

/**
 * Best question for a story, or null. `topics` is checked first because a
 * keyword can appear in a story about something else entirely.
 */
export function matchPyq(
  item: Pick<FeedItem, "title" | "summary" | "keywords" | "topics" | "primaryTopic">,
): PyqMatch | null {
  const haystack = haystackFor(item);
  const topics = new Set<TopicId>(item.topics);
  let best: PyqMatch | null = null;

  for (const question of PYQ_BANK) {
    const topical = question.topics.some((topic) => topics.has(topic));
    if (!topical) continue;

    const hits = question.keywords.filter((keyword) => haystack.includes(keyword));
    const strongEnough = hits.length >= MIN_HITS || hits.some((keyword) => keyword.length >= 12);
    if (!strongEnough) continue;

    if (!best || hits.length > best.hits.length || (hits.length === best.hits.length && question.year > best.year)) {
      best = { ...question, hits };
    }
  }

  return best;
}

/** Year label used on badges. */
export function pyqLabel(match: PyqMatch): string {
  return `PYQ ${match.year}`;
}
