"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, Menu, Monitor, Moon, PenLine, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { signOutAction } from "@/app/auth/actions";
import { GithubMark } from "@/components/github-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SITE } from "@/lib/config";

const THEME_CHOICES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
] as const;

const LINKS = [
  { href: "/#brief", label: "Today's five" },
  { href: "/", label: "Top stories" },
  { href: "/?sort=new", label: "New wire" },
  { href: "/?sort=best", label: "Best for the syllabus" },
  { href: "/?sort=discussed", label: "Discussed" },
  { href: "/syllabus", label: "Syllabus map" },
  { href: "/optional", label: "Optional subjects" },
  { href: "/following", label: "Following" },
  { href: "/saved", label: "Saved" },
  { href: "/about", label: "How ranking works" },
];

export interface MobileNavUser {
  name: string;
  email: string;
  role: "user" | "editor" | "admin";
}

export function MobileNav({ user }: { user: MobileNavUser | null }) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-w-sm border-border bg-background data-[side=right]:w-[86vw]">
        <SheetHeader className="border-b border-border pb-4 pr-10">
          <SheetTitle className="display text-2xl">{SITE.name}</SheetTitle>
          <SheetDescription className="font-mono text-[10px] uppercase tracking-[0.16em]">
            {user ? user.email : SITE.tagline}
          </SheetDescription>
        </SheetHeader>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4" aria-label="Mobile">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-border/60 py-3 text-[15px] font-medium hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-b border-border/60 py-3 text-[15px] font-medium hover:text-primary"
              >
                <UserRound className="size-4 text-muted-foreground" /> {user.name}
              </Link>
              {user.role !== "user" ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-b border-border/60 py-3 text-[15px] font-medium hover:text-primary"
                >
                  <LayoutDashboard className="size-4 text-primary" /> {user.role === "admin" ? "Admin console" : "Editor dashboard"}
                </Link>
              ) : null}
            </>
          ) : null}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Reading mode
            </p>
            <div
              role="group"
              aria-label="Reading mode"
              className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1"
            >
              {THEME_CHOICES.map(({ value, label, Icon }) => {
                const active = mounted && theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] font-medium transition-colors focus-ring ${
                      active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {user ? (
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="size-4" /> Sign out
              </Button>
            </form>
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <LogIn className="size-4" /> Log in
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <UserRound className="size-4" /> Create account
                </Link>
              </Button>
            </>
          )}
          {user ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/submit" onClick={() => setOpen(false)}>
                <PenLine className="size-4" /> Submit a link
              </Link>
            </Button>
          ) : null}
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            <GithubMark className="size-3.5" /> Open source
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
