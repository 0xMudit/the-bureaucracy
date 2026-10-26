"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, MessageSquare, ScrollText, ShieldCheck, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  roleLabel: string;
  name: string;
  canViewUsers: boolean;
  canViewAudit: boolean;
  canModerate: boolean;
  children: React.ReactNode;
}

const LINKS = [
  { href: "/admin", label: "Analytics", icon: BarChart3, exact: true },
  { href: "/admin/comments", label: "Moderation", icon: MessageSquare, permission: "moderate" },
  { href: "/admin/users", label: "Accounts", icon: Users, permission: "users" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit" },
];

export function AdminShell({
  roleLabel,
  name,
  canViewUsers,
  canViewAudit,
  canModerate,
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  const visible = LINKS.filter((link) => {
    if (link.permission === "users") return canViewUsers;
    if (link.permission === "audit") return canViewAudit;
    if (link.permission === "moderate") return canModerate;
    return true;
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100dvh-6rem)] w-full">
        <Sidebar>
          <SidebarHeader>
            <Link href="/admin" className="flex items-center gap-2 px-1 py-1">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-3.5" />
              </span>
              <span className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
                <span className="block truncate font-display text-lg leading-none">The desk</span>
                <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                  Operations
                </span>
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Analytics</SidebarGroupLabel>
              <SidebarMenu>
                {visible.slice(0, 1).map((link) => (
                  <MenuLink key={link.href} link={link} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarMenu>
                {visible.slice(1).map((link) => (
                  <MenuLink key={link.href} link={link} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span className="group-data-[state=collapsed]/sidebar:hidden">Open the wire</span>
            </Link>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <nav aria-label="Admin mobile" className="flex min-w-0 gap-1 overflow-x-auto md:hidden">
                {visible.map((link) => {
                  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "shrink-0 rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em]",
                        active ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {name} · <span className="text-foreground">{roleLabel}</span>
            </p>
          </div>
          <div className="min-w-0">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function MenuLink({
  link,
  pathname,
}: {
  link: (typeof LINKS)[number];
  pathname: string;
}) {
  const Icon = link.icon;
  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link href={link.href} aria-current={active ? "page" : undefined}>
          <Icon className="size-4 shrink-0" />
          <span className="group-data-[state=collapsed]/sidebar:hidden">{link.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
