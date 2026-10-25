import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Comment, FeedItem } from "./types";
import seed from "@/data/seed.json";
import { itemToRow, rowToComment, rowToItem } from "./rows";

export type StoreMode = "supabase" | "local" | "readonly";

export class StoreError extends Error {
  code: "readonly" | "not-found" | "duplicate" | "db";
  constructor(message: string, code: StoreError["code"] = "db") {
    super(message);
    this.code = code;
  }
}

interface LocalData {
  version: 1;
  items: FeedItem[];
  votes: { itemId: string; voterId: string }[];
  comments: Comment[];
}

const SEED_ITEMS = seed as FeedItem[];
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let client: SupabaseClient | null | undefined;
let localCache: LocalData | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"),
  );
}

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!supabaseConfigured()) {
    client = null;
    return null;
  }
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

/** Service-role client for auth profiles, analytics and moderation. */
export function serviceClient(): SupabaseClient | null {
  return getClient();
}

export function storeMode(): StoreMode {
  if (supabaseConfigured()) return "supabase";
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return "readonly";
  return "local";
}

export function canWrite(): boolean {
  return storeMode() !== "readonly";
}

/* ------------------------------- local store ------------------------------ */

async function loadLocal(): Promise<LocalData> {
  if (localCache) return localCache;
  if (storeMode() === "readonly") {
    localCache = { version: 1, items: SEED_ITEMS, votes: [], comments: [] };
    return localCache;
  }
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as LocalData;
    localCache = { version: 1, items: parsed.items ?? [], votes: parsed.votes ?? [], comments: parsed.comments ?? [] };
  } catch {
    localCache = { version: 1, items: SEED_ITEMS, votes: [], comments: [] };
  }
  return localCache;
}

