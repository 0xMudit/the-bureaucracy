"use client";

import { useEffect, useState } from "react";
import { Check, HelpCircle, Lightbulb, X } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEY = "tb_reveal_v1";

type RevealLog = Record<string, { choice: number; correct: boolean }>;

function readLog(): RevealLog {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RevealLog;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLog(itemId: string, choice: number, correct: boolean): void {
  try {
    const log = readLog();
    log[itemId] = { choice, correct };
    const keys = Object.keys(log).slice(-200);
    const next: RevealLog = {};
    for (const key of keys) next[key] = log[key];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Guess first, then see the answer. Passive reading cannot produce the "was I
 * right?" moment; retrieval can, and it is the part that transfers to the exam.
 */
export function PrelimsReveal({ itemId, quiz }: { itemId: string; quiz: QuizQuestion }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const stored = readLog()[itemId];
    if (stored) {
      setChoice(stored.choice);
      setRevealed(true);
    }
  }, [itemId]);

  const answer = (index: number) => {
    if (revealed) return;
    const correct = index === quiz.answerIndex;
    setChoice(index);
    setRevealed(true);
    writeLog(itemId, index, correct);
    trackEvent("reveal", { correct: correct ? 1 : 0, kind: quiz.kind });
  };

  const correct = choice === quiz.answerIndex;

  return (
    <section aria-labelledby="reveal-title" className="mt-8 border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 id="reveal-title" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
          <HelpCircle className="size-3.5 text-primary" /> {quiz.kind === "pyq" ? "Guess first" : "Quick check"}
        </h2>
        <span
          className={cn(
            "font-mono text-[8.5px] uppercase tracking-[0.1em]",
            quiz.kind === "pyq" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {quiz.label}
        </span>
      </div>

      <div className="px-4 py-4">
        <p className="text-[13.5px] leading-relaxed text-foreground/90">{quiz.prompt}</p>

        <div className="mt-3 space-y-1.5" role="group" aria-label="Answer options">
          {quiz.options.map((option, index) => {
            const isAnswer = index === quiz.answerIndex;
            const isChoice = index === choice;
            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(index)}
                disabled={revealed}
                aria-pressed={isChoice}
                className={cn(
                  "flex w-full items-start gap-2 border px-2.5 py-2 text-left text-[12.5px] leading-snug transition-colors",
                  !revealed && "border-border hover:border-primary/50 hover:bg-accent/40",
                  revealed && isAnswer && "border-primary bg-primary/10 text-foreground",
                  revealed && isChoice && !isAnswer && "border-destructive/60 bg-destructive/5 text-foreground",
                  revealed && !isAnswer && !isChoice && "border-border/60 text-muted-foreground",
                )}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center border border-current font-mono text-[8px]">
                  {revealed && isAnswer ? <Check className="size-2.5" strokeWidth={3} /> : revealed && isChoice ? <X className="size-2.5" /> : String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {revealed ? (
          <div className="mt-3 border-l-2 border-primary/70 pl-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">
              {correct ? "Correct" : "Not quite"} · {quiz.kind === "pyq" ? "previous-year question" : "syllabus angle"}
            </p>
            <p className="mt-1 flex gap-1.5 text-[12px] leading-relaxed text-foreground/85">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {quiz.explanation}
            </p>
          </div>
        ) : (
          <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            Pick one. The answer appears after your guess.
          </p>
        )}
      </div>
    </section>
  );
}
