import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { TOPICS } from "@/lib/taxonomy";
import type { TopicId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A 1×1 warm-grey pixel, small enough to inline and used for every remote image. */
const BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjMiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNlOGU0ZGMiLz48L3N2Zz4=";

const FALLBACK_TONE: Record<string, string> = {
  polity: "bg-chart-1/12 text-chart-1",
  governance: "bg-chart-1/10 text-chart-1",
  economy: "bg-chart-2/14 text-chart-2",
  ir: "bg-chart-3/14 text-chart-3",
  environment: "bg-chart-4/16 text-chart-4",
  science: "bg-chart-3/12 text-chart-3",
  security: "bg-chart-5/14 text-chart-5",
  society: "bg-chart-2/12 text-chart-2",
  history: "bg-chart-5/12 text-chart-5",
  ethics: "bg-chart-4/12 text-chart-4",
  reports: "bg-muted text-muted-foreground",
  exam: "bg-chart-1/10 text-chart-1",
};

/**
 * The article image. When a publisher supplies none, the space becomes a
 * topic-toned panel rather than a broken image or a generic grey box.
 */
export function ArticleImage({
  src,
  alt,
  topic,
  source,
  priority = false,
  className,
  sizes = "(min-width: 1024px) 700px, 100vw",
}: {
  src?: string | null;
  alt: string;
  topic?: TopicId | null;
  source?: string | null;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const tone = FALLBACK_TONE[topic ?? "reports"] ?? FALLBACK_TONE.reports;
  const label = topic ? TOPICS[topic]?.label : null;

  if (!src) {
    return (
      <div
        className={cn(
          "flex min-h-36 flex-col items-start justify-end gap-2 p-4 sm:min-h-48",
          tone,
          className,
        )}
        role="img"
        aria-label={`No publisher image. ${label ?? "Current affairs"} story on the wire.`}
      >
        <ImageIcon className="size-5 opacity-70" aria-hidden />
        <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
          {label ?? "Current affairs"}
          {source ? ` · ${source}` : ""}
        </p>
      </div>
    );
  }

  return (
    <figure className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder="blur"
        blurDataURL={BLUR}
        sizes={sizes}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </figure>
  );
}

/** Small feed thumbnail; deliberately hidden on very narrow screens. */
export function ArticleThumb({
  src,
  alt,
  topic,
}: {
  src?: string | null;
  alt: string;
  topic?: TopicId | null;
}) {
  return (
    <div className="hidden size-16 shrink-0 overflow-hidden border border-border/70 sm:block">
      <ArticleImage
        src={src}
        alt={alt}
        topic={topic}
        className="size-full min-h-0 border-0 p-1.5"
        sizes="64px"
      />
    </div>
  );
}
