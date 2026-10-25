"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, userCan } from "@/lib/auth";
import {
  authorEmail,
  dismissReports,
  moderateComment,
  reportComment,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/moderation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export interface ReportState {
  ok?: boolean;
  error?: string;
  stamp?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Any reader can flag a comment. Accounts are optional on this site, so the
 * anonymous path is keyed by the same peppered address hash the limiter uses;
 * one report per comment per person is enforced in the database.
 */
export async function reportCommentAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const commentId = String(formData.get("commentId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim();

  if (!UUID.test(commentId)) return { ok: false, error: "That comment no longer exists." };
  if (!REPORT_REASONS.includes(reason as ReportReason)) return { ok: false, error: "Pick a reason for the report." };
  if (detail.length > 300) return { ok: false, error: "Keep the note under 300 characters." };

  const user = await getSessionUser();
  const headerList = await headers();
  const key = user ? `user:${user.id}` : `anon:${clientKey(headerList)}`;

  const limit = await rateLimit(`report:${key}`, 10, 60 * 60_000);
  if (!limit.ok) {
    return { ok: false, error: `That is a lot of reports. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
  }

  const result = await reportComment({
    commentId,
    reporterId: user?.id ?? null,
    reporterKey: key,
    reason: reason as ReportReason,
    detail,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "The report could not be filed." };

  return { ok: true, stamp: Date.now() };
}

async function currentModerator() {
  const user = await getSessionUser();
  if (!user || !userCan(user, "comment.moderate")) redirect("/admin/comments?error=forbidden");
  return user;
}

async function audit(
  actor: { id: string; email: string },
  target: { id: string | null; email: string | null },
  action: string,
  detail: string,
) {
  const db = serviceClient();
  if (!db) return;
  try {
    await db.from("tb_admin_events").insert({
      actor_id: actor.id,
      actor_email: actor.email,
      target_id: target.id,
      target_email: target.email,
      action,
      detail: detail.slice(0, 500),
    });
  } catch {
    // An audit failure must not undo a successful moderation action.
  }
}

function refresh(itemId: string) {
  revalidatePath(`/item/${itemId}`);
  revalidatePath("/admin/comments");
  revalidateTag("comments", { expire: 0 });
  revalidateTag("items", { expire: 30 });
}

async function moderate(formData: FormData, action: "hide" | "restore" | "delete"): Promise<void> {
  const user = await currentModerator();
  const commentId = String(formData.get("commentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!UUID.test(commentId)) redirect("/admin/comments?error=missing");

  let itemId = "";
  let failed = false;
  try {
    const result = await moderateComment({
      commentId,
      action,
      actorId: user.id,
      reason: reason || (action === "delete" ? "removed by the desk" : undefined),
    });
    itemId = result.itemId;
    await audit(
      user,
      { id: result.authorId, email: await authorEmail(result.authorId) },
      `comment.${action}`,
      `${action} comment ${commentId} on ${result.itemId} by ${result.author}${reason ? `: ${reason}` : ""}`,
    );
  } catch {
    failed = true;
  }

  if (failed || !itemId) redirect("/admin/comments?error=failed");
  refresh(itemId);
  redirect(`/admin/comments?done=${action}`);
}

export async function hideCommentAction(formData: FormData): Promise<void> {
  await moderate(formData, "hide");
}

export async function restoreCommentAction(formData: FormData): Promise<void> {
  await moderate(formData, "restore");
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  await moderate(formData, "delete");
}

export async function dismissReportsAction(formData: FormData): Promise<void> {
  const user = await currentModerator();
  const commentId = String(formData.get("commentId") ?? "");
  if (!UUID.test(commentId)) redirect("/admin/comments?error=missing");

  let failed = false;
  try {
    await dismissReports(commentId, user.id);
    await audit(user, { id: null, email: null }, "comment.dismiss", `dismissed reports on ${commentId}`);
  } catch {
    failed = true;
  }

  if (failed) redirect("/admin/comments?error=failed");
  revalidatePath("/admin/comments");
  redirect("/admin/comments?done=dismiss");
}
