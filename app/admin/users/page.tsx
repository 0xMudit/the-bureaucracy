import type { Metadata } from "next";
import Link from "next/link";
import { Ban, CheckCircle2, KeyRound, Search, ShieldCheck, UserCog } from "lucide-react";
import { revokeSessionsAction, setRoleAction, setStatusAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionUser, isAdminEmail, userCan } from "@/lib/auth";
import { ROLE_META, ROLES, isRole, roleLabel, type Role } from "@/lib/rbac";
import { serviceClient } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accounts",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: "active" | "suspended";
  created_at: string;
  last_seen_at: string | null;
  verified_at: string | null;
  suspended_at: string | null;
};

const OK: Record<string, string> = {
  role: "Role updated. It applies on the account's next request.",
  suspended: "Account suspended. Existing sessions are revoked and stop resolving immediately.",
  reactivated: "Account reactivated. The reader can sign in again.",
  revoked: "Every session for that account was signed out.",
};

const ERRORS: Record<string, string> = {
  forbidden: "Your role does not allow that change.",
  self: "You cannot change your own role, suspend yourself or sign yourself out here.",
  last_admin: "That would leave the deployment without an active admin.",
  managed: "That address is fixed by ADMIN_EMAILS and cannot be demoted or suspended from the register.",
  invalid: "The change was not valid.",
  not_found: "That account no longer exists.",
  db: "The database refused the change. Try again.",
};

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = one(params.q).slice(0, 80);
  const roleFilter = isRole(one(params.role)) ? (one(params.role) as Role) : null;
  const statusFilter = ["active", "suspended"].includes(one(params.status)) ? one(params.status) : null;
  const ok = one(params.ok);
  const error = one(params.error);

  const actor = await getSessionUser();
  if (!actor || !userCan(actor, "user.view")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">The register is closed.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Only editors and admins can read the account register.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/">Back to the wire</Link>
          </Button>
        </div>
      </div>
    );
  }

  const db = serviceClient();
  if (!db) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <h1 className="display text-[2rem] leading-none">No database connected.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            The account register needs the Supabase service role key on this deployment.
          </p>
        </div>
      </div>
    );
  }

  const canManage = userCan(actor, "user.manage");
  const canAssign = userCan(actor, "role.assign");

  let query = db
    .from("profiles")
    .select(
      "id, email, display_name, role, status, created_at, last_seen_at, verified_at, suspended_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const term = q.replace(/[%,()]/g, " ").trim();
  if (term) query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (roleFilter) query = query.eq("role", roleFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const [listRes, totalRes, editorRes, adminRes, suspendedRes] = await Promise.all([
    query,
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "editor"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  const profiles = (listRes.data ?? []) as ProfileRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <UserCog className="size-3.5" /> Administration
          </p>
          <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
            The register.
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Every account, its role and its state. Role changes are read on the next request; suspensions bite
            immediately, even for an open session.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="border border-border bg-card px-2 py-1">
            {totalRes.count ?? profiles.length} accounts
          </span>
          <span className="border border-border bg-card px-2 py-1">{editorRes.count ?? 0} editors</span>
          <span className="border border-border bg-card px-2 py-1 text-primary">{adminRes.count ?? 0} admins</span>
          <span className="border border-border bg-card px-2 py-1">{suspendedRes.count ?? 0} suspended</span>
        </div>
      </div>

      {ok && OK[ok] ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 border-l-2 border-success bg-success/10 px-3 py-2 text-[12px] leading-relaxed text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {OK[ok]}
        </p>
      ) : null}

      {error && ERRORS[error] ? (
        <p
          role="alert"
          className="mt-4 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive"
        >
          {ERRORS[error]}
        </p>
      ) : null}

      <form className="mt-5 flex flex-wrap items-end gap-2 border border-border bg-card p-3">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Search
          </span>
          <Input
            name="q"
            defaultValue={q}
            placeholder="Name or email"
            className="h-9 rounded-sm bg-background text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Role
          </span>
          <select
            name="role"
            defaultValue={roleFilter ?? ""}
            className="h-9 min-w-28 rounded-sm border border-input bg-background px-2 text-sm"
          >
            <option value="">Any role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_META[role].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            State
          </span>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-9 min-w-28 rounded-sm border border-input bg-background px-2 text-sm"
          >
            <option value="">Any state</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <Button type="submit" className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Search className="size-3.5" /> Filter
        </Button>
        <Button asChild variant="ghost" className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/admin/users">Reset</Link>
        </Button>
      </form>

      <div className="mt-4 overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-2 font-normal">Account</th>
              <th className="px-3 py-2 font-normal">Role</th>
              <th className="px-3 py-2 font-normal">State</th>
              <th className="px-3 py-2 font-normal">Joined</th>
              <th className="px-3 py-2 font-normal">Last seen</th>
              <th className="px-3 py-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length ? (
              profiles.map((profile) => {
                const suspended = profile.status === "suspended";
                const isSelf = profile.id === actor.id;
                const envManaged = isAdminEmail(profile.email);
                return (
                  <tr key={profile.id} className="border-b border-border/50 align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
                        <span className="truncate">{profile.display_name}</span>
                        {isSelf ? (
                          <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-primary">you</span>
                        ) : null}
                      </p>
                      <p className="truncate font-mono text-[9px] tracking-[0.04em] text-muted-foreground">
                        {profile.email}
                      </p>
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                        {profile.verified_at ? "verified" : "pending email"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      {canAssign && !isSelf && !envManaged ? (
                        <form action={setRoleAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={profile.id} />
                          <select
                            name="role"
                            defaultValue={profile.role}
                            aria-label={`Role for ${profile.email}`}
                            className="h-8 rounded-sm border border-input bg-background px-1.5 font-mono text-[9px] uppercase"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em]"
                          >
                            Save
                          </Button>
                        </form>
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                          {envManaged || profile.role === "admin" ? <ShieldCheck className="size-3 text-primary" /> : null}
                          {roleLabel(envManaged ? "admin" : isRole(profile.role) ? profile.role : "user")}
                          {envManaged ? <span className="text-[7.5px] text-muted-foreground">env</span> : null}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${
                          suspended
                            ? "border-destructive/40 bg-destructive/5 text-destructive"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {suspended ? "suspended" : "active"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {timeAgo(profile.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[9px] text-muted-foreground">
                      {profile.last_seen_at ? timeAgo(profile.last_seen_at) : "never"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canManage && !isSelf ? (
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          <form action={revokeSessionsAction} className="inline-flex">
                            <input type="hidden" name="userId" value={profile.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              title="Sign this account out of every device"
                              className="h-8 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground"
                            >
                              <KeyRound className="size-3" /> Sign out
                            </Button>
                          </form>
                          {envManaged ? (
                            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                              owner
                            </span>
                          ) : (
                            <form action={setStatusAction} className="inline-flex">
                              <input type="hidden" name="userId" value={profile.id} />
                              <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
                              <Button
                                type="submit"
                                size="sm"
                                variant={suspended ? "outline" : "ghost"}
                                className={`h-8 rounded-sm px-2 font-mono text-[8.5px] uppercase tracking-[0.08em] ${
                                  suspended ? "text-success" : "text-destructive"
                                }`}
                              >
                                {suspended ? <CheckCircle2 className="size-3" /> : <Ban className="size-3" />}
                                {suspended ? "Reactivate" : "Suspend"}
                              </Button>
                            </form>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                          {isSelf ? "self" : "read-only"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  No accounts match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground">
        Showing {profiles.length} of {listRes.count ?? profiles.length}. Addresses marked <span className="text-primary">env</span>{" "}
        come from ADMIN_EMAILS and are always admin; they cannot be demoted or suspended here. Every role change,
        suspension, reactivation and forced sign-out is written to the audit log.
      </p>
    </div>
  );
}

