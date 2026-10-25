import { Fragment } from "react";

/**
 * Generated bullets use **double asterisks** for the terms a Prelims question
 * would test. Render them as <strong> without dangerouslySetInnerHTML.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
}

/** A list of generated bullets with a square marker and readable rhythm. */
export function BulletList({ bullets, className }: { bullets: string[]; className?: string }) {
  return (
    <ul className={className ?? "space-y-2"}>
      {bullets.map((bullet, index) => (
        <li key={`${index}-${bullet.slice(0, 24)}`} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground/90">
          <span className="mt-[0.45em] size-1.5 shrink-0 bg-primary" aria-hidden />
          <RichText text={bullet} />
        </li>
      ))}
    </ul>
  );
}
