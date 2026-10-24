"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { commentAction, type CommentState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: CommentState = { ok: false };

export function CommentForm({
  itemId,
  parentId,
  defaultAuthor,
  compact = false,
  onDone,
}: {
  itemId: string;
  parentId?: string | null;
  defaultAuthor?: string;
  compact?: boolean;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(commentAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state.stamp, state.ok, onDone]);

  return (
    <form ref={formRef} action={action} className={compact ? "mt-2 space-y-2" : "space-y-3"}>
      <input type="hidden" name="itemId" value={itemId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}

      <div className={compact ? "flex gap-2" : "grid gap-2 sm:grid-cols-[180px_1fr]"}>
        <Input
          name="author"
          defaultValue={defaultAuthor}
          placeholder="Your name"
          maxLength={32}
          required
          aria-label="Your name"
          className="h-9 rounded-sm bg-background font-mono text-xs"
        />
        <Textarea
          name="body"
          placeholder={compact ? "Write a reply…" : "Add the angle you would take in an answer. Cite the article, a report or a judgment."}
          required
          minLength={3}
          maxLength={1500}
          rows={compact ? 3 : 4}
          aria-label="Your comment"
          className="min-h-20 rounded-sm bg-background text-sm leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
          Be civil. No coaching spam. Comments expire with the story.
        </p>
        <Button type="submit" size="sm" disabled={pending} className="h-8 shrink-0 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {compact ? "Reply" : "Post comment"}
        </Button>
      </div>

      {state.error ? (
        <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="border-l-2 border-primary bg-primary/5 px-2 py-1.5 text-xs text-primary">
          Posted.
        </p>
      ) : null}
    </form>
  );
}
