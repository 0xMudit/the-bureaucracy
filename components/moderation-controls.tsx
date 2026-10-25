"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border-border bg-background text-foreground hover:border-foreground",
  primary: "border-primary bg-primary text-primary-foreground hover:opacity-90",
  danger: "border-destructive/50 bg-background text-destructive hover:border-destructive",
} as const;

/**
 * Submit button for a server-action form. `confirm` asks before the form is
 * submitted; only destructive actions use it.
 */
export function ModerationButton({
  children,
  confirm,
  tone = "neutral",
}: {
  children: React.ReactNode;
  confirm?: string;
  tone?: keyof typeof TONES;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 font-mono text-[8.5px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50",
        TONES[tone],
      )}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {children}
    </button>
  );
}
