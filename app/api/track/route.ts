import { cookies, headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "tb_visitor";
const YEAR = 60 * 60 * 24 * 365;

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|quora link preview/i;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, max);
}

export async function POST(request: Request) {
  const headerList = await headers();
  const agent = headerList.get("user-agent") ?? "";
  if (BOT_RE.test(agent)) return Response.json({ ok: true, skipped: "bot" });

  const limit = rateLimit(`track:${clientKey(headerList)}`, 90, 60_000);
  if (!limit.ok) return Response.json({ ok: false, skipped: "rate" }, { status: 429 });

  const db = serviceClient();
  if (!db) return Response.json({ ok: true, skipped: "no-store" });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const path = clean(body?.path, 200) ?? "/";
  const referrer = clean(body?.referrer, 300);

  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    try {
      jar.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: YEAR,
      });
    } catch {
      // Read-only cookie jar: still record the visit without a stable id.
    }
  }

  const user = await getSessionUser();

  const { error } = await db.from("tb_visits").insert({
    path: path.startsWith("/") ? path : `/${path}`,
    referrer,
    visitor_id: visitorId,
    user_id: user?.id ?? null,
  });

  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true });
}
