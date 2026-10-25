import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser } from "./auth";
import { serviceClient, storeMode, StoreError } from "./store";
import type { ReactionKind, ViewerReaction } from "./types";

const VOTER_COOKIE = "tb_voter";
const SOCIAL_FILE = path.join(process.cwd(), ".data", "social.json");
const YEAR = 60 * 60 * 24 * 365;

export interface Actor {
  key: string;
  userId: string | null;
}

interface LocalReaction {
  itemId: string;
  actorKey: string;
  userId: string | null;
  kind: Exclude<ReactionKind, null>;
  createdAt: string;
}
interface LocalSave {
  itemId: string;
  actorKey: string;
  userId: string | null;
  createdAt: string;
}
interface LocalCommentLike {
  commentId: string;
  actorKey: string;
  userId: string | null;
}
interface LocalFollow {
  followerId: string;
  followingId: string;
  createdAt: string;
}
interface LocalNotification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
}
interface LocalSocial {
  reactions: LocalReaction[];
  saves: LocalSave[];
  commentLikes: LocalCommentLike[];
  follows: LocalFollow[];
  notifications: LocalNotification[];
}

let localCache: LocalSocial | null = null;

function emptyLocal(): LocalSocial {
  return { reactions: [], saves: [], commentLikes: [], follows: [], notifications: [] };
}

async function loadLocal(): Promise<LocalSocial> {
  if (localCache) return localCache;
  try {
    const parsed = JSON.parse(await fs.readFile(SOCIAL_FILE, "utf8")) as Partial<LocalSocial>;
    localCache = { ...emptyLocal(), ...parsed };
  } catch {
    localCache = emptyLocal();
  }
  return localCache;
}

async function saveLocal(data: LocalSocial): Promise<void> {
  localCache = data;
  if (storeMode() === "readonly") {
    throw new StoreError("Reactions are disabled until the database is connected.", "readonly");
  }
  await fs.mkdir(path.dirname(SOCIAL_FILE), { recursive: true });
  await fs.writeFile(SOCIAL_FILE, JSON.stringify(data, null, 2), "utf8");
}

function dbOrNull(): SupabaseClient | null {
  return serviceClient();
}

/** The identity used by reactions and saves on a read-only page render. */
export async function viewerActor(): Promise<Actor | null> {
  const user = await getSessionUser();
  if (user) return { key: `user:${user.id}`, userId: user.id };
  const jar = await cookies();
  const anon = jar.get(VOTER_COOKIE)?.value;
  return anon ? { key: `anon:${anon}`, userId: null } : null;
}

