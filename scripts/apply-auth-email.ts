import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Pushes the branded confirmation and recovery emails, the "verified before
 * login" rule and the admin role sync to the linked Supabase project.
 *
 *   npm run auth:email -- --dry-run
 *   npm run auth:email
 *
 * Needs SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens). If it is
 * not set, the token saved by `supabase login` is used. SMTP_HOST / SMTP_PORT /
 * SMTP_USER / SMTP_PASS / SMTP_SENDER_EMAIL / SMTP_SENDER_NAME are optional and
 * keep the mail off Supabase's rate-limited built-in sender.
 */

const TEMPLATES = [
  {
    key: "confirmation",
    subject: "Confirm your desk · The Bureaucracy",
    file: "confirmation.html",
  },
  {
    key: "recovery",
    subject: "Reset your password · The Bureaucracy",
    file: "recovery.html",
  },
] as const;

const TEMPLATE_DIR = path.join(process.cwd(), "supabase", "templates");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    if (!ref) throw new Error("empty ref");
    return ref;
  } catch {
    return fail(`Could not read the project ref from ${url}.`);
  }
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function mergeAllowList(current: string | undefined, origin: string): string {
  const entries = new Set(
    (current ?? "")
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
  entries.add(origin);
  entries.add(`${origin}/auth/confirm`);
  entries.add(`${origin}/auth/reset-password`);
  entries.add(`${origin}/**`);
  return [...entries].join(",");
}

async function accessToken(): Promise<string> {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  // `supabase login` keeps its token in the user profile on most platforms.
  const candidates = [
    path.join(os.homedir(), ".supabase", "access-token"),
    path.join(os.homedir(), ".config", "supabase", "access-token"),
    path.join(process.cwd(), ".supabase", "access-token"),
  ];
  for (const candidate of candidates) {
    try {
      const value = (await fs.readFile(candidate, "utf8")).trim();
      if (value) return value;
    } catch {
      // Try the next location.
    }
  }

  return fail(
    "SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens and add it to .env.local (it is only used by this script).",
  );
}

async function api<T>(ref: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    fail(`Supabase returned ${response.status}: ${body.slice(0, 400)}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const token = await accessToken();
  const ref = projectRef();
  const origin = siteUrl();

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS);
  if (!smtpConfigured) {
    fail(
      "Custom SMTP is required to edit email templates on Supabase's free tier. Add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SENDER_EMAIL to .env.local (Resend, Postmark, SES, …), then re-run. Site URL and confirmation rules are already applied by `supabase config push`.",
    );
  }

  const loaded = await Promise.all(
    TEMPLATES.map(async (template) => {
      const file = path.join(TEMPLATE_DIR, template.file);
      const html = await fs.readFile(file, "utf8");
      if (!html.includes("{{ .TokenHash }}")) fail(`${template.file} no longer contains {{ .TokenHash }}.`);
      if (!html.includes("{{ .SiteURL }}/auth/confirm")) {
        fail(`${template.file} must link to {{ .SiteURL }}/auth/confirm.`);
      }
      return { ...template, file, html };
    }),
  );

  const current = await api<{ uri_allow_list?: string; mailer_autoconfirm?: boolean }>(ref, token);

  const payload: Record<string, unknown> = {
    // The whole point: never auto-confirm an address.
    mailer_autoconfirm: false,
    site_url: origin,
    uri_allow_list: mergeAllowList(current.uri_allow_list, origin),
  };

  for (const template of loaded) {
    payload[`mailer_subjects_${template.key}`] = template.subject;
    payload[`mailer_templates_${template.key}_content`] = template.html;
  }

  const smtp = {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    smtp_admin_email: process.env.SMTP_SENDER_EMAIL,
    smtp_sender_name: process.env.SMTP_SENDER_NAME ?? "The Bureaucracy",
  };
  for (const [key, value] of Object.entries(smtp)) {
    if (value !== undefined && value !== "") payload[key] = value;
  }

  console.log(`\n  Project   ${ref}`);
  console.log(`  Site URL  ${origin}`);
  for (const template of loaded) {
    console.log(`  Template  ${template.file} (${(template.html.length / 1024).toFixed(1)} kB)`);
  }
  console.log(`  SMTP      ${smtp.smtp_host ? `${smtp.smtp_host}:${smtp.smtp_port ?? "?"}` : "Supabase built-in sender"}`);
  console.log(`  Confirm   ${current.mailer_autoconfirm === false ? "already required" : "will be required"}`);

  if (dryRun) {
    console.log("\n  Dry run — nothing was sent to Supabase.\n");
    return;
  }

  await api(ref, token, { method: "PATCH", body: JSON.stringify(payload) });
  console.log("\n  ✓ Confirmation and recovery emails are live; login requires verification.");
  console.log("  Next: npm run auth:admins (promote ADMIN_EMAILS in the register).\n");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
