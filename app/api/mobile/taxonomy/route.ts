import { NEWS_WINDOW_HOURS, NEWS_WINDOW_MS } from "@/lib/config";
import { SORT_COPY, SORT_ORDER } from "@/lib/feed-copy";
import { mobileJson, preflight, taxonomyPayload } from "@/lib/mobile";

/**
 * The taxonomy is compiled into the build, so this response is safe to cache
 * hard on the CDN and on the device.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export const OPTIONS = preflight;

/**
 * GET /api/mobile/taxonomy
 *
 * Papers, themes and optional lenses with their rationales, answer hooks and
 * cues — everything the "why it matters" panel and the syllabus screen need.
 * The classifier's keyword lists are deliberately not included.
 */
export async function GET() {
  return mobileJson(
    {
      ok: true,
      windowHours: NEWS_WINDOW_HOURS,
      windowMs: NEWS_WINDOW_MS,
      sorts: SORT_ORDER.map((id) => ({ id, ...SORT_COPY[id] })),
      ...taxonomyPayload(),
    },
    200,
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
}
