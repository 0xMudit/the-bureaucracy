import { getSessionUser } from "@/lib/auth";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ ok: true, signedIn: false, subscribed: false, state: null, district: null });
  }

  const db = serviceClient();
  if (!db) {
    return Response.json({ ok: true, signedIn: true, subscribed: false, state: null, district: null });
  }

  const [{ count }, { data: profile }] = await Promise.all([
    db
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    db.from("profiles").select("state,district").eq("id", user.id).maybeSingle(),
  ]);

  return Response.json(
    {
      ok: true,
      signedIn: true,
      subscribed: (count ?? 0) > 0,
      state: profile?.state ?? null,
      district: profile?.district ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
