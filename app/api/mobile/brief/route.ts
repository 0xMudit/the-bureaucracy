import { briefFromItems, BRIEF_MINUTES, BRIEF_SIZE } from "@/lib/brief";
import { freezeBrief } from "@/lib/brief-store";
import { cachedItems } from "@/lib/cached";
import { deskFromSearch } from "@/lib/desk";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { istDateKey } from "@/lib/progress";
import { quizSet } from "@/lib/quiz";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * GET /api/mobile/brief?exam=upsc&stage=prelims&optional=psir
 *
 * Today's five, frozen on first sight. The client stores the entries locally as
 * well, so marking one read survives an app restart even before signing in.
 * The single retrieval question is included with its answer: this is a study
 * tool, not an exam.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const desk = deskFromSearch(params);

  try {
    const items = await cachedItems();
    const entries = briefFromItems(items, desk);
    const urls = new Map(items.map((item) => [item.id, item.url]));
    const withUrls = entries.map((entry) => ({ ...entry, url: urls.get(entry.id) }));

    const dateKey = istDateKey();
    if (entries.length >= BRIEF_SIZE) {
      await freezeBrief(dateKey, withUrls).catch(() => {
        // Persisting the archive is best-effort; the reader still gets a brief.
      });
    }

    return mobileJson({
      ok: true,
      dateKey,
      minutes: BRIEF_MINUTES,
      size: BRIEF_SIZE,
      desk,
      entries: withUrls,
      questions: quizSet(entries, 1),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The brief could not be built.";
    return mobileError(500, message);
  }
}
