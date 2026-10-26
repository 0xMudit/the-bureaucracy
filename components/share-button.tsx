"use client";

import { Share2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/telemetry";

interface ShareButtonProps {
  title: string;
  path: string;
  source?: string;
}

/** One-tap share: native sheet where it exists, copy link everywhere else. */
export function ShareButton({ title, path, source }: ShareButtonProps) {
  const onClick = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        trackEvent("share", { via: "native" });
        return;
      } catch {
        // Reader dismissed the sheet; fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.add({ type: "success", title: "Link copied", description: source ? `Share the ${source} story.` : undefined });
      trackEvent("share", { via: "copy" });
    } catch {
      toast.add({ type: "error", title: "Could not copy on this browser" });
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      data-share-button
      className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]"
    >
      <Share2 className="size-3.5" /> Share
    </Button>
  );
}
