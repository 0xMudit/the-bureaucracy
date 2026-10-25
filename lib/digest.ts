import { SITE } from "./config";
import type { FrozenBriefEntry } from "./brief-store";

/**
 * The owned channel: one email a day, five stories, the same finish line as the
 * app. Resend is optional — without a key the cron reports a dry run instead of
 * failing, so preview and local stay honest.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}

export interface EmailResult {
  ok: boolean;
  dry?: boolean;
  id?: string;
  error?: string;
}

const ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: true, dry: true };

  const from = process.env.DIGEST_FROM ?? "The Bureaucracy <onboarding@resend.dev>";

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.unsubscribeUrl
          ? { headers: { "List-Unsubscribe": `<${message.unsubscribeUrl}>` } }
          : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, error: `resend_${response.status}: ${detail.slice(0, 200)}` };
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: payload.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "email_failed" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trim(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function dateLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, (month ?? 1) - 1, date ?? 1, 12)));
}

export function digestSubject(day: string): string {
  const [, month, date] = day.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Today's five · ${date} ${months[(month ?? 1) - 1]} · 8 minutes`;
}

export function digestEmail({
  day,
  entries,
  email,
  token,
  deskLabel,
}: {
  day: string;
  entries: FrozenBriefEntry[];
  email: string;
  token: string;
  deskLabel: string;
}): EmailMessage {
  const site = SITE.url.replace(/\/$/, "");
  const briefUrl = `${site}/brief/${day}`;
  const unsubscribeUrl = `${site}/api/subscribe?token=${encodeURIComponent(token)}&unsubscribe=1`;

  const rows = entries
    .map((entry, index) => {
      const url = entry.url ?? briefUrl;
      return `
      <tr><td style="padding:22px 0 0;border-top:1px solid #e6e0d6;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8175;">
          ${String(index + 1).padStart(2, "0")} &nbsp;·&nbsp; ${escapeHtml(entry.topicLabel)} &nbsp;·&nbsp; ${escapeHtml(entry.paperLabel)}
        </div>
        <a href="${escapeHtml(url)}" style="text-decoration:none;color:#14110f;">
          <h2 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;line-height:1.15;margin:8px 0 0;letter-spacing:-0.3px;">
            ${escapeHtml(entry.title)}
          </h2>
        </a>
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#4a443d;margin:10px 0 0;">
          ${escapeHtml(trim(entry.summary || entry.why, 300))}
        </p>
        <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#14110f;margin:10px 0 0;border-left:3px solid #ff3b30;padding-left:10px;">
          ${escapeHtml(trim(entry.hook, 220))}
        </p>
        <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:0.6px;text-transform:uppercase;color:#8a8175;margin:10px 0 0;">
          ${escapeHtml(entry.source)} · ${entry.examScore}/100 relevance
        </p>
      </td></tr>`;
    })
    .join("");

  const question = entries.find((entry) => entry.quiz)?.quiz;
  const quiz = question
    ? `<tr><td style="padding:26px 0 0;">
        <div style="background:#f6f1e8;border:1px solid #e6e0d6;padding:18px 20px;">
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8175;">One question · ${escapeHtml(question.label)}</div>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.35;color:#14110f;margin:8px 0 0;">${escapeHtml(question.prompt)}</p>
          <ol style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4a443d;margin:10px 0 0;padding-left:20px;">
            ${question.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}
          </ol>
          <a href="${escapeHtml(`${briefUrl}#quiz`)}" style="display:inline-block;margin-top:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#ff3b30;text-decoration:none;">Answer in the brief →</a>
        </div>
      </td></tr>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f5ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ef;padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e6e0d6;padding:28px;">
        <tr><td>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#8a8175;">The Bureaucracy · daily brief</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:1.05;letter-spacing:-0.8px;color:#14110f;margin:8px 0 0;">
            ${escapeHtml(dateLabel(day))}
          </h1>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#8a8175;margin-top:8px;">
            Five stories · 8 minutes · ${escapeHtml(deskLabel)}
          </div>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4a443d;margin:18px 0 0;">
            Good morning. The five stories that matter for your exam today, with the syllabus angle and one retrieval question.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
            ${quiz}
          </table>
          <div style="margin-top:26px;padding-top:18px;border-top:1px solid #e6e0d6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8175;">
            <a href="${escapeHtml(briefUrl)}" style="color:#ff3b30;text-decoration:none;">Read today's brief on the web →</a><br/>
            You asked for this daily brief as ${escapeHtml(email)}.
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8a8175;">Unsubscribe</a>.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `THE BUREAUCRACY · ${dateLabel(day)}`,
    `Five stories · 8 minutes · ${deskLabel}`,
    "",
    ...entries.flatMap((entry, index) => [
      `${index + 1}. ${entry.title}`,
      `${entry.topicLabel} · ${entry.source}`,
      trim(entry.summary || entry.why, 300),
      `Why it matters: ${trim(entry.hook, 220)}`,
      entry.url ?? briefUrl,
      "",
    ]),
    `Read the brief: ${briefUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    to: email,
    subject: digestSubject(day),
    html,
    text,
    unsubscribeUrl,
  };
}

export function confirmationEmail(email: string, confirmUrl: string): EmailMessage {
  const html = `<!doctype html><html><body style="margin:0;background:#f8f5ef;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#14110f;">
  <div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e6e0d6;padding:30px;">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#8a8175;">The Bureaucracy</div>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;letter-spacing:-0.5px;margin:8px 0 0;">One tap, then 8 minutes a day.</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a443d;margin:16px 0 0;">Confirm that ${escapeHtml(email)} should receive the daily brief: five ranked stories, the syllabus angle, and one retrieval question, every morning at 7.</p>
    <p style="margin:22px 0 0;"><a href="${escapeHtml(confirmUrl)}" style="background:#ff3b30;color:#fff;text-decoration:none;padding:12px 18px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Confirm the brief</a></p>
    <p style="font-size:12px;line-height:1.6;color:#8a8175;margin:22px 0 0;">If you did not ask for this, ignore the email and nothing will be sent.</p>
  </div>
</body></html>`;

  return {
    to: email,
    subject: "Confirm your 7am brief",
    html,
    text: `Confirm your daily brief: ${confirmUrl}\n\nIf you did not ask for this, ignore this email.`,
  };
}
