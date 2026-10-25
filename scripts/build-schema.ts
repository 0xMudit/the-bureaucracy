import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Regenerates supabase/schema.sql from the migrations.
 *
 *   npm run db:snapshot
 *
 * The snapshot exists for the SQL-editor install path and for reading the
 * schema in one file. Concatenating the migrations in filename order is
 * equivalent to applying them, and it cannot drift the way a hand-maintained
 * copy did (it was a migration behind: four-argument tb_add_comment, no
 * rate_limits table).
 */

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
const SNAPSHOT = path.join(process.cwd(), "supabase", "schema.sql");

const HEADER = `-- The Bureaucracy - Supabase schema (single-file snapshot)
--
-- GENERATED FILE. Do not edit by hand.
-- Run \\\`npm run db:snapshot\\\` after adding a migration; this file is the
-- migrations concatenated in filename order and is equivalent to applying
-- them one by one.
--
-- SOURCE OF TRUTH: supabase/migrations/*.sql.
--
-- Fresh project:  npx supabase db push      (recommended - applies migrations)
-- SQL editor:     paste this file once.
--
-- All access goes through the service role on the server; the browser never
-- talks to these tables.
`;

async function main() {
  const entries = (await fs.readdir(MIGRATIONS))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (!entries.length) throw new Error("No migrations found.");

  const parts: string[] = [HEADER];
  for (const name of entries) {
    const sql = (await fs.readFile(path.join(MIGRATIONS, name), "utf8")).trim();
    if (!sql) continue;
    parts.push(`\n-- ===========================================================================\n-- ${name}\n-- ===========================================================================\n\n${sql}\n`);
  }

  await fs.writeFile(SNAPSHOT, parts.join(""), "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), SNAPSHOT)} from ${entries.length} migrations.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
