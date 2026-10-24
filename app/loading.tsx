export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the wire…</span>
      <div className="grid gap-8 py-5 lg:grid-cols-[minmax(0,1fr)_292px] lg:gap-10">
        <div className="min-w-0">
          <div className="h-2 w-28 animate-pulse bg-muted" />
          <div className="mt-3 h-8 w-3/4 animate-pulse bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse bg-muted" />

          <div className="mt-5 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-7 w-20 animate-pulse bg-muted" />
            ))}
          </div>

          <ul className="mt-5 divide-y divide-border/60 border-t border-border/60">
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index} className="flex gap-3 py-4">
                <div className="mt-1 h-8 w-6 shrink-0 animate-pulse bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-2 w-24 animate-pulse bg-muted" />
                  <div className="h-4 animate-pulse bg-muted" style={{ width: `${88 - (index % 4) * 9}%` }} />
                  <div className="h-3 w-2/3 animate-pulse bg-muted" />
                  <div className="h-2 w-1/3 animate-pulse bg-muted" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="hidden space-y-4 lg:block">
          <div className="h-40 animate-pulse border border-border bg-muted/40" />
          <div className="h-28 animate-pulse border border-border bg-muted/40" />
          <div className="h-32 animate-pulse border border-border bg-muted/40" />
        </aside>
      </div>
    </div>
  );
}
