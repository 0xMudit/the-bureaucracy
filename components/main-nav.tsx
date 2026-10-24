"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Top", sort: "top" },
  { href: "/?sort=new", label: "New", sort: "new" },
  { href: "/?sort=best", label: "Best", sort: "best" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/optional", label: "Optionals" },
  { href: "/saved", label: "Saved" },
  { href: "/about", label: "Method" },
];

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get("sort") ?? "top";

  return (
    <nav aria-label="Primary" className={cn("flex items-center gap-1 sm:gap-2", className)}>
      {NAV.map((item) => {
        const active =
          item.href === "/syllabus"
            ? pathname === "/syllabus"
            : item.href === "/optional"
              ? pathname === "/optional"
            : item.href === "/saved"
              ? pathname === "/saved"
              : item.href === "/about"
                ? pathname === "/about"
                : pathname === "/" && sort === item.sort;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-2 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors sm:px-2.5",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" aria-hidden />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
