import { processQueuedAiJobs } from "@/lib/enrich";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: "Unauthorised." }, { status: 401 });
  }
  try {
    const result = await processQueuedAiJobs(8);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Queue failed." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
