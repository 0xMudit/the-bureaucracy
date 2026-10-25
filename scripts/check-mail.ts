import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { promises as dns } from "node:dns";
import net from "node:net";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Pre-flight check for transactional mail.
 *
 *   npm run auth:smtp
 *
 * Sign-up is confirmation-only, so a broken sender means nobody can log in.
 * This checks the parts that are easy to get wrong: SPF, DKIM, DMARC, the MX
 * record, TCP reachability to the SMTP host, and whether the linked Supabase
 * project is actually using custom SMTP. It never prints a password and never
 * writes anything.
 */

interface Check {
  ok: boolean;
  label: string;
  detail: string;
  fatal: boolean;
}

const checks: Check[] = [];

function pass(label: string, detail = "") {
  checks.push({ ok: true, label, detail, fatal: false });
}

function fail(label: string, detail = "") {
  checks.push({ ok: false, label, detail, fatal: true });
}

function skip(label: string, detail = "") {
  checks.push({ ok: false, label, detail, fatal: false });
}

const PROVIDERS: Record<string, { name: string; spf: string; selector: string }> = {
  "smtp.resend.com": { name: "Resend", spf: "_spf.resend.com", selector: "resend" },
  "smtp.postmarkapp.com": { name: "Postmark", spf: "spf.mtasv.net", selector: "pm" },
  "smtp.sendgrid.net": { name: "SendGrid", spf: "sendgrid.net", selector: "s1" },
  "smtp.mailgun.org": { name: "Mailgun", spf: "mailgun.org", selector: "k1" },
  "smtp.eu.mailgun.org": { name: "Mailgun (EU)", spf: "mailgun.org", selector: "k1" },
  "smtp-relay.brevo.com": { name: "Brevo", spf: "spf.brevo.com", selector: "mail" },
  "smtp.zoho.in": { name: "Zoho", spf: "zoho.in", selector: "zoho" },
};

function providerFor(host: string) {
  if (PROVIDERS[host]) return PROVIDERS[host];
  if (host.includes("amazonaws.com")) {
    return { name: "Amazon SES", spf: "amazonses.com", selector: "<selector from the SES console>" };
  }
  return null;
}

function senderDomain(): string | null {
  const address = process.env.SMTP_SENDER_EMAIL ?? process.env.MAIL_FROM;
  if (!address) return null;
  const match = address.match(/@([^>\s]+)/);
  if (!match) return null;
  return match[1].toLowerCase();
}

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((parts) => parts.join(""));
  } catch {
    return [];
  }
}

async function tokenFromDisk(): Promise<string | null> {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;
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
      // Next location.
    }
  }
  return null;
}

function projectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

async function tcpReachable(host: string, port: number): Promise<string> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (message: string) => {
      socket.destroy();
      resolve(message);
    };
    socket.setTimeout(6000);
    socket.once("connect", () => done("connected"));
    socket.once("timeout", () => done("timed out"));
    socket.once("error", (error) => done(error.message));
  });
}