async function saveLocal(data: LocalData): Promise<void> {
  localCache = data;
  if (storeMode() === "readonly") throw new StoreError("This deployment is read-only. Connect Supabase to enable reactions and comments.", "readonly");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/* -------------------------------- mapping -------------------------------- */

/* --------------------------------- reading -------------------------------- */

export async function listItems(): Promise<FeedItem[]> {
  const db = getClient();
  if (db) {
    const { data, error } = await db
      .from("items")
      .select(
        "id,title,kicker,url,source,source_url,source_tier,summary,published_at,fetched_at,topics,primary_topic,exam_score,priority,keywords,optionals,primary_optional,points,seed_points,comment_count,like_count,dislike_count,save_count,image_url,image_source,image_attribution,summary_bullets,exam_angle,gs_paper,prelims_fact,mains_angle,syllabus_hint,india_relevant,ai_relevance,ai_provider,pinned,hidden,cluster_id,archived_at",
      )
      .gte("published_at", new Date(Date.now() - 26 * 3_600_000).toISOString())
      .is("archived_at", null)
      .eq("hidden", false)
      .order("published_at", { ascending: false })
      .limit(600);
    if (error) throw new StoreError(error.message);
    return (data ?? []).map(rowToItem);
  }
  return (await loadLocal()).items.filter((item) => !item.archivedAt && !item.hidden);
}

/**
 * Archive search: every story that has left the 24-hour wire, newest first.
 * The wire itself never reads this path, so the front page stays finite.
 */
export async function listArchived(options: {
  limit?: number;
  topic?: string;
  paper?: string;
  q?: string;
  from?: string;
  to?: string;
} = {}): Promise<FeedItem[]> {
  const limit = Math.min(200, Math.max(1, options.limit ?? 60));
  const db = getClient();
  if (db) {
    let query = db
      .from("items")
      .select(
        "id,title,kicker,url,source,source_url,source_tier,summary,published_at,fetched_at,topics,primary_topic,exam_score,priority,keywords,optionals,primary_optional,points,seed_points,comment_count,like_count,dislike_count,save_count,image_url,image_source,image_attribution,summary_bullets,exam_angle,gs_paper,prelims_fact,mains_angle,syllabus_hint,india_relevant,ai_relevance,ai_provider,pinned,hidden,cluster_id,archived_at",
      )
      .not("archived_at", "is", null)
      .eq("hidden", false)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (options.topic && options.topic !== "all") query = query.contains("topics", [options.topic]);
    if (options.from) query = query.gte("published_at", options.from);
    if (options.to) query = query.lte("published_at", options.to);
    if (options.q) {
      const term = options.q.replace(/[%,()]/g, " ").trim().slice(0, 80);
      if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) throw new StoreError(error.message);
    return (data ?? []).map(rowToItem);
  }

  const local = await loadLocal();
  const term = options.q?.trim().toLowerCase();
  return local.items
    .filter((item) => Boolean(item.archivedAt) && !item.hidden)
    .filter((item) => (options.topic && options.topic !== "all" ? item.topics.includes(options.topic as FeedItem["topics"][number]) : true))
    .filter((item) => (term ? `${item.title} ${item.summary}`.toLowerCase().includes(term) : true))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

export async function getItem(id: string): Promise<FeedItem | null> {
  const db = getClient();
  if (db) {
    const { data, error } = await db.from("items").select("*").eq("id", id).maybeSingle();
    if (error) throw new StoreError(error.message);
    return data ? rowToItem(data) : null;
  }
  return (await loadLocal()).items.find((i) => i.id === id) ?? null;
}

export async function applyItemIntel(
  id: string,
  patch: Partial<FeedItem>,
): Promise<void> {
  const db = getClient();
  if (db) {
    const row: Record<string, unknown> = {};
    if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
    if (patch.imageSource !== undefined) row.image_source = patch.imageSource;
    if (patch.imageAttribution !== undefined) row.image_attribution = patch.imageAttribution;
    if (patch.summaryBullets !== undefined) row.summary_bullets = patch.summaryBullets;
    if (patch.examAngle !== undefined) row.exam_angle = patch.examAngle;
    if (patch.gsPaper !== undefined) row.gs_paper = patch.gsPaper;
    if (patch.prelimsFact !== undefined) row.prelims_fact = patch.prelimsFact;
    if (patch.mainsAngle !== undefined) row.mains_angle = patch.mainsAngle;
    if (patch.syllabusHint !== undefined) row.syllabus_hint = patch.syllabusHint;
    if (patch.indiaRelevant !== undefined) row.india_relevant = patch.indiaRelevant;
    if (patch.aiRelevance !== undefined) row.ai_relevance = patch.aiRelevance;
    if (patch.aiProvider !== undefined) row.ai_provider = patch.aiProvider;
    if (patch.primaryTopic !== undefined) row.primary_topic = patch.primaryTopic;
    if (patch.topics !== undefined) row.topics = patch.topics;
    if (patch.examScore !== undefined) row.exam_score = patch.examScore;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.clusterId !== undefined) row.cluster_id = patch.clusterId;
    if (patch.url !== undefined) row.url = patch.url;
    if (!Object.keys(row).length) return;
    const { error } = await db.from("items").update(row).eq("id", id);
    if (error) throw new StoreError(error.message);
    return;
  }
  const data = await loadLocal();
  const item = data.items.find((entry) => entry.id === id);
  if (item) Object.assign(item, patch);
  if (storeMode() !== "readonly") await saveLocal(data);
}

export async function listComments(itemId: string): Promise<Comment[]> {
  const db = getClient();
  if (db) {
    const { data, error } = await db
      .from("comments")
      .select("*")
      .eq("item_id", itemId)
      .is("hidden_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new StoreError(error.message);
    return (data ?? []).map(rowToComment);
  }
  return (await loadLocal()).comments.filter((c) => c.itemId === itemId);
}

/* --------------------------------- writing -------------------------------- */

export async function upsertItems(items: FeedItem[]): Promise<{ inserted: number; updated: number }> {
  if (!items.length) return { inserted: 0, updated: 0 };
  const db = getClient();

  if (db) {
    const ids = items.map((i) => i.id);
    const { data: existing, error: findError } = await db.from("items").select("id").in("id", ids);
    if (findError) throw new StoreError(findError.message);
    const existingIds = new Set((existing ?? []).map((r) => String(r.id)));

    // One bulk upsert. points and comment_count are deliberately omitted so
    // community state is never reset by a news refresh.
    const { error } = await db.from("items").upsert(items.map(itemToRow), { onConflict: "id" });
    if (error) throw new StoreError(error.message);

    return {
      inserted: items.filter((i) => !existingIds.has(i.id)).length,
      updated: items.filter((i) => existingIds.has(i.id)).length,
    };
  }

  const data = await loadLocal();
  const map = new Map(data.items.map((i) => [i.id, i]));
  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    if (map.has(item.id)) {
      const old = map.get(item.id)!;
      map.set(item.id, { ...item, points: old.points, seedPoints: old.seedPoints, commentCount: old.commentCount });
      updated++;
    } else {
      map.set(item.id, item);
      inserted++;
    }
  }
  await saveLocal({ ...data, items: [...map.values()] });
  return { inserted, updated };
}

export async function pruneOlderThan(cutoffIso: string): Promise<number> {
  const db = getClient();
  if (db) {
    // tb_prune removes expired stories and also applies telemetry retention
    // (visits, login events, limiter rows) in the same round trip.
    const { data, error } = await db.rpc("tb_prune", { cutoff: cutoffIso });
    if (error) throw new StoreError(error.message);
    return Number(data ?? 0);
  }
  const data = await loadLocal();
  const before = data.items.length;
  const items = data.items.filter((i) => new Date(i.publishedAt).getTime() >= new Date(cutoffIso).getTime());
  if (storeMode() === "readonly") return before - items.length;
  if (items.length !== before) await saveLocal({ ...data, items });
  return before - items.length;
}

export async function addComment(input: {
  itemId: string;
  parentId?: string | null;
  author: string;
  body: string;
  authorId?: string | null;
}): Promise<Comment> {
  const db = getClient();
  if (db) {
    const { data, error } = await db.rpc("tb_add_comment", {
      p_item_id: input.itemId,
      p_parent_id: input.parentId ?? null,
      p_author: input.author,
      p_body: input.body,
      p_author_id: input.authorId ?? null,
    });
    if (error) throw new StoreError(error.message);
    const id = typeof data === "string" ? data : Array.isArray(data) ? String(data[0]) : null;
    if (!id) throw new StoreError("Comment could not be saved");
    const { data: row, error: readError } = await db.from("comments").select("*").eq("id", id).single();
    if (readError) throw new StoreError(readError.message);
    return rowToComment(row);
  }

  const data = await loadLocal();
  const item = data.items.find((i) => i.id === input.itemId);
  if (!item) throw new StoreError("Item not found", "not-found");
  const comment: Comment = {
    id: crypto.randomUUID(),
    itemId: input.itemId,
    parentId: input.parentId ?? null,
    author: input.author,
    authorId: input.authorId ?? null,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  item.commentCount += 1;
  data.comments.push(comment);
  await saveLocal(data);
  return comment;
}

export async function itemExistsByUrl(url: string): Promise<FeedItem | null> {
  const db = getClient();
  if (db) {
    const { data, error } = await db.from("items").select("*").eq("url", url).maybeSingle();
    if (error) throw new StoreError(error.message);
    return data ? rowToItem(data) : null;
  }
  return (await loadLocal()).items.find((i) => i.url === url) ?? null;
}

export async function countItems(): Promise<number> {
  const db = getClient();
  if (db) {
    const { count, error } = await db.from("items").select("id", { count: "exact", head: true });
    if (error) throw new StoreError(error.message);
    return count ?? 0;
  }
  return (await loadLocal()).items.length;
}
