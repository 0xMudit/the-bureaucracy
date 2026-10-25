"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCommentAction, editCommentAction } from "@/app/social-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/utils";

export function CommentBody({
  commentId,
  body,
  createdAt,
  editedAt,
  deletedAt,
  canEdit,
}: {
  commentId: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(body);
  const [pending, setPending] = useState(false);
  const deleted = Boolean(deletedAt);

  const save = async () => {
    setPending(true);
    const result = await editCommentAction(commentId, text);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEditing(false);
    toast.success("Comment edited");
  };

  const remove = async () => {
    if (!window.confirm("Delete this comment? Replies stay in the thread.")) return;
    setPending(true);
    const result = await deleteCommentAction(commentId);
    setPending(false);
    if (!result.ok) toast.error(result.error);
  };

  if (editing) {
    return (
      <div className="mt-1.5 pl-8">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          maxLength={1500}
          aria-label="Edit comment"
          className="rounded-sm bg-background text-base sm:text-sm"
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={save} disabled={pending || text.trim().length < 3}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p
        className={
          deleted
            ? "mt-1.5 whitespace-pre-wrap break-words pl-8 text-[13.5px] italic leading-relaxed text-muted-foreground"
            : "mt-1.5 whitespace-pre-wrap break-words pl-8 text-[13.5px] leading-relaxed text-foreground/90"
        }
      >
        {deleted ? "This comment was deleted by its author." : body}
      </p>
      <div className="ml-8 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {editedAt && !deleted ? (
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
            edited {timeAgo(editedAt)} · {timeAgo(createdAt)}
          </span>
        ) : null}
        {canEdit && !deleted ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
            >
              <Pencil className="size-2.5" /> Edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-destructive"
            >
              {pending ? <Loader2 className="size-2.5 animate-spin" /> : <Trash2 className="size-2.5" />} Delete
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
