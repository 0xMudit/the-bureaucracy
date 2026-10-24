"use client";

import { useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { voteAction } from "@/app/actions";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  itemId: string;
  points: number;
  seedPoints: number;
  voted: boolean;
  canWrite: boolean;
  size?: "sm" | "md";
}

export function VoteButton({ itemId, points, seedPoints, voted, canWrite, size = "sm" }: VoteButtonProps) {
  const [state, setState] = useState({ points, voted });
  const [pending, startTransition] = useTransition();
  const total = state.points + seedPoints;

  const onClick = () => {
    if (!canWrite || pending) return;
    const previous = state;
    setState({ points: previous.points + (previous.voted ? -1 : 1), voted: !previous.voted });
    startTransition(async () => {
      const result = await voteAction(itemId);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error);
        return;
      }
      setState({ points: result.points, voted: result.voted });
    });
  };

  return (
    <button
      type="button"
      data-vote-button
      onClick={onClick}
      disabled={!canWrite}
      aria-pressed={state.voted}
      aria-label={state.voted ? `Remove upvote, ${total} points` : `Upvote, ${total} points`}
      title={canWrite ? (state.voted ? "Remove your vote" : "Upvote this story") : "Voting connects once the database is configured"}
      className={cn(
        "group/vote flex shrink-0 flex-col items-center rounded-sm pt-0.5 leading-none transition-colors",
        size === "sm" ? "w-9" : "w-11",
        state.voted ? "text-primary" : "text-muted-foreground hover:text-primary",
        !canWrite && "cursor-not-allowed opacity-60",
      )}
    >
      <ChevronUp
        className={cn(size === "sm" ? "size-5" : "size-6", "transition-transform group-hover/vote:-translate-y-0.5")}
        strokeWidth={2.4}
      />
      <span className={cn("stat-tick font-mono", size === "sm" ? "text-[11px]" : "text-sm")}>
        {total}
      </span>
    </button>
  );
}
