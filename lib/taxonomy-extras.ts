import { PAPERS } from "./taxonomy";
import type { FeedItem, PaperId, Priority } from "./types";

export const PAPER_LABEL: Record<PaperId, string> = {
  prelims: "Prelims",
  gs1: PAPERS.gs1.short,
  gs2: PAPERS.gs2.short,
  gs3: PAPERS.gs3.short,
  gs4: PAPERS.gs4.short,
  essay: PAPERS.essay.short,
};

/**
 * One line, repeated on every surface, that names the exam move a story
 * enables. Deliberately concrete: a paper and an operation, never "important
 * for UPSC". Keep these short enough for a single line on a phone.
 */
const TOPIC_PAYOFF: Record<string, string> = {
  polity: "Which institution owns this call, and under what article?",
  governance: "Who is excluded at last mile, and what would fix delivery?",
  economy: "Read the number, then name who gains and who pays.",
  ir: "India's stated interest, and the cost of the alignment.",
  environment: "Separate the ecological mechanism from the headline.",
  science: "The basic science first, then the regulation around it.",
  security: "Which agency has the mandate, and where coordination breaks.",
  society: "Whose lived experience does this data describe?",
  history: "Place it in a period, a tradition or a conservation debate.",
  ethics: "Name the competing values before you pick a side.",
  reports: "Publisher, India's value, and what moved it.",
  exam: "Verify this on the commission's own site before acting.",
};

/** The line a card shows so reading it returns something examinable. */
export function payoffForTopic(topicId: string | null | undefined): string {
  const line = topicId ? TOPIC_PAYOFF[topicId] : null;
  return line ?? "Name the syllabus theme before you file this away.";
}

export function payoffFor(item: Pick<FeedItem, "primaryTopic" | "primaryOptional">): string {
  return payoffForTopic(item.primaryTopic);
}

export function priorityLabel(priority: Priority): string {
  return priority === "high" ? "High priority" : priority === "medium" ? "Worth reading" : "Background";
}
