import { PAPERS } from "./taxonomy";
import type { PaperId, Priority } from "./types";

export const PAPER_LABEL: Record<PaperId, string> = {
  prelims: "Prelims",
  gs1: PAPERS.gs1.short,
  gs2: PAPERS.gs2.short,
  gs3: PAPERS.gs3.short,
  gs4: PAPERS.gs4.short,
  essay: PAPERS.essay.short,
};

export function priorityLabel(priority: Priority): string {
  return priority === "high" ? "High priority" : priority === "medium" ? "Worth reading" : "Background";
}
