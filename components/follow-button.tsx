"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { followAction } from "@/app/social-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetId,
  targetUsername,
  initialFollowing,
  initialFollowers,
  isAuthenticated,
  isSelf,
  size = "default",
}: {
  targetId: string;
  targetUsername: string;
  initialFollowing: boolean;
  initialFollowers: number;
  isAuthenticated: boolean;
  isSelf: boolean;
  size?: "default" | "sm";
}) {
  const [state, setState] = useState({ following: initialFollowing, followers: initialFollowers });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (isSelf) {
    return (
      <span className="inline-flex h-9 items-center border border-border bg-muted px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        Your desk
      </span>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button asChild size={size === "sm" ? "sm" : "default"} className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
        <Link href={`/login?next=${encodeURIComponent(`/u/${targetUsername}`)}`}>
          <UserPlus className="size-3.5" /> Follow
        </Link>
      </Button>
    );
  }

  const toggle = () => {
    if (pending) return;
    const previous = state;
    setState({
      following: !state.following,
      followers: Math.max(0, state.followers + (state.following ? -1 : 1)),
    });
    startTransition(async () => {
      const result = await followAction(targetId);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error);
        return;
      }
      setState({ following: result.following, followers: result.followers });
      toast.success(result.following ? `Following @${targetUsername}` : `Unfollowed @${targetUsername}`);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={toggle}
        disabled={pending}
        variant={state.following ? "outline" : "default"}
        size={size === "sm" ? "sm" : "default"}
        aria-pressed={state.following}
        className={cn(
          "h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]",
          state.following && "text-muted-foreground",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : state.following ? (
          <UserCheck className="size-3.5" />
        ) : (
          <UserPlus className="size-3.5" />
        )}
        {state.following ? "Following" : "Follow"}
      </Button>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground" aria-live="polite">
        {state.followers} {state.followers === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