/** The identity for a write. Creates the anonymous cookie on first action. */
export async function actorForWrite(): Promise<Actor> {
  const user = await getSessionUser();
  if (user) return { key: `user:${user.id}`, userId: user.id };

  const jar = await cookies();
  const existing = jar.get(VOTER_COOKIE)?.value;
  if (existing) return { key: `anon:${existing}`, userId: null };

  const id = crypto.randomUUID();
  jar.set(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return { key: `anon:${id}`, userId: null };
}

export async function getReactionStates(
  actor: Actor | null,
  itemIds: string[],
): Promise<Record<string, ViewerReaction>> {
  const ids = [...new Set(itemIds)].filter(Boolean);
  const empty = Object.fromEntries(
    ids.map((id) => [id, { reaction: null, saved: false, likes: 0, dislikes: 0 } satisfies ViewerReaction]),
  );
  if (!ids.length) return empty;

  const db = dbOrNull();
  if (db) {
    const [{ data: reactions }, { data: saves }, { data: mine }] = await Promise.all([
      db.from("reactions").select("item_id,kind").in("item_id", ids).limit(4000),
      db.from("saves").select("item_id").in("item_id", ids).limit(4000),
      actor
        ? db
            .from("reactions")
            .select("item_id,kind")
            .eq("actor_key", actor.key)
            .in("item_id", ids)
            .limit(500)
        : Promise.resolve({ data: [] as { item_id: string; kind: string }[] }),
    ]);

    const out: Record<string, ViewerReaction> = { ...empty };
    for (const [id, state] of Object.entries(out)) {
      state.likes = (reactions ?? []).filter((r) => r.item_id === id && r.kind === "like").length;
      state.dislikes = (reactions ?? []).filter((r) => r.item_id === id && r.kind === "dislike").length;
      state.saved = (saves ?? []).some((r) => r.item_id === id);
    }
    for (const row of mine ?? []) {
      const state = out[String(row.item_id)];
      if (state) state.reaction = row.kind === "dislike" ? "dislike" : "like";
    }
    return out;
  }

  const local = await loadLocal();
  const out: Record<string, ViewerReaction> = { ...empty };
  for (const [id, state] of Object.entries(out)) {
    const rows = local.reactions.filter((r) => r.itemId === id);
    state.likes = rows.filter((r) => r.kind === "like").length;
    state.dislikes = rows.filter((r) => r.kind === "dislike").length;
    state.reaction = actor ? (rows.find((r) => r.actorKey === actor.key)?.kind ?? null) : null;
    state.saved = Boolean(actor && local.saves.some((s) => s.itemId === id && s.actorKey === actor.key));
  }
  return out;
}

export async function toggleReaction(
  actor: Actor,
  itemId: string,
  kind: "like" | "dislike",
): Promise<{ likes: number; dislikes: number; reaction: ReactionKind }> {
  const db = dbOrNull();
  if (db) {
    const { data, error } = await db.rpc("tb_react", {
      p_item_id: itemId,
      p_actor_key: actor.key,
      p_user_id: actor.userId,
      p_kind: kind,
    });
    if (error) throw new StoreError(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new StoreError("Story not found", "not-found");
    return {
      likes: Number(row.likes ?? 0),
      dislikes: Number(row.dislikes ?? 0),
      reaction: row.my_reaction === "like" || row.my_reaction === "dislike" ? row.my_reaction : null,
    };
  }

  const local = await loadLocal();
  const existing = local.reactions.find((r) => r.itemId === itemId && r.actorKey === actor.key);
  if (existing?.kind === kind) {
    local.reactions = local.reactions.filter((r) => r !== existing);
  } else if (existing) {
    existing.kind = kind;
    existing.createdAt = new Date().toISOString();
  } else {
    local.reactions.push({
      itemId,
      actorKey: actor.key,
      userId: actor.userId,
      kind,
      createdAt: new Date().toISOString(),
    });
  }
  await saveLocal(local);
  const rows = local.reactions.filter((r) => r.itemId === itemId);
  return {
    likes: rows.filter((r) => r.kind === "like").length,
    dislikes: rows.filter((r) => r.kind === "dislike").length,
    reaction: rows.find((r) => r.actorKey === actor.key)?.kind ?? null,
  };
}

export async function toggleSave(actor: Actor, itemId: string): Promise<{ saved: boolean }> {
  const db = dbOrNull();
  if (db) {
    const { data: existing } = await db
      .from("saves")
      .select("item_id")
      .eq("item_id", itemId)
      .eq("actor_key", actor.key)
      .maybeSingle();
    if (existing) {
      const { error } = await db.from("saves").delete().eq("item_id", itemId).eq("actor_key", actor.key);
      if (error) throw new StoreError(error.message);
      return { saved: false };
    }
    const { error } = await db
      .from("saves")
      .insert({ item_id: itemId, actor_key: actor.key, user_id: actor.userId });
    if (error) throw new StoreError(error.message);
    return { saved: true };
  }

  const local = await loadLocal();
  const exists = local.saves.some((s) => s.itemId === itemId && s.actorKey === actor.key);
  if (exists) local.saves = local.saves.filter((s) => !(s.itemId === itemId && s.actorKey === actor.key));
  else local.saves.unshift({ itemId, actorKey: actor.key, userId: actor.userId, createdAt: new Date().toISOString() });
  await saveLocal(local);
  return { saved: !exists };
}

export async function getCommentLikeStates(
  actor: Actor | null,
  commentIds: string[],
): Promise<Record<string, { liked: boolean; likes: number }>> {
  const ids = [...new Set(commentIds)].filter(Boolean);
  const out = Object.fromEntries(ids.map((id) => [id, { liked: false, likes: 0 }]));
  if (!ids.length) return out;
  const db = dbOrNull();
  if (db) {
    const { data } = await db.from("comment_likes").select("comment_id,actor_key").in("comment_id", ids).limit(3000);
    for (const row of data ?? []) {
      const state = out[String(row.comment_id)];
      if (!state) continue;
      state.likes += 1;
      if (actor && row.actor_key === actor.key) state.liked = true;
    }
    return out;
  }
  const local = await loadLocal();
  for (const row of local.commentLikes.filter((r) => ids.includes(r.commentId))) {
    const state = out[row.commentId];
    if (!state) continue;
    state.likes += 1;
    if (actor && row.actorKey === actor.key) state.liked = true;
  }
  return out;
}

export async function toggleCommentLike(
  actor: Actor,
  commentId: string,
): Promise<{ liked: boolean; likes: number }> {
  const db = dbOrNull();
  if (db) {
    const { data, error } = await db.rpc("tb_toggle_comment_like", {
      p_comment_id: commentId,
      p_actor_key: actor.key,
      p_user_id: actor.userId,
    });
    if (error) throw new StoreError(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return { liked: Boolean(row?.liked), likes: Number(row?.likes ?? 0) };
  }
  const local = await loadLocal();
  const existing = local.commentLikes.find(
    (r) => r.commentId === commentId && r.actorKey === actor.key,
  );
  if (existing) local.commentLikes = local.commentLikes.filter((r) => r !== existing);
  else local.commentLikes.push({ commentId, actorKey: actor.key, userId: actor.userId });
  await saveLocal(local);
  const rows = local.commentLikes.filter((r) => r.commentId === commentId);
  return { liked: !existing, likes: rows.length };
}

export async function editComment(input: {
  commentId: string;
  userId: string;
  body: string;
}): Promise<void> {
  const body = input.body.trim();
  if (body.length < 3 || body.length > 1500) throw new StoreError("Comment must be 3–1500 characters.");
  const db = dbOrNull();
  if (db) {
    const { data: comment } = await db.from("comments").select("author_id, deleted_at").eq("id", input.commentId).maybeSingle();
    if (!comment || comment.author_id !== input.userId || comment.deleted_at) {
      throw new StoreError("You can only edit your own comment.");
    }
    const { error } = await db
      .from("comments")
      .update({ body, edited_at: new Date().toISOString() })
      .eq("id", input.commentId);
    if (error) throw new StoreError(error.message);
    return;
  }
  const local = await loadLocal();
  void local;
  throw new StoreError("Editing is disabled in local mode.");
}

export async function deleteComment(input: { commentId: string; userId: string }): Promise<{ itemId: string }> {
  const db = dbOrNull();
  if (db) {
    const { data: comment } = await db
      .from("comments")
      .select("item_id,author_id,deleted_at")
      .eq("id", input.commentId)
      .maybeSingle();
    if (!comment || comment.author_id !== input.userId || comment.deleted_at) {
      throw new StoreError("You can only delete your own comment.");
    }
    const { error } = await db
      .from("comments")
      .update({ body: "[deleted]", deleted_at: new Date().toISOString(), hidden_reason: "author" })
      .eq("id", input.commentId);
    if (error) throw new StoreError(error.message);

    const { count } = await db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("item_id", comment.item_id)
      .is("hidden_at", null)
      .is("deleted_at", null);
    await db.from("items").update({ comment_count: count ?? 0 }).eq("id", comment.item_id);
    return { itemId: String(comment.item_id) };
  }
  throw new StoreError("Deleting is disabled in local mode.");
}

export async function toggleFollow(input: {
  followerId: string;
  followingId: string;
}): Promise<{ following: boolean; followers: number }> {
  if (input.followerId === input.followingId) throw new StoreError("You cannot follow yourself.");
  const db = dbOrNull();
  if (db) {
    const { data: existing } = await db
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", input.followerId)
      .eq("following_id", input.followingId)
      .maybeSingle();
    if (existing) {
      const { error } = await db
        .from("user_follows")
        .delete()
        .eq("follower_id", input.followerId)
        .eq("following_id", input.followingId);
      if (error) throw new StoreError(error.message);
    } else {
      const { error } = await db
        .from("user_follows")
        .insert({ follower_id: input.followerId, following_id: input.followingId });
      if (error) throw new StoreError(error.message);
      await notify({
        userId: input.followingId,
        kind: "follow",
        title: "A new reader is following you",
        body: "Your comments will show up in their Following feed.",
        url: "/following",
      });
    }
    const { count } = await db
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", input.followingId);
    return { following: !existing, followers: count ?? 0 };
  }
  const local = await loadLocal();
  const exists = local.follows.some(
    (f) => f.followerId === input.followerId && f.followingId === input.followingId,
  );
  if (exists) {
    local.follows = local.follows.filter(
      (f) => !(f.followerId === input.followerId && f.followingId === input.followingId),
    );
  } else {
    local.follows.push({ ...input, createdAt: new Date().toISOString() });
  }
  await saveLocal(local);
  return {
    following: !exists,
    followers: local.follows.filter((f) => f.followingId === input.followingId).length,
  };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const db = dbOrNull();
  if (db) {
    const { data } = await db
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    return Boolean(data);
  }
  const local = await loadLocal();
  return local.follows.some((f) => f.followerId === followerId && f.followingId === followingId);
}

export async function notify(input: {
  userId: string;
  kind: "daily_brief" | "streak_at_risk" | "reply" | "comment_like" | "follow" | "location_alert" | "system";
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const db = dbOrNull();
  if (db) {
    try {
      await db.from("notifications").insert({
        user_id: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        url: input.url ?? "/",
        data: input.data ?? {},
      });
    } catch {
      // Notifications are best-effort; a failed insert must not undo the action.
    }
    return;
  }
  const local = await loadLocal();
  local.notifications.unshift({
    id: crypto.randomUUID(),
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    url: input.url ?? "/",
    readAt: null,
    createdAt: new Date().toISOString(),
  });
  await saveLocal(local);
}

export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<{ id: string; kind: string; title: string; body: string; url: string; readAt: string | null; createdAt: string }[]> {
  const db = dbOrNull();
  if (db) {
    const { data } = await db
      .from("notifications")
      .select("id,kind,title,body,url,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      kind: String(row.kind),
      title: String(row.title),
      body: String(row.body ?? ""),
      url: String(row.url ?? "/"),
      readAt: row.read_at ? String(row.read_at) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }
  const local = await loadLocal();
  return local.notifications
    .filter((n) => n.userId === userId)
    .slice(0, limit)
    .map((n) => ({ ...n }));
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const db = dbOrNull();
  if (db) {
    const { count } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return count ?? 0;
  }
  const local = await loadLocal();
  return local.notifications.filter((n) => n.userId === userId && !n.readAt).length;
}

export async function markNotificationsRead(userId: string, id?: string): Promise<void> {
  const db = dbOrNull();
  if (db) {
    let query = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId);
    if (id) query = query.eq("id", id);
    await query;
    return;
  }
  const local = await loadLocal();
  for (const n of local.notifications) {
    if (n.userId === userId && (!id || n.id === id)) n.readAt = new Date().toISOString();
  }
  await saveLocal(local);
}

export async function getNotificationPrefs(userId: string): Promise<{
  dailyBrief: boolean;
  streakAtRisk: boolean;
  replies: boolean;
  commentLikes: boolean;
  follows: boolean;
  locationAlerts: boolean;
  quietStart: string;
  quietEnd: string;
  maxPerDay: number;
}> {
  const defaults = {
    dailyBrief: true,
    streakAtRisk: true,
    replies: true,
    commentLikes: true,
    follows: true,
    locationAlerts: false,
    quietStart: "22:30",
    quietEnd: "07:00",
    maxPerDay: 2,
  };
  const db = dbOrNull();
  if (!db) return defaults;
  const { data } = await db.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return defaults;
  return {
    dailyBrief: Boolean(data.daily_brief),
    streakAtRisk: Boolean(data.streak_at_risk),
    replies: Boolean(data.replies),
    commentLikes: Boolean(data.comment_likes),
    follows: Boolean(data.follows),
    locationAlerts: Boolean(data.location_alerts),
    quietStart: String(data.quiet_start ?? "22:30").slice(0, 5),
    quietEnd: String(data.quiet_end ?? "07:00").slice(0, 5),
    maxPerDay: Number(data.max_per_day ?? 2),
  };
}

export async function touchStreak(userId: string, day: string): Promise<{ current: number; longest: number }> {
  const db = dbOrNull();
  if (db) {
    const { data } = await db.rpc("tb_touch_streak", { p_user_id: userId, p_day: day });
    const row = Array.isArray(data) ? data[0] : data;
    return { current: Number(row?.current_count ?? 0), longest: Number(row?.longest_count ?? 0) };
  }
  return { current: 0, longest: 0 };
}

export async function getStreak(userId: string): Promise<{ current: number; longest: number }> {
  const db = dbOrNull();
  if (!db) return { current: 0, longest: 0 };
  const { data } = await db.from("streaks").select("current_count,longest_count").eq("user_id", userId).maybeSingle();
  return { current: Number(data?.current_count ?? 0), longest: Number(data?.longest_count ?? 0) };
}
