"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  ExternalLink,
  FileText,
  MessageSquare,
  Rss,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
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
  useSidebar,
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

type LinkDef = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  permission?: string;
};

const ANALYTICS_LINKS: LinkDef[] = [
  { href: "/admin", label: "Analytics", icon: BarChart3, exact: true },
];

const OPERATIONS_LINKS: LinkDef[] = [
  { href: "/admin/users",     label: "Accounts",   icon: Users,         permission: "users"    },
  { href: "/admin/comments",  label: "Moderation", icon: MessageSquare, permission: "moderate" },
  { href: "/admin/ingestion", label: "Ingestion",  icon: Rss                                   },
  { href: "/admin/llm",       label: "LLM jobs",   icon: Bot                                   },
  { href: "/admin/push",      label: "Push",       icon: Bell                                  },
  { href: "/admin/content",   label: "Content",    icon: FileText                              },
  { href: "/admin/settings",  label: "Settings",   icon: Settings                              },
  { href: "/admin/audit",     label: "Audit log",  icon: ScrollText,    permission: "audit"    },
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

  const visibleOps: LinkDef[] = OPERATIONS_LINKS.filter((link) => {
    if (link.permission === "users")    return canViewUsers;
    if (link.permission === "audit")    return canViewAudit;
    if (link.permission === "moderate") return canModerate;
    return true;
  });

  const allLinks: LinkDef[] = [...ANALYTICS_LINKS, ...visibleOps];

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100dvh-5.5rem)] w-full overflow-hidden">
        {/* ── Left sidebar (desktop) ─────────────────────────────────────── */}
        <Sidebar>
          <SidebarHeader>
            <SidebarWordmark />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Analytics</SidebarGroupLabel>
              <SidebarMenu>
                {ANALYTICS_LINKS.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarMenu>
                {visibleOps.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenuButton asChild tooltip="Back to the wire">
              <Link href="/" className="text-sidebar-foreground/60">
                <ExternalLink className="size-4 shrink-0" />
                <span>Open the wire</span>
              </Link>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main content area ──────────────────────────────────────────── */}
        <SidebarInset>
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              {/* Mobile pill nav */}
              <nav
                aria-label="Admin navigation"
                className="flex min-w-0 gap-1 overflow-x-auto md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {allLinks.map((link) => {
                  const active = isActive(link, pathname);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "shrink-0 rounded-md px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <p className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {name} · <span className="text-foreground">{roleLabel}</span>
            </p>
          </div>

          {/* Page content */}
          <div className="min-w-0">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Sub-components
 * ─────────────────────────────────────────────────────────────────────────── */

function SidebarWordmark() {
  const { open } = useSidebar();
  return (
    <Link
      href="/admin"
      className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      {/* Icon always visible */}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-3.5" />
      </span>
      {/* Text hidden when collapsed */}
      {open && (
        <span className="min-w-0">
          <span className="block truncate font-display text-[1.1rem] leading-tight">The desk</span>
          <span className="block font-mono text-[8px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Operations
          </span>
        </span>
      )}
    </Link>
  );
}

function NavItem({ link, pathname }: { link: LinkDef; pathname: string }) {
  const Icon = link.icon;
  const active = isActive(link, pathname);
  const { open } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={link.label}>
        <Link href={link.href} aria-current={active ? "page" : undefined}>
          <Icon className="size-[1.05rem] shrink-0" />
          {open && <span>{link.label}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function isActive(link: LinkDef, pathname: string): boolean {
  if (link.exact) return pathname === link.href;
  // For sub-routes: must start with href AND not be the root "/admin" when
  // checking a sub-path (avoids every item matching when href = "/admin")
  return pathname.startsWith(link.href + "/") || pathname === link.href;
}
