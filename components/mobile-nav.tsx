"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, PenLine } from "lucide-react";
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
  { href: "/submit", label: "Submit a link" },
  { href: "/about", label: "How ranking works" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-sm border-border bg-background">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="display text-2xl">{SITE.name}</SheetTitle>
          <SheetDescription className="font-mono text-[10px] uppercase tracking-[0.16em]">
            {SITE.tagline}
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col px-4" aria-label="Mobile">
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
        </nav>
        <div className="mt-auto space-y-3 p-4">
          <Button asChild className="w-full">
            <Link href="/submit" onClick={() => setOpen(false)}>
              <PenLine className="size-4" /> Submit a link
            </Link>
          </Button>
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
