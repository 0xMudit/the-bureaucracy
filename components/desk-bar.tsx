"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDeskAction, saveDeskAction, skipDeskAction } from "@/app/desk-actions";
import { DEFAULT_DESK, deskSummary } from "@/lib/desk";
import { trackEvent } from "@/lib/telemetry";
import { OPTIONAL_LIST } from "@/lib/taxonomy";
import type { Desk, DeskStage, ExamTrack, OptionalId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeskBarProps {
  desk: Desk | null;
  skipped: boolean;
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; title?: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-x-3">
      <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground sm:w-16">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            title={option.title}
            className={cn(
              "rounded-sm border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em] transition-colors",
              value === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DeskBar({ desk, skipped }: DeskBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!desk && !skipped);
  const [draft, setDraft] = useState<Desk>(desk ?? DEFAULT_DESK);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (desk) setDraft(desk);
  }, [desk]);

  const save = () => {
    startTransition(async () => {
      await saveDeskAction(draft);
      trackEvent("desk_set", { exam: draft.exam, stage: draft.stage, optional: draft.optional });
      router.refresh();
      setOpen(false);
    });
  };

  const skip = () => {
    startTransition(async () => {
      trackEvent("desk_skip");
      await skipDeskAction();
      router.refresh();
      setOpen(false);
    });
  };

  const clear = () => {
    startTransition(async () => {
      await clearDeskAction();
      router.refresh();
      setDraft(DEFAULT_DESK);
      setOpen(true);
    });
  };

  if (desk && !open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-card px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          <SlidersHorizontal className="size-3 shrink-0 text-primary" />
          <span className="shrink-0">Your desk</span>
          <span className="truncate text-foreground">{deskSummary(desk)}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Change
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            aria-label="Reset your desk"
            title="Reset your desk"
            className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  if (!desk && skipped && !open) {
    return (
      <div className="flex items-center justify-between gap-2 border border-dashed border-border px-3 py-1.5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.13em] text-muted-foreground">
          Reading for a particular paper?
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-primary hover:underline"
        >
          Set your desk <ArrowRight className="size-3" />
        </button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <section aria-labelledby="desk-title" className="border border-foreground/80 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <h2 id="desk-title" className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
          <SlidersHorizontal className="size-3.5 text-primary" /> Set your desk
        </h2>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
          10 seconds · no account
        </span>
      </div>

      <div className="space-y-2.5 px-3 py-3">
        <p className="max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
          Three answers, and the wire tilts toward the papers you actually sit. Stored in this browser.
        </p>

        <Segmented
          label="Exam"
          value={draft.exam}
          onChange={(value) => setDraft((prev) => ({ ...prev, exam: value as ExamTrack }))}
          options={[
            { value: "upsc", label: "UPSC CSE" },
            { value: "state", label: "State PSC" },
          ]}
        />

        <Segmented
          label="Stage"
          value={draft.stage}
          onChange={(value) => setDraft((prev) => ({ ...prev, stage: value as DeskStage }))}
          options={[
            { value: "all", label: "Both" },
            { value: "prelims", label: "Prelims" },
            { value: "mains", label: "Mains" },
          ]}
        />

        <Segmented
          label="Optional"
          value={draft.optional}
          onChange={(value) => setDraft((prev) => ({ ...prev, optional: value as OptionalId | "all" }))}
          options={[
            { value: "all", label: "All" },
            ...OPTIONAL_LIST.map((optional) => ({ value: optional.id, label: optional.short, title: optional.label })),
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <p className="max-w-md text-[10.5px] leading-relaxed text-muted-foreground">
            Optional fit is a tilt, not a filter. You will still see the full wire.
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skip}
              disabled={pending}
              className="h-8 rounded-sm px-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              Not now
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={pending}
              className="h-8 rounded-sm px-3 font-mono text-[9.5px] uppercase tracking-[0.12em]"
            >
              {pending ? "Saving…" : "Save desk"} <Check className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
