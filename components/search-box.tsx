"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const current = params.get("q") ?? "";

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim() ?? "";
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <form onSubmit={onSubmit} className={className} role="search">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          data-search-input
          name="q"
          defaultValue={current}
          placeholder="Search the 24-hour wire"
          aria-label="Search stories"
          className="h-10 w-full rounded-sm border border-border bg-card pl-8 pr-8 font-mono text-base tracking-[0.02em] placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/30 sm:h-8 sm:text-[11px]"
        />
        {current ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        ) : (
          <kbd className="absolute right-2 hidden rounded border border-border px-1 font-mono text-[9px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </div>
      <Button type="submit" className="sr-only">
        Search
      </Button>
    </form>
  );
}
