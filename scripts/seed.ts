import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchAllFeeds, ensureUniqueIds } from "../lib/ingest";
import { itemToRow } from "../lib/rows";
import { NEWS_WINDOW_MS } from "../lib/config";
import type { FeedItem } from "../lib/types";

interface LocalStore {
  version: 1;
  items: FeedItem[];
  votes: { itemId: string; voterId: string }[];
  comments: unknown[];
}

const args = new Set(process.argv.slice(2));
const fileOnly = args.has("--file-only");
const dbOnly = args.has("--db-only");

async function readLocal(): Promise<LocalStore | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".data", "store.json"), "utf8");
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      version: 1,
      items: parsed.items ?? [],
      votes: parsed.votes ?? [],
      comments: parsed.comments ?? [],
    };
  } catch {
    return null;
  }
}

async function writeSeedFile(items: FeedItem[]): Promise<void> {
  const target = path.join(process.cwd(), "data", "seed.json");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`  seed file   ${path.relative(process.cwd(), target)} (${items.length} items)`);
}

async function mergeLocal(items: FeedItem[]): Promise<void> {
  const existing = await readLocal();
  const byId = new Map((existing?.items ?? []).map((item) => [item.id, item]));
  const merged = items.map((item) => {
    const old = byId.get(item.id);
    return old
      ? { ...item, points: old.points, seedPoints: item.seedPoints, commentCount: old.commentCount }
      : item;
  });
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const pruned = merged.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  const validIds = new Set(pruned.map((item) => item.id));
  const votes = (existing?.votes ?? []).filter((vote) => validIds.has(vote.itemId));
  const comments = (existing?.comments ?? []).filter(
    (comment) => validIds.has((comment as { itemId?: string }).itemId ?? ""),
  );

  const target = path.join(process.cwd(), ".data", "store.json");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(
    target,
    JSON.stringify({ version: 1, items: pruned, votes, comments }, null, 2),
    "utf8",
  );
  console.log(`  local store ${path.relative(process.cwd(), target)} (${pruned.length} items)`);
}

async function pushToSupabase(items: FeedItem[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  database    skipped (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set)");
    return;
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = items.map(itemToRow);
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db.from("items").upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    written += chunk.length;
  }

  const cutoff = new Date(Date.now() - NEWS_WINDOW_MS).toISOString();
  const { error: pruneError, count } = await db
    .from("items")
    .delete({ count: "exact" })
    .lt("published_at", cutoff);
  if (pruneError) throw new Error(`Supabase prune failed: ${pruneError.message}`);

  console.log(`  database    ${written} upserted, ${count ?? 0} pruned (24h window)`);
}

async function main() {
  console.log("The Bureaucracy · wire seed");
  const started = Date.now();
  const result = await fetchAllFeeds(new Date());
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const items = ensureUniqueIds(result.items).filter(
    (item) => new Date(item.publishedAt).getTime() >= cutoff,
  );

  console.log(`  fetched     ${result.fetched} raw items from ${result.fetched ? "the wire" : "no feeds"}`);
  console.log(`  kept        ${items.length} unique items in the last 24 hours`);
  if (result.errors.length) {
    for (const error of result.errors) console.log(`  feed error  ${error.source}: ${error.message}`);
  }

  if (!dbOnly) await writeSeedFile(items);
  if (!fileOnly) {
    await mergeLocal(items);
    await pushToSupabase(items);
  }

  console.log(`  done        ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const optional = items.filter((item) => item.optionals.length > 0);
  const byOptional = new Map<string, number>();
  for (const item of optional) {
    for (const id of item.optionals) byOptional.set(id, (byOptional.get(id) ?? 0) + 1);
  }
  console.log(
    `  optionals   ${[...byOptional.entries()].map(([id, count]) => `${id}:${count}`).join(" ") || "none tagged"}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
