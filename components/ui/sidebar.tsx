"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Context
 * ─────────────────────────────────────────────────────────────────────────── */

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarCtx = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const value = React.useContext(SidebarCtx);
  if (!value) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return value;
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Provider
 * ─────────────────────────────────────────────────────────────────────────── */

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  return <SidebarCtx.Provider value={{ open, setOpen, toggle }}>{children}</SidebarCtx.Provider>;
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Sidebar shell
 * ─────────────────────────────────────────────────────────────────────────── */

export function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { open } = useSidebar();
  return (
    <aside
      data-slot="sidebar"
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        // Hidden on mobile — the mobile tab strip in SidebarInset handles it.
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        open ? "w-56" : "w-[3.25rem]",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Structural slots
 * ─────────────────────────────────────────────────────────────────────────── */

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 border-b border-sidebar-border px-3 py-3", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-3", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto border-t border-sidebar-border px-3 py-3", className)}
      {...props}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Group
 * ─────────────────────────────────────────────────────────────────────────── */

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("px-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, children, ...props }: React.ComponentProps<"p">) {
  const { open } = useSidebar();
  if (!open) return null;
  return (
    <p
      data-slot="sidebar-group-label"
      className={cn(
        "mb-1 px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-sidebar-foreground/40",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Menu
 * ─────────────────────────────────────────────────────────────────────────── */

export function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul data-slot="sidebar-menu" className={cn("flex w-full flex-col gap-0.5", className)} {...props} />
  );
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("list-none", className)} {...props} />;
}

/**
 * The active item gets a filled background; everything else is ghost.
 * `asChild` forwards all props to a child element (e.g. Next.js `<Link>`).
 */
export function SidebarMenuButton({
  className,
  isActive = false,
  tooltip,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  isActive?: boolean;
  tooltip?: string;
  asChild?: boolean;
}) {
  const { open } = useSidebar();
  const Comp = asChild ? (Slot.Root as React.ElementType) : "button";

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive ? "true" : undefined}
      title={!open ? tooltip : undefined}
      className={cn(
        // Layout
        "flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-[13px] font-medium transition-colors",
        // Focus
        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        // Default state
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        // Active state — solid fill
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        // Icons
        "[&_svg]:size-[1.05rem] [&_svg]:shrink-0",
        // Collapsed: center the icon
        !open && "justify-center px-0",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function SidebarMenuAction({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="sidebar-menu-action"
      className={cn(
        "ml-auto rounded p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Trigger & Rail
 * ─────────────────────────────────────────────────────────────────────────── */

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggle } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return <main data-slot="sidebar-inset" className={cn("min-w-0 flex-1 overflow-hidden", className)} {...props} />;
}

export function SidebarRail() {
  const { toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle sidebar"
      className="absolute inset-y-0 -right-2 hidden w-4 cursor-col-resize md:block"
    />
  );
}
