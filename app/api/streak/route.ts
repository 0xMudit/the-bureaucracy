import { getSessionUser } from "@/lib/auth";
import { istDateKey } from "@/lib/progress";
import { touchStreak } from "@/lib/social";

export const dynamic = "force-dynamic";

/**
 * POST /api/streak
 *
 * The device keeps the immediate streak UI. Signed-in readers also get a
 * durable copy, which is what the evening "streak at risk" push reads.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: true, persisted: false });

  try {
    const streak = await touchStreak(user.id, istDateKey());
    return Response.json({ ok: true, persisted: true, ...streak });
  } catch {
    return Response.json({ ok: false, persisted: false }, { status: 500 });
  }
}
