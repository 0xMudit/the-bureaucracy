"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { readSaved, SAVED_EVENT, writeSaved, type SavedItem } from "@/lib/saved";
import { cn } from "@/lib/utils";

export function SaveButton({ item, className }: { item: SavedItem; className?: string }) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(readSaved().some((s) => s.id === item.id));
    sync();
    setReady(true);
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id]);

  const toggle = () => {
    const current = readSaved();
    const exists = current.some((s) => s.id === item.id);
    if (exists) {
      writeSaved(current.filter((s) => s.id !== item.id));
      setSaved(false);
      toast("Removed from your reading list");
    } else {
      writeSaved([{ ...item, savedAt: new Date().toISOString() }, ...current].slice(0, 100));
      setSaved(true);
      toast.success("Saved for revision", {
        description: "It comes back on day 1, 3, 7 and 30. Stored on this device only.",
      });
    }
  };

  return (
    <button
      type="button"
      data-save-button
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      title={saved ? "Remove from saved" : "Save for later"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        saved && "text-primary",
        !ready && "opacity-0",
        className,
      )}
    >
      {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
    </button>
  );
}
