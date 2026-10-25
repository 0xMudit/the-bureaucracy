"use client";

import { useActionState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { reportCommentAction, type ReportState } from "@/app/moderation-actions";

const INITIAL: ReportState = {};

/**
 * Inline report control. Deliberately quiet: no counters, no public tally, no
 * gamification. One report per person per comment is enforced server-side.
 */
export function ReportButton({ commentId }: { commentId: string }) {
  const [state, action, pending] = useActionState(reportCommentAction, INITIAL);

  if (state.ok) {
    return (
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        Reported
      </span>
    );
  }

  return (
    <details className="open:w-full">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary">
        <Flag className="size-2.5" /> Report
      </summary>
      <form action={action} className="mt-2 max-w-sm space-y-2 border-l-2 border-border pl-3">
        <input type="hidden" name="commentId" value={commentId} />
        <label className="block font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
          Reason
          <select
            name="reason"
            defaultValue="spam"
            className="mt-1 h-8 w-full rounded-sm border border-border bg-background px-2 font-sans text-base normal-case tracking-normal text-foreground sm:text-xs"
          >
            <option value="spam">Spam or a coaching advert</option>
            <option value="abuse">Harassment or abuse</option>
            <option value="off-topic">Off-topic</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <textarea
          name="detail"
          rows={2}
          maxLength={300}
          placeholder="Optional note for the editor"
          className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base leading-relaxed text-foreground sm:text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-foreground px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-background disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Flag className="size-3" />}
          Send report
        </button>
        {state.error ? (
          <p role="alert" className="text-[11px] leading-relaxed text-destructive">
            {state.error}
          </p>
        ) : null}
      </form>
    </details>
  );
}
