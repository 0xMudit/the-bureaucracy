import { randomBytes } from "node:crypto";
import { SITE } from "@/lib/config";
import { confirmationEmail, sendEmail } from "@/lib/digest";
import { normalizeDesk } from "@/lib/desk";
import { clientKey, hashKey, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/store";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${title} · ${SITE.name}</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8f5ef;color:#14110f;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:24px}
  main{max-width:520px;width:100%;background:#fffdf9;border:1px solid #e6e0d6;padding:36px}
  .kicker{font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.6px;text-transform:uppercase;color:#8a8175}
  h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:32px;line-height:1.1;letter-spacing:-.6px;margin:10px 0 0}
  p{color:#4a443d;margin:14px 0 0}
  a{color:#ff3b30}
  .rule{height:3px;background:#14110f;margin:22px 0 0;border-bottom:1px solid #14110f;padding-bottom:2px}
</style></head><body><main>
<div class="kicker">The Bureaucracy</div>
<h1>${title}</h1>
<div class="rule"></div>
${body}
</main></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    },
  );
}

/**
 * POST /api/subscribe  { email, desk? }  — request a daily brief (double opt-in)
 * GET  /api/subscribe?token=…            — confirm
 * GET  /api/subscribe?token=…&unsubscribe=1 — unsubscribe
 *
 * The digest is the only marketing surface in the product, so it is explicit,
 * single-purpose and one click to leave.
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`subscribe:${hashKey(clientKey(request.headers))}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "cache-control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const desk = raw.desk && typeof raw.desk === "object" ? normalizeDesk(raw.desk as never) : null;
  const db = serviceClient();
  if (!db) {
    return Response.json({ ok: false, error: "Subscriptions are not configured." }, { status: 503 });
  }

  const { data: existing, error: readError } = await db
    .from("tb_subscribers")
    .select("id, token, confirmed_at, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    return Response.json({ ok: false, error: "The subscription could not be checked." }, { status: 500 });
  }

  if (existing?.confirmed_at && !existing.unsubscribed_at) {
    return Response.json({ ok: true, already: true });
  }

  const token = existing?.token ?? randomBytes(24).toString("base64url");
  const row = {
    email,
    token,
    desk,
    confirmed_at: existing?.confirmed_at ?? null,
    unsubscribed_at: null,
  };

  const { error } = existing
    ? await db.from("tb_subscribers").update(row).eq("id", existing.id)
    : await db.from("tb_subscribers").insert(row);

  if (error) {
    return Response.json({ ok: false, error: "The subscription could not be saved." }, { status: 500 });
  }

  const site = SITE.url.replace(/\/$/, "");
  const confirmUrl = `${site}/api/subscribe?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail(confirmationEmail(email, confirmUrl));

  if (!sent.ok) {
    return Response.json(
      { ok: false, error: "The confirmation email could not be sent. Try again shortly." },
      { status: 502 },
    );
  }

  // A dry run has no inbox to check, so hand the link back to the caller.
  return Response.json({ ok: true, pending: true, ...(sent.dry ? { confirmUrl } : {}) });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = (params.get("token") ?? "").trim();
  if (!token || token.length > 120) {
    return page("That link is incomplete", "<p>It is missing its confirmation token. Request the brief again from the app or the site.</p>", 400);
  }

  const db = serviceClient();
  if (!db) return page("Not configured", "<p>Subscriptions are not configured on this deployment.</p>", 503);

  const { data, error } = await db
    .from("tb_subscribers")
    .select("id, email, confirmed_at, unsubscribed_at")
    .eq("token", token)
    .maybeSingle();

  if (error) return page("Something went wrong", "<p>The subscription could not be read. Try the link again.</p>", 500);
  if (!data) return page("That link has expired", "<p>Request a fresh confirmation from the app or the site.</p>", 404);

  if (params.get("unsubscribe") === "1") {
    await db.from("tb_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", data.id);
    return page(
      "You are unsubscribed",
      `<p>No more morning briefs will be sent to ${data.email.replace(/</g, "&lt;")}.</p>
       <p>The wire itself is still free, with no account and no email: <a href="${SITE.url}">${SITE.url.replace(/^https?:\/\//, "")}</a>.</p>`,
    );
  }

  const { error: updateError } = await db
    .from("tb_subscribers")
    .update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null })
    .eq("id", data.id);

  if (updateError) return page("Something went wrong", "<p>The confirmation could not be saved. Try again.</p>", 500);

  return page(
    "You are in",
    `<p>The next brief arrives tomorrow at 7am IST with five stories, the syllabus angle, and one question.</p>
     <p>Until then, today's is already on the wire: <a href="${SITE.url}/brief">read the brief →</a></p>`,
  );
}
