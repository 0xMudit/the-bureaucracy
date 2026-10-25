import Link from "next/link";
import { Rss } from "lucide-react";
import { GithubMark } from "@/components/github-mark";
import { SITE, NEWS_WINDOW_HOURS } from "@/lib/config";

const SECTIONS = [
  { href: "/", label: "Top" },
  { href: "/?sort=new", label: "New" },
  { href: "/?sort=best", label: "Best" },
  { href: "/?sort=discussed", label: "Discussed" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/optional", label: "Optionals" },
  { href: "/brief", label: "Daily brief" },
  { href: "/archive", label: "Archive" },
  { href: "/saved", label: "Saved" },
  { href: "/subscribe", label: "Email" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "Method" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-foreground/85 bg-secondary/35">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.6fr_0.8fr_1.2fr]">
        <div>
          <Link href="/" className="display text-2xl">
            The Bureaucracy
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A reading room for people preparing to run the state. Only the last {NEWS_WINDOW_HOURS} hours of
            policy news, ranked by what the syllabus actually asks.
          </p>
          <p className="mt-4 max-w-sm font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
            Not affiliated with UPSC, any state PSC, or the Government of India. Always verify notifications on
            the commission&apos;s own website.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 content-start">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">The fine print</p>
          <p className="text-muted-foreground">
            Headlines and excerpts belong to their publishers. Every card links out to the original.
            Aggregation uses public RSS feeds; the ranking and syllabus mapping are ours.
          </p>
          <p className="text-xs text-muted-foreground">
            Masthead portrait: <em>VIVA CHE</em>, Jim Fitzpatrick (1968). Supplied by the editor.
          </p>
          <p className="text-xs text-muted-foreground">
            Editor —{" "}
            <a
              href={`mailto:${SITE.editor.email}`}
              className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-primary"
            >
              {SITE.editor.name}
            </a>{" "}
            <a href={`mailto:${SITE.editor.email}`} className="hover:text-foreground">
              ({SITE.editor.email})
            </a>
          </p>
          <nav aria-label="Legal" className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary">
              Privacy
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link href="/terms" className="text-muted-foreground hover:text-primary">
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-4 pt-1">
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
            >
              <Rss className="size-3.5" /> RSS
            </a>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
            >
              <GithubMark className="size-3.5" /> Source
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            © {new Date().getFullYear()} {SITE.name} · Built by {SITE.author}
          </span>
          <span>/ search · j k move · o open · l like · d dislike · c comment · s save</span>
        </div>
      </div>
    </footer>
  );
}
