"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/comments", label: "Moderation", permission: "moderate" as const },
  { href: "/admin/users", label: "Accounts", permission: "users" as const },
  { href: "/admin/audit", label: "Audit", permission: "audit" as const },
];

export function AdminNav({
  canViewUsers,
  canViewAudit,
  canModerate,
}: {
  canViewUsers: boolean;
  canViewAudit: boolean;
  canModerate: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
      {ITEMS.filter((item) => {
        if (item.permission === "moderate") return canModerate;
        if (item.permission === "users") return canViewUsers;
        if (item.permission === "audit") return canViewAudit;
        return true;
      }).map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
