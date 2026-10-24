"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, Menu, PenLine, UserRound } from "lucide-react";
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

const LINKS = [
  { href: "/", label: "Top stories" },
  { href: "/?sort=new", label: "New wire" },
  { href: "/?sort=best", label: "Best for the syllabus" },
  { href: "/?sort=discussed", label: "Discussed" },
  { href: "/syllabus", label: "Syllabus map" },
  { href: "/optional", label: "Optional subjects" },
  { href: "/saved", label: "Saved" },
  { href: "/about", label: "How ranking works" },
];

export interface MobileNavUser {
  name: string;
  email: string;
  role: "reader" | "editor";
}

export function MobileNav({ user }: { user: MobileNavUser | null }) {
  const [open, setOpen] = useState(false);
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
              {user.role === "editor" ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-b border-border/60 py-3 text-[15px] font-medium hover:text-primary"
                >
                  <LayoutDashboard className="size-4 text-primary" /> Editor dashboard
                </Link>
              ) : null}
            </>
          ) : null}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          {user ? (
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="size-4" /> Sign out
              </Button>
            </form>
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href="/submit" onClick={() => setOpen(false)}>
                  <LogIn className="size-4" /> Log in
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/submit" onClick={() => setOpen(false)}>
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
