/**
 * Role-based access control.
 *
 * Roles are stored in `profiles.role` and read on every request (never from
 * the JWT), so changing a role takes effect on the next page load. Permissions
 * are checked on the server in pages, server actions and route handlers; the UI
 * only hides what the server would refuse anyway.
 */

export type Role = "user" | "editor" | "admin";

export type Permission =
  | "account.self"
  | "vote.cast"
  | "comment.write"
  | "link.submit"
  | "admin.dashboard"
  | "comment.moderate"
  | "user.view"
  | "user.manage"
  | "role.assign"
  | "audit.view";

export const ROLES: readonly Role[] = ["user", "editor", "admin"] as const;

export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  editor: 1,
  admin: 2,
};

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ["account.self", "vote.cast", "comment.write", "link.submit"],
  editor: [
    "account.self",
    "vote.cast",
    "comment.write",
    "link.submit",
    "admin.dashboard",
    "comment.moderate",
    "user.view",
  ],
  admin: [
    "account.self",
    "vote.cast",
    "comment.write",
    "link.submit",
    "admin.dashboard",
    "comment.moderate",
    "user.view",
    "user.manage",
    "role.assign",
    "audit.view",
  ],
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  user: {
    label: "Reader",
    description: "Comment, react, follow and file links. No desk access.",
  },
  editor: {
    label: "Editor",
    description: "See traffic, accounts and activity. Can read the user register.",
  },
  admin: {
    label: "Admin",
    description: "Everything an editor can do, plus roles, suspensions and the audit log.",
  },
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): Role {
  // `reader` is the pre-social-graph name. Keep old rows readable while the
  // database migration rolls forward.
  if (value === "reader") return "user";
  return isRole(value) ? value : "user";
}

export function permissionsFor(role: Role): readonly Permission[] {
  return PERMISSIONS[role] ?? PERMISSIONS.user;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

export function roleLabel(role: Role): string {
  return ROLE_META[role]?.label ?? "Reader";
}
