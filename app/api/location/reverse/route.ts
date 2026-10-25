import { getSessionUser } from "@/lib/auth";
import { rateLimit, hashKey } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

interface Address {
  state?: string;
  state_district?: string;
  district?: string;
  county?: string;
  city?: string;
  town?: string;
}

/**
 * POST /api/location/reverse  { lat, lon }
 *
 * Coordinates are used exactly once, for this reverse lookup, and are never
 * written to the database. Only the state and district labels are stored, which
 * is all the product needs for local alerts and feed personalisation.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ ok: false, error: "Log in to set your state." }, { status: 401 });
  }

  const limit = await rateLimit(`geo:${hashKey(user.id)}`, 8, 60 * 60_000);
  if (!limit.ok) {
    return Response.json({ ok: false, error: "Too many location lookups. Try later." }, { status: 429 });
  }

  let body: { lat?: unknown; lon?: unknown };
  try {
    body = (await request.json()) as { lat?: unknown; lon?: unknown };
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ ok: false, error: "Those coordinates are not valid." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7_000);
  let address: Address = {};
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&lat=${lat}&lon=${lon}`,
      {
        signal: controller.signal,
        headers: {
          "user-agent": "TheBureaucracy/1.0 (+https://the-bureaucracy.vercel.app)",
          accept: "application/json",
        },
      },
    );
    if (!response.ok) throw new Error("lookup failed");
    const data = (await response.json()) as { address?: Address };
    address = data.address ?? {};
  } catch {
    return Response.json(
      { ok: false, error: "The location lookup did not answer. Choose your state manually instead." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }

  const state = (address.state ?? address.state_district ?? "").replace(/\s+District$/i, "").trim().slice(0, 60);
  const district = (address.state_district ?? address.district ?? address.county ?? address.city ?? address.town ?? "")
    .replace(/\s+District$/i, "")
    .trim()
    .slice(0, 60);

  if (!state) {
    return Response.json({ ok: false, error: "Could not resolve an Indian state from that point." }, { status: 422 });
  }

  const db = serviceClient();
  if (!db) return Response.json({ ok: false, error: "No database configured." }, { status: 503 });

  const { error } = await db
    .from("profiles")
    .update({ state, district: district || null })
    .eq("id", user.id);
  if (error) return Response.json({ ok: false, error: "Could not save your state." }, { status: 500 });

  return Response.json({ ok: true, state, district: district || null });
}
