import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/github-mark";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { TodayStamp } from "@/components/today-stamp";
import { getSessionUser, userCan } from "@/lib/auth";
import { SITE } from "@/lib/config";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="relative z-30 border-b-2 border-foreground/85 bg-background">
      <div className="h-1 w-full bg-primary" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-4 sm:py-5">
          <Link href="/" className="group flex min-w-0 items-center gap-3 focus-ring rounded-sm">
            <span className="relative shrink-0">
              <Image
                src="/brand/logo.jpg"
                alt=""
                width={52}
                height={52}
                priority
                className="size-11 rounded-full object-cover ring-2 ring-primary/85 ring-offset-2 ring-offset-background sm:size-[52px]"
                style={{ objectPosition: "50% 20%" }}
              />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[8.5px] uppercase tracking-[0.26em] text-muted-foreground">
                For the civil services
              </span>
              <span className="display block truncate text-[1.6rem] leading-[1.05] tracking-[-0.03em] sm:text-[2.2rem] sm:tracking-[-0.02em]">
                The Bureaucracy
              </span>
              <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                {SITE.tagline}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                {userCan(user, "admin.dashboard") ? (
                  <Link
                    href="/admin"
                    className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground sm:inline-flex"
                  >
                    Admin
                  </Link>
                ) : null}
                <Button
                  asChild
                  size="sm"
                  className="hidden h-9 rounded-sm px-4 font-mono text-[10px] uppercase tracking-[0.14em] sm:inline-flex"
                >
                  <Link href="/submit">
                    <PenLine className="size-3.5" /> Submit
                  </Link>
                </Button>
                <Link
                  href="/account"
                  aria-label={`Account: ${user.name}`}
                  title={`${user.name} · ${user.email}`}
                  className="hidden size-9 items-center justify-center rounded-full border border-border bg-card font-mono text-[10px] uppercase text-foreground transition-colors hover:border-primary/60 hover:text-primary sm:inline-flex"
                >
                  {initials(user.name)}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="hidden h-9 rounded-sm px-4 font-mono text-[10px] uppercase tracking-[0.14em] sm:inline-flex"
                >
                  <Link href="/#brief">
                    <Sparkles className="size-3.5" /> Today&apos;s five
                  </Link>
                </Button>
              </>
            )}
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="The Bureaucracy on GitHub"
              className="hidden sm:inline-flex"
            >
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <GithubMark className="size-4" />
              </Button>
            </a>
            <ThemeToggle />
            <MobileNav user={user ? { name: user.name, email: user.email, role: user.role } : null} />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border/80">
          <Suspense fallback={<div className="hidden h-9 sm:block" />}>
            <MainNav className="hidden min-w-0 overflow-x-auto py-0.5 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" />
          </Suspense>
          <TodayStamp />
        </div>
      </div>
    </header>
  );
}
