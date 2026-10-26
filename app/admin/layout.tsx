import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { getSessionUser, userCan } from "@/lib/auth";
import { roleLabel } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/submit?next=/admin");

  if (!userCan(user, "admin.dashboard")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
            <ShieldAlert className="size-3.5" /> Restricted
          </p>
          <h1 className="display mt-1 text-[2rem] leading-none">The desk is not open to you.</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            You are signed in as {user.email} with the role {roleLabel(user.role)}. The desk needs an editor or
            admin account.
          </p>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/">Back to the wire</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      name={user.name}
      roleLabel={roleLabel(user.role)}
      canViewUsers={userCan(user, "user.view")}
      canViewAudit={userCan(user, "audit.view")}
      canModerate={userCan(user, "comment.moderate")}
    >
      {children}
    </AdminShell>
  );
}
