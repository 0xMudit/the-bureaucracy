import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { adminEmails } from "./lib/admins";

/**
 * Read-only end-to-end check of the account system.
 *
 *   npm run auth:doctor
 *
 * Verifies the environment, the migrations, the auth trigger and the admin
 * promotion rule. It never writes to the database and never prints a secret.
 */

interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  verified_at: string | null;
}

const problems: string[] = [];
const notes: string[] = [];

function ok(label: string, detail = "") {
  console.log(`  âœ“ ${label}${detail ? ` â€” ${detail}` : ""}`);
}

function bad(label: string, detail = "") {
  problems.push(label);
  console.log(`  âœ— ${label}${detail ? ` â€” ${detail}` : ""}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  console.log("\n  The Bureaucracy Â· account doctor\n");

  if (!url) bad("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!serviceKey) bad("SUPABASE_SERVICE_ROLE_KEY is missing");
  if (!anonKey) bad("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  if (!siteUrl) notes.push("NEXT_PUBLIC_SITE_URL is unset; falling back to the Vercel/localhost URL");
  if (!url || !serviceKey || !anonKey) {
    console.log("\n  Cannot continue without the three Supabase keys.\n");
    process.exit(1);
  }

  ok("Supabase keys present", new URL(url).hostname);
  if (siteUrl) ok("Canonical site URL", siteUrl);

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, email, display_name, role, status, verified_at")
    .limit(2000);

  if (profileError) {
    bad("profiles is not readable with the expected columns", profileError.message);
    console.log("\n  Apply supabase/migrations before running the doctor.\n");
    process.exit(1);
  }

  const rows = (profiles ?? []) as Profile[];
  ok("profiles schema", `${rows.length} profile(s)`);

  for (const table of ["tb_admin_events", "tb_login_events", "tb_visits"]) {
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
    if (error) bad(`${table} is not readable`, error.message);
    else ok(table, `${count ?? 0} row(s)`);
  }

  // Every auth user must have a profile, or getSessionUser cannot resolve it.
  const { data: authUsers, error: authError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) {
    bad("auth.users is not readable with the service role", authError.message);
  } else {
    const profileIds = new Set(rows.map((profile) => profile.id));
    const missing = (authUsers?.users ?? []).filter((user) => !profileIds.has(user.id));
    if (missing.length) {
      bad("auth users without a profile", missing.map((user) => user.email ?? user.id).join(", "));
    } else {
      ok("every auth user has a profile", `${authUsers?.users.length ?? 0} account(s)`);
    }

    const unconfirmed = (authUsers?.users ?? []).filter((user) => !user.email_confirmed_at);
    if (unconfirmed.length) {
      notes.push(`${unconfirmed.length} account(s) are still waiting for email confirmation`);
    }
  }

  const admins = rows.filter((profile) => profile.role === "admin" && profile.status === "active");
  const suspended = rows.filter((profile) => profile.status === "suspended");
  const unverified = rows.filter((profile) => !profile.verified_at);
  ok("active admins", String(admins.length));
  if (!admins.length) bad("no active admin â€” the console cannot be entered");

  for (const email of adminEmails()) {
    const profile = rows.find((row) => row.email.toLowerCase() === email);
    if (!profile) {
      notes.push(`${email} is in ADMIN_EMAILS but has not signed up yet`);
    } else if (profile.role !== "admin") {
      bad(`${email} resolves to admin at request time but the row says ${profile.role}`, "run npm run auth:admins");
    } else {
      ok(`ADMIN_EMAILS entry is an admin row`, email);
    }
  }

  if (suspended.length) notes.push(`${suspended.length} suspended account(s)`);
  if (unverified.length) notes.push(`${unverified.length} profile(s) without verified_at`);

  console.log("");
  for (const note of notes) console.log(`  Â· ${note}`);

  if (problems.length) {
    console.log(`\n  ${problems.length} problem(s) found.\n`);
    process.exit(1);
  }

  console.log("\n  All account checks passed.\n");
}

main().catch((error) => {
  console.error(`\n  âœ— ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

