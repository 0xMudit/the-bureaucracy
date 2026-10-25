import { randomBytes } from "node:crypto";
import { displayName, mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { istDateKey } from "@/lib/progress";
import { hashKey, rateLimit } from "@/lib/rate-limit";
import { sanitizeProgress, streakOf, todayCount } from "@/lib/reader-state";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

interface MemberRow {
  circle_id: string;
  user_id: string;
  name: string | null;
  joined_at: string;
}

function inviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * GET  /api/mobile/circles — the reader's circles, with each member's streak.
 * POST /api/mobile/circles — create one: { name }.
 *
 * Streaks are computed from `tb_reader_state`, so a friend who has not signed
 * in does not appear. There is no public leaderboard and no email exposure:
 * only a display name chosen at join time.
 */
export async function GET(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to see your study circle.");

  const db = serviceClient();
  if (!db) return mobileError(503, "Study circles are not configured.");

  try {
    const { data: mine, error: mineError } = await db
      .from("tb_circle_members")
      .select("circle_id")
      .eq("user_id", user.id);
    if (mineError) throw new Error(mineError.message);

    const ids = (mine ?? []).map((row) => row.circle_id);
    if (!ids.length) return mobileJson({ ok: true, today: istDateKey(), circles: [] });

    const [{ data: circles, error: circlesError }, { data: members, error: membersError }] =
      await Promise.all([
        db.from("tb_circles").select("id, name, owner_id, invite_code, created_at").in("id", ids),
        db.from("tb_circle_members").select("circle_id, user_id, name, joined_at").in("circle_id", ids),
      ]);
    if (circlesError) throw new Error(circlesError.message);
    if (membersError) throw new Error(membersError.message);

    const memberIds = Array.from(new Set((members ?? []).map((row) => row.user_id)));
    const { data: states, error: statesError } = memberIds.length
      ? await db.from("tb_reader_state").select("user_id, progress").in("user_id", memberIds)
      : { data: [], error: null };
    if (statesError) throw new Error(statesError.message);

    const today = istDateKey();
    const progressByUser = new Map(
      (states ?? []).map((row) => [row.user_id, sanitizeProgress(row.progress)]),
    );

    const membersByCircle = new Map<string, MemberRow[]>();
    for (const row of (members ?? []) as MemberRow[]) {
      const list = membersByCircle.get(row.circle_id) ?? [];
      list.push(row);
      membersByCircle.set(row.circle_id, list);
    }

    const payload = (circles ?? []).map((circle) => ({
      id: circle.id,
      name: circle.name,
      inviteCode: circle.invite_code,
      isOwner: circle.owner_id === user.id,
      createdAt: circle.created_at,
      members: (membersByCircle.get(circle.id) ?? [])
        .map((member) => {
          const progress = progressByUser.get(member.user_id);
          return {
            name: member.name?.trim() || "Reader",
            streak: progress ? streakOf(progress, today) : 0,
            today: progress ? todayCount(progress, today) : 0,
            isYou: member.user_id === user.id,
          };
        })
        .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name)),
    }));

    return mobileJson({ ok: true, today, circles: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your circles could not be read.";
    return mobileError(500, message);
  }
}

export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to start a study circle.");

  const limit = await rateLimit(`mobile:circle:create:${hashKey(user.id)}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many circles created. Try again later.", retryAfter: limit.retryAfter },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 60) : "";
  if (!name) return mobileError(400, "Give the circle a name.");

  const db = serviceClient();
  if (!db) return mobileError(503, "Study circles are not configured.");

  try {
    let created: { id: string; name: string; invite_code: string; created_at: string } | null = null;

    for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
      const { data, error } = await db
        .from("tb_circles")
        .insert({ name, owner_id: user.id, invite_code: inviteCode() })
        .select("id, name, invite_code, created_at")
        .single();

      if (!error && data) created = data;
      // 23505 is a unique-code collision; retry with a new code.
      else if (error && error.code !== "23505") throw new Error(error.message);
    }

    if (!created) return mobileError(500, "A circle code could not be generated. Try again.");

    const { error: memberError } = await db.from("tb_circle_members").insert({
      circle_id: created.id,
      user_id: user.id,
      name: displayName(user),
    });
    if (memberError) {
      await db.from("tb_circles").delete().eq("id", created.id);
      throw new Error(memberError.message);
    }

    return mobileJson({
      ok: true,
      circle: {
        id: created.id,
        name: created.name,
        inviteCode: created.invite_code,
        isOwner: true,
        createdAt: created.created_at,
        members: [{ name: displayName(user), streak: 0, today: 0, isYou: true }],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The circle could not be created.";
    return mobileError(500, message);
  }
}
