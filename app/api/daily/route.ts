import { revalidatePath } from "next/cache";
import { briefFromItems, BRIEF_SIZE } from "@/lib/brief";
import { freezeBrief, type FrozenBriefEntry } from "@/lib/brief-store";
import { collapseDuplicates } from "@/lib/dedupe";
import { deskSummary, normalizeDesk } from "@/lib/desk";
import { digestEmail, sendEmail } from "@/lib/digest";
import { istDateKey } from "@/lib/progress";
import { sendExpoPush, type PushMessage } from "@/lib/push";
import { listItems, serviceClient } from "@/lib/store";
import type { Desk } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SubscriberRow {
  id: string;
  email: string;
  token: string;
  desk: unknown;
}

interface TokenRow {
  token: string;
  desk: unknown;
}

function authorised(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, reason: "CRON_SECRET is not configured." }
      : { ok: true };
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}` ? { ok: true } : { ok: false, reason: "Unauthorised." };
}

function signature(desk: Desk | null): string {
  return desk ? `${desk.exam}|${desk.stage}|${desk.optional}` : "none";
}

/**
 * Run tasks with a small worker pool and a wall-clock budget. Email is the one
 * step that can outlive a serverless function, so the job stops cleanly at the
 * budget and reports what it skipped rather than dying mid-send.
 */
async function pool<T>(
  items: T[],
  size: number,
  deadline: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<number> {
  let cursor = 0;
  let skipped = 0;

  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      if (Date.now() > deadline) {
        skipped += 1;
        continue;
      }
      await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return skipped;
}

async function allSubscribers(): Promise<SubscriberRow[]> {
  const db = serviceClient();
  if (!db) return [];

  const rows: SubscriberRow[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await db
      .from("tb_subscribers")
      .select("id, email, token, desk")
      .not("confirmed_at", "is", null)
      .is("unsubscribed_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`subscribers_read_failed: ${error.message}`);
    rows.push(...((data ?? []) as SubscriberRow[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

async function allPushTokens(): Promise<TokenRow[]> {
  const db = serviceClient();
  if (!db) return [];

  const rows: TokenRow[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await db
      .from("tb_push_tokens")
      .select("token, desk")
      .eq("enabled", true)
      .range(from, from + 999);
    if (error) throw new Error(`push_tokens_read_failed: ${error.message}`);
    rows.push(...((data ?? []) as TokenRow[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

/**
 * GET /api/daily — the one scheduled job.
 *
 * Hobby plans allow two crons, once a day, so this bundles the three things
 * that must happen before 7am IST:
 *   1. freeze today's five (so `/brief/YYYY-MM-DD` outlives the wire),
 *   2. send the confirmed email digest,
 *   3. send the push for readers who opted in after their third brief.
 *
 * The 15-minute ingest stays on GitHub Actions; `/api/ingest` has a daily
 * safety-net slot in vercel.json.
 */
export async function GET(request: Request) {
  const auth = authorised(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  const db = serviceClient();
  if (!db) {
    return Response.json({ ok: false, error: "A database is required." }, { status: 503 });
  }

  const startedAt = Date.now();
  const day = istDateKey();

  try {
    const items = collapseDuplicates(await listItems());
    const urls = new Map(items.map((item) => [item.id, item.url]));

    const cache = new Map<string, FrozenBriefEntry[]>();
    const briefFor = (desk: Desk | null): FrozenBriefEntry[] => {
      const key = signature(desk);
      const hit = cache.get(key);
      if (hit) return hit;
      const entries = briefFromItems(items, desk).map((entry) => ({
        ...entry,
        url: urls.get(entry.id),
      }));
      cache.set(key, entries);
      return entries;
    };

    // Freeze the neutral brief even when no one subscribes: it is the public
    // page and the app's fallback.
    const neutral = briefFor(null);
    const archived = neutral.length >= BRIEF_SIZE;
    if (archived) {
      await freezeBrief(day, neutral).catch(() => {});
    }

    let digest = { sent: 0, failed: 0, dry: 0, skipped: 0, total: 0 };
    let push = { sent: 0, failed: 0, disabled: 0, tokens: 0, skipped: 0 };

    if (neutral.length) {
      const subscribers = await allSubscribers();
      digest.total = subscribers.length;
      const sentIds: string[] = [];
      const deadline = startedAt + 35_000;
      let noBrief = 0;

      const poolSkipped = await pool(subscribers, 4, deadline, async (row) => {
        const desk = row.desk ? normalizeDesk(row.desk as Partial<Desk>) : normalizeDesk(null);
        const entries = briefFor(desk);
        if (!entries.length) {
          noBrief += 1;
          return;
        }
        const message = digestEmail({
          day,
          entries,
          email: row.email,
          token: row.token,
          deskLabel: deskSummary(desk),
        });
        const result = await sendEmail(message);
        if (result.ok && result.dry) digest.dry += 1;
        else if (result.ok) {
          digest.sent += 1;
          sentIds.push(row.id);
        } else digest.failed += 1;
      });
      digest.skipped = poolSkipped + noBrief;

      for (let index = 0; index < sentIds.length; index += 500) {
        await db
          .from("tb_subscribers")
          .update({ last_sent_at: new Date().toISOString() })
          .in("id", sentIds.slice(index, index + 500));
      }

      const tokens = await allPushTokens();
      push.tokens = tokens.length;

      const byDesk = new Map<string, { desk: Desk; to: string[] }>();
      for (const row of tokens) {
        const desk = row.desk ? normalizeDesk(row.desk as Partial<Desk>) : normalizeDesk(null);
        const key = signature(desk);
        const bucket = byDesk.get(key) ?? { desk, to: [] };
        bucket.to.push(row.token);
        byDesk.set(key, bucket);
      }

      const messages: PushMessage[] = [];
      for (const bucket of byDesk.values()) {
        const entries = briefFor(bucket.desk);
        if (!entries.length) continue;
        const lead = entries[0];
        const body = lead.title.length > 120 ? `${lead.title.slice(0, 117)}…` : lead.title;
        for (const to of bucket.to) {
          messages.push({
            to,
            title: "Today's five · 8 min",
            body,
            data: { screen: "brief", day },
          });
        }
      }

      const chunks: PushMessage[][] = [];
      for (let index = 0; index < messages.length; index += 100) {
        chunks.push(messages.slice(index, index + 100));
      }
      if (chunks.length) {
        await pool(chunks, 4, startedAt + 52_000, async (chunk) => {
          const result = await sendExpoPush(chunk);
          push.sent += result.sent;
          push.failed += result.failed;
          push.disabled += result.disabled;
        });
        push.skipped = Math.max(0, messages.length - push.sent - push.failed);
      }
    }

    // The public page reads the frozen rows, so it can be revalidated safely.
    revalidatePath("/brief");
    revalidatePath(`/brief/${day}`);

    return Response.json({
      ok: true,
      day,
      ms: Date.now() - startedAt,
      archived,
      brief: { entries: neutral.length, first: neutral[0]?.title ?? null },
      digest,
      push,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        day,
        error: error instanceof Error ? error.message : "The daily job failed.",
        ms: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
