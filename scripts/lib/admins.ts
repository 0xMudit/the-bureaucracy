import { createClient } from "@supabase/supabase-js";
import { SITE } from "../../lib/config";

/** Emails that are always promoted to admin: ADMIN_EMAILS plus the editor. */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const editor = SITE.editor.email.toLowerCase();
  if (!list.includes(editor)) list.push(editor);
  return [...new Set(list)];
}

export interface AdminSyncResult {
  promoted: string[];
  skipped: string | null;
}

/**
 * Promote every profile whose email appears in ADMIN_EMAILS to admin. The app
 * already treats those addresses as admin at request time; this keeps the
 * register and the audit trail truthful.
 */
export async function syncAdminRoles({ dryRun = false } = {}): Promise<AdminSyncResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { promoted: [], skipped: "SUPABASE_SERVICE_ROLE_KEY is not set" };
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const emails = adminEmails();

  const { data, error } = await db.from("profiles").select("id, email, role").limit(2000);
  if (error) return { promoted: [], skipped: error.message };

  const targets = (data ?? []).filter(
    (profile) =>
      typeof profile.email === "string" &&
      emails.includes(profile.email.toLowerCase()) &&
      profile.role !== "admin",
  );
  const promoted = targets.map((profile) => String(profile.email));

  if (dryRun || !targets.length) return { promoted, skipped: null };

  const { error: updateError } = await db
    .from("profiles")
    .update({ role: "admin" })
    .in(
      "id",
      targets.map((profile) => profile.id),
    );

  if (updateError) return { promoted: [], skipped: updateError.message };
  return { promoted, skipped: null };
}

