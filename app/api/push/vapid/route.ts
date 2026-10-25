export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return Response.json(
    { ok: Boolean(key), key },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
