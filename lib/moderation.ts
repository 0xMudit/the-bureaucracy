import { serviceClient } from "./store";

/**
 * Server-side comment moderation.
 *
 * Everything here runs with the service role, so the callers are responsible
 * for authorisation: reads are limited to the desk, writes require the
 * `comment.moderate` permission, and public reporting is rate-limited by the
 * caller before it reaches this module.
 */

export const REPORT_REASONS = ["spam", "abuse", "off-topic", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportedComment {
  id: string;
  itemId: string;
  author: string;
  body: string;
  createdAt: string;
  hiddenAt: string | null;
}

export interface ReportRow {
  id: string;
  commentId: string;
  reason: ReportReason;
  detail: string | null;
  createdAt: string;
  reporterId: string | null;
}

export interface ModerationQueue {
  reports: ReportRow[];
  comments: Map<string, ReportedComment>;
  recent: ReportedComment[];
  hidden: number;
  open: number;
}

interface RawComment {
  id: string;
  item_id: string;
  author: string;
  body: string;
  created_at: string;
  hidden_at: string | null;
}

function toComment(row: RawComment): ReportedComment {
  return {
    id: row.id,
    itemId: row.item_id,
    author: row.author,
    body: row.body,
    createdAt: row.created_at,
    hiddenAt: row.hidden_at,
  };
}

export async function reportComment(input: {
  commentId: string;
  reporterId: string | null;
  reporterKey: string;
  reason: ReportReason;
  detail: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = serviceClient();
  if (!db) return { ok: false, error: "Reporting is unavailable until a database is connected." };

  const { data: comment, error } = await db
    .from("comments")
    .select("id, hidden_at")
    .eq("id", input.commentId)
    .maybeSingle();
  if (error) return { ok: false, error: "The report could not be filed." };
  if (!comment) return { ok: false, error: "That comment no longer exists." };
  if (comment.hidden_at) return { ok: true };

  const { error: insertError } = await db.from("comment_reports").upsert(
    {
      comment_id: input.commentId,
      reporter_id: input.reporterId,
      reporter_key: input.reporterKey,
      reason: input.reason,
      detail: input.detail || null,
    },
    { onConflict: "comment_id,reporter_key", ignoreDuplicates: true },
  );

  if (insertError) return { ok: false, error: "The report could not be filed." };
  return { ok: true };
}

export async function loadModerationQueue(): Promise<ModerationQueue> {
  const db = serviceClient();
  if (!db) return { reports: [], comments: new Map(), recent: [], hidden: 0, open: 0 };

  const [reportsRes, recentRes, hiddenRes] = await Promise.all([
    db
      .from("comment_reports")
      .select("id, comment_id, reason, detail, created_at, reporter_id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("comments")
      .select("id, item_id, author, body, created_at, hidden_at")
      .order("created_at", { ascending: false })
      .limit(40),
    db.from("comments").select("id", { count: "exact", head: true }).not("hidden_at", "is", null),
  ]);

  const reports: ReportRow[] = (reportsRes.data ?? []).map((row) => ({
    id: String(row.id),
    commentId: String(row.comment_id),
    reason: row.reason as ReportReason,
    detail: row.detail ? String(row.detail) : null,
    createdAt: String(row.created_at),
    reporterId: row.reporter_id ? String(row.reporter_id) : null,
  }));

  const ids = [...new Set(reports.map((report) => report.commentId))];
  const comments = new Map<string, ReportedComment>();

  if (ids.length) {
    const { data } = await db
      .from("comments")
      .select("id, item_id, author, body, created_at, hidden_at")
      .in("id", ids);
    for (const row of (data ?? []) as RawComment[]) comments.set(row.id, toComment(row));
  }

  return {
    reports,
    comments,
    recent: ((recentRes.data ?? []) as RawComment[]).map(toComment),
    hidden: hiddenRes.count ?? 0,
    open: reports.length,
  };
}

export interface ModerationResult {
  itemId: string;
  visible: number;
  authorId: string | null;
  author: string;
}

export async function moderateComment(input: {
  commentId: string;
  action: "hide" | "restore" | "delete";
  actorId: string;
  reason?: string;
}): Promise<ModerationResult> {
  const db = serviceClient();
  if (!db) throw new Error("No database connected.");

  const { data: before } = await db
    .from("comments")
    .select("item_id, author_id, author")
    .eq("id", input.commentId)
    .maybeSingle();
  if (!before) throw new Error("That comment no longer exists.");

  const { data, error } = await db.rpc("tb_moderate_comment", {
    p_comment_id: input.commentId,
    p_action: input.action,
    p_actor: input.actorId,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    itemId: String(row?.item_id ?? before.item_id),
    visible: Number(row?.visible_comments ?? 0),
    authorId: before.author_id ? String(before.author_id) : null,
    author: String(before.author ?? "reader"),
  };
}

/** Closes every open report on a comment without changing its visibility. */
export async function dismissReports(commentId: string, actorId: string): Promise<void> {
  const db = serviceClient();
  if (!db) throw new Error("No database connected.");
  const { error } = await db
    .from("comment_reports")
    .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: actorId })
    .eq("comment_id", commentId)
    .eq("status", "open");
  if (error) throw new Error(error.message);
}

/** Pulls the author's email for the audit row, if the author still exists. */
export async function authorEmail(authorId: string | null): Promise<string | null> {
  if (!authorId) return null;
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db.from("tb_profiles").select("email").eq("id", authorId).maybeSingle();
  return data?.email ? String(data.email) : null;
}
