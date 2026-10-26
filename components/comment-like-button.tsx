"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { commentLikeAction } from "@/app/social-actions";
import { cn } from "@/lib/utils";

export function CommentLikeButton({
  commentId,
  initialLiked,
  initialLikes,
  disabled,
}: {
  commentId: string;
  initialLiked: boolean;
  initialLikes: number;
  disabled?: boolean;
}) {
  const [state, setState] = useState({ liked: initialLiked, likes: initialLikes });
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending || disabled) return;
    const previous = state;
    setState({
      liked: !state.liked,
      likes: Math.max(0, state.likes + (state.liked ? -1 : 1)),
    });
    setPending(true);
    const result = await commentLikeAction(commentId);
    setPending(false);
    if (!result.ok) {
      setState(previous);
      toast.add({ type: "error", title: result.error });
      return;
    }
    setState({ liked: result.liked, likes: result.likes });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={state.liked}
      aria-label={`Like this comment, ${state.likes} ${state.likes === 1 ? "like" : "likes"}`}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
        state.liked ? "text-primary" : "text-muted-foreground hover:text-primary",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <ThumbsUp className="size-2.5" />
      {state.likes > 0 ? state.likes : "Like"}
    </button>
  );
}
