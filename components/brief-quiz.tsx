"use client";

import { useState } from "react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { recordQuiz } from "@/lib/progress";
import { trackEvent } from "@/lib/telemetry";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Three questions from today's five. This is the finish line's second half:
 * the brief proves you read, the quiz proves something stuck.
 */
export function BriefQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) return null;

  const question = questions[index];
  const revealed = choice !== null;
  const isCorrect = choice === question.answerIndex;

  const choose = (value: number) => {
    if (revealed) return;
    setChoice(value);
    if (value === question.answerIndex) setCorrectCount((count) => count + 1);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex((current) => current + 1);
      setChoice(null);
      return;
    }
    recordQuiz(correctCount, questions.length);
    trackEvent("quiz_complete", { correct: correctCount, total: questions.length });
    setDone(true);
  };

  const reset = () => {
    setIndex(0);
    setChoice(null);
    setCorrectCount(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {correctCount} of {questions.length}.
          </span>{" "}
          Retrieval is the part that sticks. Your score is kept for today only.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="size-3" /> Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">
          {question.label} · {index + 1}/{questions.length}
        </p>
        <div className="flex flex-1 items-center gap-1" aria-hidden>
          {questions.map((entry, position) => (
            <span
              key={`${entry.label}-${position}`}
              className={cn("h-0.5 flex-1", position <= index ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/90">{question.prompt}</p>

      <div className="mt-2 space-y-1" role="group" aria-label="Answer options">
        {question.options.map((option, position) => {
          const answer = position === question.answerIndex;
          const picked = position === choice;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(position)}
              disabled={revealed}
              aria-pressed={picked}
              className={cn(
                "flex w-full items-start gap-2 border px-2 py-1.5 text-left text-[12px] leading-snug",
                !revealed && "border-border hover:border-primary/50",
                revealed && answer && "border-primary bg-primary/10",
                revealed && picked && !answer && "border-destructive/60 bg-destructive/5",
                revealed && !answer && !picked && "border-border/60 text-muted-foreground",
              )}
            >
              <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center border border-current font-mono text-[7px]">
                {revealed && answer ? <Check className="size-2" strokeWidth={3} /> : revealed && picked ? <X className="size-2" /> : String.fromCharCode(65 + position)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            <span className={cn("font-medium", isCorrect ? "text-primary" : "text-foreground")}>
              {isCorrect ? "Correct." : "Not quite."}
            </span>{" "}
            {question.explanation}
          </p>
          <button
            type="button"
            onClick={next}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-foreground px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-background hover:bg-primary"
          >
            {index + 1 < questions.length ? "Next" : "Finish"} <ChevronRight className="size-3" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
