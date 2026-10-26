"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Archive,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  Compass,
  Feather,
  LayoutDashboard,
  Moon,
  Newspaper,
  Palette,
  Search,
  Sparkles,
  Sun,
  Monitor,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const PAGES = [
  { label: "Today's five", href: "/#brief", icon: Sparkles, shortcut: "1" },
  { label: "The 24-hour wire", href: "/", icon: Newspaper, shortcut: "2" },
  { label: "Best for the syllabus", href: "/?sort=best", icon: TrendingUp },
  { label: "Most discussed", href: "/?sort=discussed", icon: Users },
  { label: "Fresh copy", href: "/?sort=new", icon: Feather },
  { label: "Syllabus map", href: "/syllabus", icon: Compass },
  { label: "Optional subjects", href: "/optional", icon: BookOpen },
  { label: "Following", href: "/following", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Archive", href: "/archive", icon: Archive },
  { label: "Account settings", href: "/account", icon: UserRound },
  { label: "Saved stories", href: "/saved", icon: Bookmark },
  { label: "Design system", href: "/design-system", icon: Palette },
  { label: "Editor's desk", href: "/admin", icon: LayoutDashboard },
];

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "/" && !open) {
        const target = event.target;
        if (target instanceof HTMLElement) {
          const tag = target.tagName.toLowerCase();
          if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;
        }
        event.preventDefault();
        setOpen(true);
      }
    };

    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("tb:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("tb:command", onOpen);
    };
  }, [open]);

  const run = (callback: () => void) => {
    setOpen(false);
    setQuery("");
    callback();
  };

  const search = () => {
    const term = query.trim();
    if (!term) return;
    run(() => router.push(`/?q=${encodeURIComponent(term)}`));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search and commands" description="Search the wire, jump between pages, or change your reading mode.">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search the wire, or jump to…"
        aria-label="Search the wire or run a command"
      />
      <CommandList>
        <CommandEmpty>
          <p className="font-medium text-foreground">Nothing here yet.</p>
          <p className="mt-1 text-xs">Press Enter to search the wire for “{query}”.</p>
        </CommandEmpty>
        {query.trim() ? (
          <CommandGroup heading="Search">
            <CommandItem value={`search-${query}`} onSelect={search}>
              <Search />
              Search the wire for <span className="font-medium text-foreground">“{query.trim()}”</span>
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Go to">
          {PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.href}
                value={`${page.label} ${page.href}`}
                onSelect={() => run(() => router.push(page.href))}
              >
                <Icon />
                {page.label}
                {page.shortcut ? <CommandShortcut>{page.shortcut}</CommandShortcut> : <ArrowRight className="ml-auto size-3 opacity-40" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Reading mode">
          <CommandItem value="theme light" onSelect={() => run(() => { setTheme("light"); toast.add({ type: "success", title: "Light mode" }); })}>
            <Sun /> Light
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => run(() => { setTheme("dark"); toast.add({ type: "success", title: "Dark mode" }); })}>
            <Moon /> Dark
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => run(() => { setTheme("system"); toast.add({ type: "success", title: "Following your system" }); })}>
            <Monitor /> Use system setting
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        <span>↑↓ to move · ↵ to open</span>
        <span className="font-mono">The Bureaucracy</span>
      </div>
    </CommandDialog>
  );
}

export function CommandTrigger({ className, label = "Search the wire" }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tb:command"))}
      className={className}
      aria-label={label}
    >
      <Search className="size-4" aria-hidden />
      <span className="hidden text-sm text-muted-foreground lg:inline">Search</span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground lg:inline">
        ⌘K
      </kbd>
    </button>
  );
}
