"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminEmail, userCan } from "@/lib/auth";
import { isRole, type Role } from "@/lib/rbac";
import { revokeUserSessions } from "@/lib/supabase/admin";
import { serviceClient } from "@/lib/store";

function back(params: Record<string, string>): never {
  redirect(`/admin/users?${new URLSearchParams(params).toString()}`);
}

async function record(
  db: NonNullable<ReturnType<typeof serviceClient>>,
  actor: { id: string; email: string },
  target: { id: string; email: string },
  action: string,
  detail: string,
) {
  try {
    await db.from("tb_admin_events").insert({
      actor_id: actor.id,
      actor_email: actor.email,
      target_id: target.id,
      target_email: target.email,
      action,
      detail,
    });
  } catch {
    // An audit failure must not undo a successful role change.
  }
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const actor = await getSessionUser();
  if (!actor || !userCan(actor, "role.assign")) back({ error: "forbidden" });

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !isRole(role)) back({ error: "invalid" });
  if (userId === actor.id) back({ error: "self" });

  const db = serviceClient();
  if (!db) back({ error: "db" });

  const { data: target } = await db
    .from("tb_profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target) back({ error: "not_found" });

  const current = String(target.role) as Role;
  if (current === role) back({ ok: "role" });

  // An address in ADMIN_EMAILS resolves to admin on every request. Letting the
  // register show "reader" while the account keeps the desk would be a lie.
  if (isAdminEmail(target.email) && role !== "admin") back({ error: "managed" });

  // Never remove the last way back into the console.
  if (current === "admin" && role !== "admin") {
    const { count } = await db
      .from("tb_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) back({ error: "last_admin" });
  }

  const { error } = await db.from("tb_profiles").update({ role }).eq("id", target.id);
  if (error) back({ error: "db" });

  await record(db, actor, { id: target.id, email: target.email }, "role.assign", `${current} → ${role}`);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  back({ ok: "role" });
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const actor = await getSessionUser();
  if (!actor || !userCan(actor, "user.manage")) back({ error: "forbidden" });

  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!userId || !["active", "suspended"].includes(status)) back({ error: "invalid" });
  if (userId === actor.id) back({ error: "self" });

  const db = serviceClient();
  if (!db) back({ error: "db" });

  const { data: target } = await db
    .from("tb_profiles")
    .select("id, email, role, status")
    .eq("id", userId)
    .maybeSingle();
  if (!target) back({ error: "not_found" });

  // The deployment editor is always an admin; suspending it would lock the
  // owner out of the console with no way back in through the UI.
  if (status === "suspended" && isAdminEmail(target.email)) back({ error: "managed" });

  if (status === "suspended" && target.role === "admin") {
    const { count } = await db
      .from("tb_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) back({ error: "last_admin" });
  }

  const { error } = await db
    .from("tb_profiles")
    .update({
      status,
      suspended_at: status === "suspended" ? new Date().toISOString() : null,
    })
    .eq("id", target.id);
  if (error) back({ error: "db" });

  // A suspension already stops resolving on the next request. Revoke the
  // refresh tokens as well so the auth session itself cannot be refreshed.
  if (status === "suspended") await revokeUserSessions(target.id);

  await record(
    db,
    actor,
    { id: target.id, email: target.email },
    status === "suspended" ? "user.suspend" : "user.reactivate",
    `${target.status ?? "active"} → ${status}`,
  );

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  back({ ok: status === "suspended" ? "suspended" : "reactivated" });
}

/** Sign an account out of every device without suspending it. */
export async function revokeSessionsAction(formData: FormData): Promise<void> {
  const actor = await getSessionUser();
  if (!actor || !userCan(actor, "user.manage")) back({ error: "forbidden" });

  const userId = String(formData.get("userId") ?? "");
  if (!userId) back({ error: "invalid" });
  if (userId === actor.id) back({ error: "self" });

  const db = serviceClient();
  if (!db) back({ error: "db" });

  const { data: target } = await db
    .from("tb_profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!target) back({ error: "not_found" });

  const revoked = await revokeUserSessions(target.id);
  if (!revoked) back({ error: "db" });

  await record(db, actor, { id: target.id, email: target.email }, "user.revoke", "all sessions signed out");

  revalidatePath("/admin/users");
  back({ ok: "revoked" });
}