async function main() {
  console.log("\n  The Bureaucracy - mail pre-flight\n");

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS;
  const domain = senderDomain();
  const provider = host ? providerFor(host) : null;

  if (!host) fail("SMTP_HOST is missing", "Add it to .env.local and to Vercel.");
  else pass("SMTP host configured", host);
  if (!user) fail("SMTP_USER is missing");
  else pass("SMTP user configured", user);
  if (!password) fail("SMTP_PASS is missing");
  else pass("SMTP password set", `(${password.length} characters)`);
  if (!domain) fail("SMTP_SENDER_EMAIL is missing", "Use an address on a domain you control.");
  if (provider) pass("Provider recognised", provider.name);
  else skip("Provider not recognised", "SPF/DKIM names below are generic; use your provider's own values.");

  if (!domain) {
    report();
    return;
  }

  const [mx, rootTxt, dmarc] = await Promise.all([
    dns.resolveMx(domain).catch(() => []),
    txt(domain),
    txt(`_dmarc.${domain}`),
  ]);

  if (mx.length) pass("MX record", mx.map((entry) => entry.exchange).join(", "));
  else skip("No MX record", "Replies will bounce. Add your provider's inbound MX (or accept a no-reply address).");

  const spf = rootTxt.find((record) => /^v=spf1\b/i.test(record.trim()));
  if (!spf) {
    fail("No SPF record", `Add TXT @ "v=spf1 include:${provider?.spf ?? "<your provider>"} ~all"`);
  } else if (provider && !spf.includes(provider.spf) && !spf.includes("include:")) {
    fail("SPF does not include the provider", `Add include:${provider.spf} to: ${spf}`);
  } else if (provider && !spf.includes(provider.spf)) {
    skip("SPF exists but does not name the provider", `Expected include:${provider.spf} in: ${spf}`);
  } else {
    pass("SPF record", spf);
  }
  if (spf && (spf.match(/include:/g)?.length ?? 0) > 8) {
    skip("SPF has many includes", "More than 8 DNS lookups will fail SPF. Consolidate.");
  }

  const dmarcRecord = dmarc.find((record) => /^v=DMARC1\b/i.test(record.trim()));
  if (!dmarcRecord) {
    fail("No DMARC record", `Add TXT _dmarc.${domain} "v=DMARC1; p=none; rua=mailto:${process.env.SMTP_SENDER_EMAIL}"`);
  } else {
    const policy = dmarcRecord.match(/p=(none|quarantine|reject)/i)?.[1] ?? "missing";
    if (policy === "none") skip("DMARC present but p=none", `${dmarcRecord} - tighten to quarantine once reports look clean.`);
    else pass("DMARC record", `${policy}: ${dmarcRecord}`);
  }

  const selector = process.env.SMTP_DKIM_SELECTOR ?? provider?.selector;
  if (!selector || selector.includes("<")) {
    skip("DKIM selector unknown", "Set SMTP_DKIM_SELECTOR to the selector shown by your provider.");
  } else {
    const dkim = await txt(`${selector}._domainkey.${domain}`);
    const record = dkim.find((value) => /v=DKIM1|k=rsa|p=/i.test(value));
    if (record) pass("DKIM record", `${selector}._domainkey.${domain}`);
    else fail("DKIM record missing", `Add the TXT record ${selector}._domainkey.${domain} from your provider.`);
  }

  if (host) {
    const reachable = await tcpReachable(host, port);
    if (reachable === "connected") pass("SMTP reachable", `${host}:${port}`);
    else fail("SMTP unreachable", `${host}:${port} - ${reachable}. Some hosts block 25/587; try 465.`);
  }

  const ref = projectRef();
  const token = await tokenFromDisk();
  if (!ref || !token) {
    skip("Supabase mail state unknown", "No Management API token; run `npm run auth:doctor` after deploying.");
  } else {
    try {
      const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const auth = (await response.json()) as { smtp_host?: string | null; mailer_autoconfirm?: boolean };
      if (auth.smtp_host) pass("Supabase is using custom SMTP", auth.smtp_host);
      else fail("Supabase is still on the built-in sender", "Run `npm run auth:email` once the records above verify.");
      if (auth.mailer_autoconfirm === false) pass("Email confirmation required", "sign-up cannot bypass verification");
      else fail("mailer_autoconfirm is not false", "New accounts could sign in without confirming.");
    } catch (error) {
      skip("Could not read Supabase auth config", error instanceof Error ? error.message : String(error));
    }
  }

  report();
}

function report() {
  console.log("");
  for (const check of checks) {
    const mark = check.ok ? "PASS" : check.fatal ? "FAIL" : "SKIP";
    console.log(`  ${mark.padEnd(4)} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
  }
  const failures = checks.filter((check) => check.fatal && !check.ok);
  console.log("");
  if (failures.length) {
    console.log(`  ${failures.length} blocking issue(s). Sign-up email will not be trustworthy until these pass.\n`);
    process.exit(1);
  }
  console.log("  Mail path looks healthy.\n");
}

main().catch((error) => {
  console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
