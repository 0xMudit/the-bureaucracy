import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card">
        <SearchX className="size-5 text-muted-foreground" />
      </span>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">404 · Off the wire</p>
      <h1 className="display mt-2 text-4xl leading-none">This story has expired.</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The Bureaucracy keeps only the last 24 hours. If the link is older than that, the story has been deleted
        rather than archived. Try the current wire.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/">Back to the wire</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/syllabus">Syllabus map</Link>
        </Button>
      </div>
    </div>
  );
}
