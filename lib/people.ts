import { normalizeAvatarConfig, type AvatarConfig } from "./avatar";
import { rowToItem } from "./rows";
import { serviceClient } from "./store";
import type { FeedItem } from "./types";

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar: AvatarConfig | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  joinedAt: string | null;
  publicSaves: boolean;
}

export interface DiscussionEntry {
  id: string;
  itemId: string;
  itemTitle: string;
  itemSource: string;
  publishedAt: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: AvatarConfig | null;
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_config: unknown;
  bio: string | null;
  follower_count: number | null;
  following_count: number | null;
  created_at: string | null;
  public_saves?: boolean | null;
};

function toProfile(row: ProfileRow): PublicProfile {
  return {
    id: String(row.id),
    name: row.display_name?.trim() || row.username || "Reader",
    username: row.username || `reader_${String(row.id).replace(/-/g, "").slice(0, 8)}`,
    avatar: normalizeAvatarConfig(row.avatar_config),
    bio: String(row.bio ?? ""),
    followerCount: Number(row.follower_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    joinedAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    publicSaves: row.public_saves !== false,
  };
}

export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db
    .from("profiles")
    .select("id,display_name,username,avatar_config,bio,follower_count,following_count,created_at,public_saves")
    .ilike("username", username)
    .eq("status", "active")
    .maybeSingle();
  return data ? toProfile(data as ProfileRow) : null;
}

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db
    .from("profiles")
    .select("id,display_name,username,avatar_config,bio,follower_count,following_count,created_at,public_saves")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  return data ? toProfile(data as ProfileRow) : null;
}

export async function listFollowingIds(userId: string): Promise<string[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db.from("user_follows").select("following_id").eq("follower_id", userId);
  return (data ?? []).map((row) => String(row.following_id));
}

export async function listFollowingProfiles(userId: string): Promise<PublicProfile[]> {
  const ids = await listFollowingIds(userId);
  if (!ids.length) return [];
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db
    .from("profiles")
    .select("id,display_name,username,avatar_config,bio,follower_count,following_count,created_at,public_saves")
    .in("id", ids)
    .eq("status", "active");
  return ((data ?? []) as ProfileRow[]).map(toProfile);
}

/** Saved stories a reader has chosen to publish on their desk (default on). */
export async function listProfileSaves(userId: string, limit = 8): Promise<FeedItem[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data: saves } = await db
    .from("saves")
    .select("item_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = [...new Set((saves ?? []).map((row) => String(row.item_id)))];
  if (!ids.length) return [];
  const { data } = await db
    .from("items")
    .select("id,title,kicker,url,source,source_url,source_tier,summary,published_at,fetched_at,topics,primary_topic,exam_score,priority,keywords,optionals,primary_optional,points,seed_points,comment_count,like_count,dislike_count,image_url,image_source,image_attribution,summary_bullets,exam_angle,gs_paper,prelims_fact,mains_angle,syllabus_hint,india_relevant,ai_relevance,ai_provider,cluster_id,archived_at")
    .in("id", ids);
  const order = new Map(ids.map((id, index) => [id, index]));
  return ((data ?? []) as Record<string, unknown>[])
    .map(rowToItem)
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export async function listSuggestedReaders(userId: string, limit = 5): Promise<PublicProfile[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db
    .from("profiles")
    .select("id,display_name,username,avatar_config,bio,follower_count,following_count,created_at")
    .eq("status", "active")
    .neq("id", userId)
    .order("follower_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  return ((data ?? []) as ProfileRow[]).map(toProfile);
}

async function hydrateDiscussions(
  rows: { id: string; item_id: string; author: string; author_id: string | null; body: string; created_at: string }[],
): Promise<DiscussionEntry[]> {
  if (!rows.length) return [];
  const db = serviceClient();
  if (!db) return [];

  const itemIds = [...new Set(rows.map((row) => String(row.item_id)))];
  const authorIds = [...new Set(rows.map((row) => row.author_id).filter((id): id is string => Boolean(id)))];
  const [{ data: items }, { data: profiles }] = await Promise.all([
    db.from("items").select("id,title,source,published_at").in("id", itemIds),
    authorIds.length
      ? db
          .from("profiles")
          .select("id,display_name,username,avatar_config")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null; avatar_config: unknown }[] }),
  ]);

  const itemMap = new Map((items ?? []).map((item) => [String(item.id), item]));
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));

  return rows.flatMap((row) => {
    const item = itemMap.get(String(row.item_id));
    if (!item) return [];
    const profile = row.author_id ? profileMap.get(String(row.author_id)) : null;
    return [
      {
        id: String(row.id),
        itemId: String(row.item_id),
        itemTitle: String(item.title),
        itemSource: String(item.source),
        publishedAt: new Date(String(item.published_at)).toISOString(),
        body: String(row.body),
        createdAt: new Date(String(row.created_at)).toISOString(),
        authorId: row.author_id ? String(row.author_id) : "",
        authorName: profile?.display_name?.trim() || String(row.author),
        authorUsername: profile?.username || "reader",
        authorAvatar: normalizeAvatarConfig(profile?.avatar_config),
      },
    ];
  });
}

export async function listFollowingDiscussions(userId: string, limit = 24): Promise<DiscussionEntry[]> {
  const ids = await listFollowingIds(userId);
  if (!ids.length) return [];
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db
    .from("comments")
    .select("id,item_id,author,author_id,body,created_at")
    .in("author_id", ids)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return hydrateDiscussions(data ?? []);
}

export async function listProfileDiscussions(userId: string, limit = 16): Promise<DiscussionEntry[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db
    .from("comments")
    .select("id,item_id,author,author_id,body,created_at")
    .eq("author_id", userId)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return hydrateDiscussions(data ?? []);
}

export async function followerCount(userId: string): Promise<number> {
  const db = serviceClient();
  if (!db) return 0;
  const { count } = await db
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}
