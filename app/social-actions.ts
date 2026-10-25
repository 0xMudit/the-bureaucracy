"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  actorForWrite,
  deleteComment,
  editComment,
  markNotificationsRead,
  toggleCommentLike,
  toggleFollow,
  toggleReaction,
  toggleSave,
  notify,
} from "@/lib/social";
import { canWrite, serviceClient, StoreError } from "@/lib/store";

export type ReactionResult =
  | { ok: true; liked: boolean; likes: number; dislikes: number; reaction: "like" | "dislike" | null }
  | { ok: false; error: string };

export async function reactionAction(itemId: string, kind: "like" | "dislike"): Promise<ReactionResult> {
  if (!canWrite()) return { ok: false, error: "Reactions connect once the database is configured." };
  if (!itemId || (kind !== "like" && kind !== "dislike")) return { ok: false, error: "Invalid reaction." };

  const actor = await actorForWrite();
  const headerList = await headers();
  const limit = await rateLimit(`react:${actor.userId ?? clientKey(headerList)}`, 90, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: "Easy there. Try again in a few minutes." };

  try {
    const result = await toggleReaction(actor, itemId, kind);
    revalidatePath("/");
    revalidatePath(`/item/${itemId}`);
    revalidateTag("items", { expire: 15 });
    return {
      ok: true,
      liked: result.reaction === "like",
      likes: result.likes,
      dislikes: result.dislikes,
      reaction: result.reaction,
    };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The reaction could not be recorded." };
  }
}

export async function saveAction(itemId: string): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  if (!itemId) return { ok: false, error: "Missing story." };
  try {
    const actor = await actorForWrite();
    const result = await toggleSave(actor, itemId);
    revalidatePath("/saved");
    return { ok: true, saved: result.saved };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The save could not be recorded." };
  }
}

export async function commentLikeAction(
  commentId: string,
): Promise<{ ok: true; liked: boolean; likes: number } | { ok: false; error: string }> {
  if (!canWrite()) return { ok: false, error: "Likes connect once the database is configured." };
  try {
    const actor = await actorForWrite();
    const result = await toggleCommentLike(actor, commentId);
    if (result.liked && actor.userId) {
      const db = serviceClient();
      const { data: comment } = db
        ? await db.from("comments").select("author_id,item_id").eq("id", commentId).maybeSingle()
        : { data: null };
      if (comment?.author_id && comment.author_id !== actor.userId) {
        await notify({
          userId: String(comment.author_id),
          kind: "comment_like",
          title: "Someone liked your comment",
          body: "Open the discussion to see it in context.",
          url: `/item/${comment.item_id}#discussion`,
          data: { commentId },
        });
      }
    }
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The like could not be recorded." };
  }
}

export async function editCommentAction(
  commentId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Log in to edit a comment." };
  try {
    await editComment({ commentId, userId: user.id, body });
    revalidateTag("comments", { expire: 0 });
    return { ok: true };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The comment could not be edited." };
  }
}

export async function deleteCommentAction(
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Log in to delete a comment." };
  try {
    const result = await deleteComment({ commentId, userId: user.id });
    revalidatePath(`/item/${result.itemId}`);
    revalidateTag("comments", { expire: 0 });
    revalidateTag("items", { expire: 0 });
    return { ok: true };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The comment could not be deleted." };
  }
}

export async function followAction(
  followingId: string,
): Promise<{ ok: true; following: boolean; followers: number } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Log in to follow a reader." };
  if (!followingId) return { ok: false, error: "Missing reader." };
  try {
    const result = await toggleFollow({ followerId: user.id, followingId });
    revalidatePath("/following");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The follow could not be saved." };
  }
}

export async function markNotificationsReadAction(id?: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await markNotificationsRead(user.id, id);
  revalidatePath("/notifications");
}
