"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { reactionAction } from "@/app/social-actions";
import type { ViewerReaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReactionBar({
  itemId,
  initial,
  canWrite,
  size = "sm",
}: {
  itemId: string;
  initial: ViewerReaction;
  canWrite: boolean;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();

  const react = (kind: "like" | "dislike") => {
    if (!canWrite || pending) return;
    const previous = state;
    const removing = state.reaction === kind;
    const nextReaction = removing ? null : kind;
    const next = { ...state, reaction: nextReaction };
    if (state.reaction === "like") next.likes = Math.max(0, state.likes - 1);
    if (state.reaction === "dislike") next.dislikes = Math.max(0, state.dislikes - 1);
    if (nextReaction === "like") next.likes += 1;
    if (nextReaction === "dislike") next.dislikes += 1;
    setState(next);

    startTransition(async () => {
      const result = await reactionAction(itemId, kind);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error);
        return;
      }
      setState({ ...state, likes: result.likes, dislikes: result.dislikes, reaction: result.reaction });
    });
  };

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center gap-1.5 pt-0.5",
        size === "sm" ? "w-9" : "w-11",
      )}
      aria-label="Story reactions"
    >
      <button
        type="button"
        data-like-button
        onClick={() => react("like")}
        disabled={!canWrite || pending}
        aria-pressed={state.reaction === "like"}
        aria-label={`Like this story, ${state.likes} ${state.likes === 1 ? "like" : "likes"}`}
        title={canWrite ? "Like (L)" : "Reactions connect once the database is configured"}
        className={cn(
          "group/like flex w-full flex-col items-center rounded-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          state.reaction === "like" ? "text-primary" : "text-muted-foreground hover:text-primary",
          (!canWrite || pending) && "cursor-not-allowed opacity-60",
        )}
      >
        <ThumbsUp
          className={cn(size === "sm" ? "size-[18px]" : "size-5", "transition-transform group-hover/like:-translate-y-0.5")}
          strokeWidth={2.2}
        />
        <span className={cn("stat-tick mt-0.5 font-mono tabular-nums", size === "sm" ? "text-[10.5px]" : "text-xs")}>
          {state.likes}
        </span>
      </button>
      <button
        type="button"
        data-dislike-button
        onClick={() => react("dislike")}
        disabled={!canWrite || pending}
        aria-pressed={state.reaction === "dislike"}
        aria-label={`Dislike this story, ${state.dislikes} ${state.dislikes === 1 ? "dislike" : "dislikes"}`}
        title={canWrite ? "Dislike (D)" : "Reactions connect once the database is configured"}
        className={cn(
          "group/dislike flex w-full flex-col items-center rounded-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          state.reaction === "dislike" ? "text-primary" : "text-muted-foreground hover:text-primary",
          (!canWrite || pending) && "cursor-not-allowed opacity-60",
        )}
      >
        <ThumbsDown
          className={cn(size === "sm" ? "size-[16px]" : "size-[18px]", "transition-transform group-hover/dislike:translate-y-0.5")}
          strokeWidth={2}
        />
        <span className={cn("mt-0.5 font-mono tabular-nums", size === "sm" ? "text-[9.5px]" : "text-[10px]")}>
          {state.dislikes}
        </span>
      </button>
    </div>
  );
}
