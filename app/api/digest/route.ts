import { cachedItems } from "@/lib/cached";
import { briefFromItems } from "@/lib/brief";
import { SITE } from "@/lib/config";
import { quizSet } from "@/lib/quiz";
import { istDateKey, humanDate } from "@/lib/progress";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The owned return path: one message a day at 07:00 IST.
 *
 * It is a broadcast to the project's own channel, not a per-reader
 * subscription: consent needs a profile field and a `/stop` handler, and
 * neither exists yet. Until then this endpoint is safe to run in dry mode,
 * which is also the default when no bot token is configured.
 */
function authorised(request: Request): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, reason: "CRON_SECRET is not configured." }
      : { ok: true };
  }
  if (request.headers.get("authorization") === `Bearer ${secret}`) return { ok: true };
  if (new URL(request.url).searchParams.get("secret") === secret) return { ok: true };
  return { ok: false, reason: "Unauthorised." };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  const auth = authorised(request);
  if (!auth.ok) return Response.json({ ok: false, error: auth.reason }, { status: 401 });

  const url = new URL(request.url);
  const items = await cachedItems();
  const brief = briefFromItems(items, null);
  if (!brief.length) {
    return Response.json({ ok: false, error: "The wire is empty." }, { status: 503 });
  }

  const questions = quizSet(brief, 1);
  const lines = [
    `<b>Today's five · ${escapeHtml(humanDate(istDateKey()))}</b>`,
    "Five stories ranked for the syllabus. About eight minutes.",
    "",
    ...brief.map(
      (entry, index) =>
        `${index + 1}. <a href="${SITE.url}/item/${entry.id}">${escapeHtml(entry.title)}</a>\n   ${escapeHtml(entry.paperLabel)} · ${escapeHtml(entry.hook)}`,
    ),
  ];

  if (questions.length) {
    const question = questions[0];
    const owner = brief.find((entry) => entry.quiz?.pyqId === question.pyqId) ?? brief[0];
    lines.push("", `<b>One question</b>`, escapeHtml(question.prompt));
    lines.push(escapeHtml(question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")));
    lines.push(`Answer and explanation: ${SITE.url}/item/${owner.id}`);
  }

  lines.push("", `${SITE.url}/#brief`, "The wire turns at 07:00 IST. Older stories are deleted, not archived.");
  const text = lines.join("\n");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const dry = url.searchParams.get("dry") === "1" || !token || !chatId;

  if (dry) {
    return Response.json(
      { ok: true, dry: true, text, reason: token && chatId ? "dry requested" : "telegram is not configured" },
      { headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!response.ok || !body?.ok) {
      return Response.json(
        { ok: false, error: body?.description ?? `Telegram returned ${response.status}` },
        { status: 502 },
      );
    }
    return Response.json(
      { ok: true, dry: false, sent: brief.length, text },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram request failed" },
      { status: 502 },
    );
  }
}
