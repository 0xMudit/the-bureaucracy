import Link from "next/link";
import { ArrowUpRight, Check, Lock, Sparkles } from "lucide-react";
import type { PremiumView } from "@/lib/premium";

/**
 * The paid pack on a story page.
 *
 * Locked and unlocked are separate renders, not a CSS overlay: a free reader's
 * HTML never contains the paid text. `premium` is decided on the server by
 * `premiumView`, so this component only has to be honest about what it is
 * given.
 */
export function PremiumPack({ premium }: { premium: PremiumView }) {
  const label = premium.locked ? "Plus" : premium.plan === "mains" ? "Mains" : "Plus";

  return (
    <section aria-labelledby="premium-title" className="mt-8 border border-primary/35 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2
          id="premium-title"
          className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]"
        >
          <Sparkles className="size-3.5 text-primary" /> The full read
        </h2>
        <span className="border border-primary/40 bg-primary/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-primary">
          {premium.locked ? "Members only" : label}
        </span>
      </div>

      {premium.locked ? (
        <Locked premium={premium} />
      ) : premium.pack ? (
        <Unlocked pack={premium.pack} />
      ) : (
        <div className="px-4 py-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {premium.unavailable
              ? "The full read for this story is still being written. Pull to refresh in a minute — it is generated once and then always available."
              : "The full read is not available for this story."}
          </p>
        </div>
      )}
    </section>
  );
}

function Locked({ premium }: { premium: PremiumView }) {
  return (
    <div className="px-4 py-5">
      <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">What you are reading</p>
      <p className="mt-2 max-w-2xl font-display text-[1.35rem] leading-[1.25] tracking-[-0.01em]">
        {premium.teaser.headline || "The exam-ready version of this story, not just the news."}
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {premium.teaser.includes.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-foreground/85">
            <Lock className="mt-0.5 size-3 shrink-0 text-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/plus"
          className="inline-flex items-center gap-1.5 border border-primary bg-primary px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
        >
          Unlock the full read <ArrowUpRight className="size-3" />
        </Link>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Already a member?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </span>
      </div>

      <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground">
        Generated once per story by Groq, then cached. Your plan is checked on the server.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">{children}</p>
  );
}

function Unlocked({ pack }: { pack: NonNullable<PremiumView["pack"]> }) {
  return (
    <div className="space-y-6 px-4 py-5">
      <div>
        <SectionLabel>Deep read</SectionLabel>
        <p className="mt-2 text-[14px] leading-[1.8] text-foreground/90">{pack.deepRead}</p>
      </div>

      {pack.takeaways.length ? (
        <div>
          <SectionLabel>Carry these</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {pack.takeaways.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-foreground/85">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pack.prelimsTraps.length ? (
        <div>
          <SectionLabel>Prelims traps</SectionLabel>
          <div className="mt-2 space-y-2">
            {pack.prelimsTraps.map((trap, index) => (
              <details key={`${index}-${trap.statement.slice(0, 12)}`} className="group border border-border bg-background">
                <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-[13px] leading-relaxed text-foreground/90 [&::-webkit-details-marker]:hidden">
                  <span className="mt-px font-mono text-[9px] text-primary">{index + 1}.</span>
                  <span className="flex-1">{trap.statement}</span>
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground group-open:hidden">
                    Answer
                  </span>
                </summary>
                <div className="border-t border-border px-3 py-2.5">
                  <p
                    className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                      trap.verdict === "true" ? "text-primary" : "text-warning"
                    }`}
                  >
                    {trap.verdict === "true" ? "True" : "False"}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/85">{trap.why}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionLabel>Mains skeleton</SectionLabel>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-foreground">
          {pack.mains.question}
        </p>
        <div className="mt-3 space-y-3 border-l-2 border-primary/40 pl-3">
          <p className="text-[12.5px] leading-relaxed text-foreground/85">{pack.mains.intro}</p>
          {pack.mains.points.map((point, index) => (
            <p key={`${index}-${point.slice(0, 12)}`} className="flex gap-2 text-[12.5px] leading-relaxed text-foreground/85">
              <span className="font-mono text-[9px] text-primary">{index + 1}</span>
              <span>{point}</span>
            </p>
          ))}
          <p className="text-[12.5px] leading-relaxed text-foreground/85">{pack.mains.conclusion}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pack.mains.keywords.map((keyword) => (
            <span
              key={keyword}
              className="border border-border bg-background px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground"
            >
              {keyword}
            </span>
          ))}
        </div>
        {pack.mains.dataPoint ? (
          <p className="mt-3 border border-border bg-background px-3 py-2 text-[12px] leading-relaxed text-foreground/85">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-primary">Data point · </span>
            {pack.mains.dataPoint}
          </p>
        ) : null}
      </div>

      {pack.glossary.length ? (
        <div>
          <SectionLabel>In plain terms</SectionLabel>
          <dl className="mt-2 space-y-2">
            {pack.glossary.map((entry) => (
              <div key={entry.term} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-[12.5px] font-medium text-foreground">{entry.term}</dt>
                <dd className="text-[12.5px] leading-relaxed text-muted-foreground">{entry.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
