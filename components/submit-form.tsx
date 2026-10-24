"use client";

import { useActionState } from "react";
import { Loader2, Link2, PenLine } from "lucide-react";
import { submitAction, type SubmitState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: SubmitState = {};

export function SubmitForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(submitAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="url" className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Article link <span className="text-primary">*</span>
        </Label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="url"
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://example.com/report"
            required
            disabled={disabled}
            className="h-10 rounded-sm bg-background pl-9 text-sm"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Paste a news report, judgment, government release, committee report or data release. We read the page
          and map it to the syllabus.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive">
          {state.error}
        </p>
      ) : null}

      <details className="group border border-border bg-background">
        <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
          Optional: add a headline if the page blocks readers
        </summary>
        <div className="space-y-3 border-t border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Headline
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="The publisher's headline, not your summary"
              maxLength={240}
              disabled={disabled}
              aria-invalid={Boolean(state.fieldErrors?.title)}
              className="h-9 rounded-sm bg-background text-sm"
            />
            {state.fieldErrors?.title ? (
              <p className="text-[11px] text-destructive">{state.fieldErrors.title}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary" className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Excerpt / context
            </Label>
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              maxLength={700}
              placeholder="A short excerpt or the factual context. Keep it attributable."
              disabled={disabled}
              className="rounded-sm bg-background text-sm leading-relaxed"
            />
          </div>
        </div>
      </details>

      <Button
        type="submit"
        disabled={disabled || pending}
        className="h-10 w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.16em]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
        {pending ? "Reading the page…" : "Put it on the wire"}
      </Button>

      <p className="text-center font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        Submissions are public. Duplicate links are merged. Nothing survives longer than 24 hours.
      </p>
    </form>
  );
}
