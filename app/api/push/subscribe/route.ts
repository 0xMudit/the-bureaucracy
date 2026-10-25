import { getSessionUser } from "@/lib/auth";
import { rateLimit, hashKey } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

interface SubscriptionBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/**
 * POST /api/push/subscribe
 *
 * The endpoint is the browser push service URL, not an email address. It is
 * unique per install, so re-subscribing updates the keys instead of creating a
 * duplicate row.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Log in to enable push on this browser." },
      { status: 401 },
    );
  }

  const limit = await rateLimit(`push:${hashKey(user.id)}`, 12, 60 * 60_000);
  if (!limit.ok) {
    return Response.json({ ok: false, error: "Too many attempts. Try later." }, { status: 429 });
  }

  let body: SubscriptionBody;
  try {
    body = (await request.json()) as SubscriptionBody;
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 });
  }

  const endpoint = String(body.endpoint ?? "").trim();
  const p256dh = String(body.keys?.p256dh ?? "").trim();
  const auth = String(body.keys?.auth ?? "").trim();
  if (!endpoint.startsWith("https://") || endpoint.length > 1200 || !p256dh || !auth) {
    return Response.json({ ok: false, error: "That subscription is not valid." }, { status: 400 });
  }

  const db = serviceClient();
  if (!db) return Response.json({ ok: false, error: "No database configured." }, { status: 503 });

  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: p256dh.slice(0, 500),
      auth: auth.slice(0, 500),
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    return Response.json({ ok: false, error: "Could not save the subscription." }, { status: 500 });
  }

  // A reader who subscribes is opting in; make sure the master preference is on.
  await db
    .from("notification_prefs")
    .upsert({ user_id: user.id, daily_brief: true, updated_at: new Date().toISOString() }, { onConflict: "user_id", ignoreDuplicates: true });

  return Response.json({ ok: true, subscribed: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });

  let endpoint = "";
  try {
    endpoint = String(((await request.json()) as { endpoint?: string }).endpoint ?? "").trim();
  } catch {
    endpoint = "";
  }
  if (!endpoint) return Response.json({ ok: false, error: "Missing endpoint." }, { status: 400 });

  const db = serviceClient();
  if (!db) return Response.json({ ok: false, error: "No database configured." }, { status: 503 });

  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return Response.json({ ok: true, subscribed: false });
}
