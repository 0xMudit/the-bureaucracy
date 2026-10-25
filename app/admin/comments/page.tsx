import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, EyeOff, Flag, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModerationButton } from "@/components/moderation-controls";
import {
  deleteCommentAction,
  dismissReportsAction,
  hideCommentAction,
  restoreCommentAction,
} from "@/app/moderation-actions";
import { getSessionUser, userCan } from "@/lib/auth";
import { loadModerationQueue, type ReportRow } from "@/lib/moderation";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

const REASON_LABEL: Record<ReportRow["reason"], string> = {
  spam: "Spam",
  abuse: "Abuse",
  "off-topic": "Off-topic",
  other: "Other",
};

const DONE: Record<string, string> = {
  hide: "Comment hidden. It is out of the public thread.",
  restore: "Comment restored.",
  delete: "Comment and its replies deleted.",
  dismiss: "Reports closed without a change.",
};

function Notice({ done, error }: { done?: string; error?: string }) {
  if (error) {
    return (
      <p className="mt-4 flex items-center gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        {error === "forbidden"
          ? "Your account cannot moderate comments."
          : "That action could not be completed. Try again."}
      </p>
    );
  }
  if (done && DONE[done]) {
    return (
      <p className="mt-4 flex items-center gap-2 border-l-2 border-primary bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
        <CheckCircle2 className="size-3.5 shrink-0" />
        {DONE[done]}
      </p>
    );
  }
  return null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ModerationPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Sign in to moderate.</h1>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/submit?next=/admin/comments">Log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!userCan(user, "comment.moderate")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">The queue is open to editors.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Signed in as {user.email}. Moderation needs an editor or admin account.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/">Back to the wire</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!serviceClient()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">No database</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Moderation needs the service role.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Set SUPABASE_SERVICE_ROLE_KEY on this deployment to read the report queue.
          </p>
        </div>
      </div>
    );
  }

  const query = await searchParams;
  const done = typeof query.done === "string" ? query.done : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;
  const { reports, comments, recent, hidden, open } = await loadModerationQueue();

  const grouped = new Map<string, ReportRow[]>();
  for (const report of reports) {
    const list = grouped.get(report.commentId) ?? [];
    list.push(report);
    grouped.set(report.commentId, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <Flag className="size-3" /> Comment desk
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            Moderation.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {open === 0 ? "No open reports." : `${open} open report${open === 1 ? "" : "s"}`} ·{" "}
            {hidden} hidden comment{hidden === 1 ? "" : "s"} · comments expire with their story.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
          <Link href="/admin/comments">Refresh</Link>
        </Button>
      </div>

      <Notice done={done} error={error} />

      <section className="mt-6 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
            <Flag className="size-3 text-primary" /> Reported
          </h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {grouped.size} thread{grouped.size === 1 ? "" : "s"}
          </span>
        </div>

        {grouped.size ? (
          <ul className="divide-y divide-border/60">
            {[...grouped.entries()].map(([commentId, list]) => {
              const comment = comments.get(commentId);
              const reasons = [...new Set(list.map((report) => report.reason))];
              const notes = list.map((report) => report.detail).filter(Boolean);
              const latest = list[0];

              return (
                <li key={commentId} className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {reasons.map((reason) => (
                      <span
                        key={reason}
                        className="border border-primary/40 bg-primary/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-primary"
                      >
                        {REASON_LABEL[reason]}
                      </span>
                    ))}
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      {list.length} report{list.length === 1 ? "" : "s"} · latest {timeAgo(latest.createdAt)}
                    </span>
                  </div>

                  {comment ? (
                    <>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/90">
                        <span className="font-medium">{comment.author}</span>{" "}
                        <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                          {timeAgo(comment.createdAt)}
                          {comment.hiddenAt ? " · hidden" : ""}
                        </span>
                      </p>
                      <blockquote className="mt-1 border-l-2 border-border pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
                        {comment.body}
                      </blockquote>
                      <Link
                        href={`/item/${comment.itemId}#discussion`}
                        className="mt-1 inline-flex font-mono text-[8px] uppercase tracking-[0.1em] text-primary hover:underline"
                      >
                        Open thread
                      </Link>
                    </>
                  ) : (
                    <p className="mt-2 text-[12.5px] text-muted-foreground">
                      The comment was deleted; the reports will cascade.
                    </p>
                  )}

                  {notes.length ? (
                    <ul className="mt-2 space-y-0.5">
                      {notes.map((note, index) => (
                        <li key={index} className="text-[11.5px] leading-relaxed text-muted-foreground">
                          “{note}”
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <form action={hideCommentAction}>
                      <input type="hidden" name="commentId" value={commentId} />
                      <ModerationButton tone="primary">
                        <EyeOff className="size-3" /> Hide
                      </ModerationButton>
                    </form>
                    <form action={dismissReportsAction}>
                      <input type="hidden" name="commentId" value={commentId} />
                      <ModerationButton>
                        <CheckCircle2 className="size-3" /> Dismiss reports
                      </ModerationButton>
                    </form>
                    <form action={deleteCommentAction}>
                      <input type="hidden" name="commentId" value={commentId} />
                      <ModerationButton
                        tone="danger"
                        confirm="Delete this comment and every reply under it?"
                      >
                        <XCircle className="size-3" /> Delete
                      </ModerationButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Nothing reported. The queue is clear.
          </p>
        )}
      </section>

      <section className="mt-5 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em]">
            <MessageSquare className="size-3 text-primary" /> Recent comments
          </h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            Newest first
          </span>
        </div>

        {recent.length ? (
          <ul className="divide-y divide-border/60">
            {recent.map((comment) => (
              <li key={comment.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium">{comment.author}</span>
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                  </span>
                  {comment.hiddenAt ? (
                    <span className="border border-destructive/40 px-1 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-destructive">
                      Hidden
                    </span>
                  ) : null}
                  <Link
                    href={`/item/${comment.itemId}#discussion`}
                    className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-primary hover:underline"
                  >
                    Thread
                  </Link>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  {comment.body}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {comment.hiddenAt ? (
                    <form action={restoreCommentAction}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <ModerationButton>
                        <EyeOff className="size-3" /> Restore
                      </ModerationButton>
                    </form>
                  ) : (
                    <form action={hideCommentAction}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <ModerationButton>
                        <EyeOff className="size-3" /> Hide
                      </ModerationButton>
                    </form>
                  )}
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <ModerationButton
                      tone="danger"
                      confirm="Delete this comment and every reply under it?"
                    >
                      <XCircle className="size-3" /> Delete
                    </ModerationButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            No comments yet.
          </p>
        )}
      </section>

      <p className="mt-4 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Every hide, restore and delete is appended to the audit log with the editor, the author and the reason.
      </p>
    </div>
  );
}
