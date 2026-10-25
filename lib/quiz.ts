import { matchPyq } from "./pyq";
import { payoffForTopic } from "./taxonomy-extras";
import { TOPIC_ORDER, TOPICS } from "./taxonomy";
import type { FeedItem, QuizQuestion, TopicId } from "./types";

/**
 * Retrieval questions for a story.
 *
 * Preference order: a real previous-year question that matches the story, then
 * the syllabus angle the story belongs to. Both are answerable from the story
 * itself, which is the point — a question a reader cannot resolve teaches
 * nothing.
 */

/** Stable 0..n-1 from an id, so the correct option is not always first. */
function rotate(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return hash % Math.max(1, length);
}

function withRotation(options: string[], answerIndex: number, seed: string): { options: string[]; answerIndex: number } {
  const shift = rotate(seed, options.length);
  return {
    options: [...options.slice(shift), ...options.slice(0, shift)],
    answerIndex: (answerIndex - shift + options.length) % options.length,
  };
}

export function quizFor(item: FeedItem): QuizQuestion {
  const match = matchPyq(item);
  if (match) {
    const rotated = withRotation(match.options, match.answer, item.id);
    return {
      kind: "pyq",
      label: `UPSC Prelims ${match.year}`,
      prompt: match.question,
      options: rotated.options,
      answerIndex: rotated.answerIndex,
      explanation: match.explanation,
      pyqId: match.id,
    };
  }

  const topic: TopicId | null = item.primaryTopic;
  const correct = payoffForTopic(topic);
  const decoys = TOPIC_ORDER.filter((id) => id !== topic)
    .slice(0, 3)
    .map((id) => payoffForTopic(id));
  const rotated = withRotation([correct, ...decoys], 0, item.id);

  return {
    kind: "topic",
    label: "Syllabus angle",
    prompt: `This story sits in ${topic ? TOPICS[topic].label : "current affairs"}. Which exam move does it enable?`,
    options: rotated.options,
    answerIndex: rotated.answerIndex,
    explanation: `The theme is ${topic ? TOPICS[topic].label : "general current affairs"}. ${correct}`,
  };
}

/** Up to `limit` distinct questions for a set of brief entries. */
export function quizSet(entries: { id: string; quiz?: QuizQuestion }[], limit = 3): QuizQuestion[] {
  const seen = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const entry of entries) {
    if (!entry.quiz) continue;
    if (entry.quiz.pyqId && seen.has(entry.quiz.pyqId)) continue;
    if (entry.quiz.pyqId) seen.add(entry.quiz.pyqId);
    out.push(entry.quiz);
    if (out.length >= limit) break;
  }
  return out;
}
