"use client";

import * as React from "react";
import { Radio } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";
import type { CommentNode } from "@/lib/types";

interface DiscussionLiveProps {
  itemId: string;
  initialNodes: CommentNode[];
  authorName?: string;
  canComment: boolean;
  canReport: boolean;
  loginHref: string;
  likes: Record<string, { liked: boolean; likes: number }>;
  viewerId?: string;
}

/**
 * Live discussion.
 *
 * A Supabase realtime channel per open thread would burn a connection for every
 * reader who never scrolls to the comments. Instead this polls one endpoint
 * every 15 seconds, only while the tab is visible and only on the story page
 * where the discussion is already on screen. The cost is bounded by "one open
 * thread", which is exactly the requirement.
 */
export function DiscussionLive({
  itemId,
  initialNodes,
  authorName,
  canComment,
  canReport,
  loginHref,
  likes,
  viewerId,
}: DiscussionLiveProps) {
  const [nodes, setNodes] = React.useState(initialNodes);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let timer = 0;

    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/item/${encodeURIComponent(itemId)}/comments`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error("refresh failed");
        const payload = (await response.json()) as {
          ok: boolean;
          comments?: CommentNode[];
          fetchedAt?: string;
        };
        if (cancelled || !payload.ok || !Array.isArray(payload.comments)) return;
        setNodes(payload.comments);
        setUpdatedAt(payload.fetchedAt ?? new Date().toISOString());
        failures = 0;
      } catch {
        failures += 1;
        // Back off after repeated failures instead of hammering a cold server.
        if (failures > 4) window.clearInterval(timer);
      }
    };

    timer = window.setInterval(tick, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [itemId]);

  return (
    <>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
        <Radio className="size-2.5 text-primary" />
        Live thread
        {updatedAt ? ` · refreshed ${new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </p>
      <div className="mt-3">
        <CommentThread
          nodes={nodes}
          itemId={itemId}
          authorName={authorName}
          canComment={canComment}
          canReport={canReport}
          loginHref={loginHref}
          likes={likes}
          viewerId={viewerId}
        />
      </div>
    </>
  );
}
