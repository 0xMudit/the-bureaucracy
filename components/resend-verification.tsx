"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, MailCheck, Send } from "lucide-react";
import { resendVerificationAction, type ResendState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: ResendState = {};

/**
 * Sends (or re-sends) the Supabase confirmation email. Used on the
 * "check your inbox" page and inline when an unverified user tries to sign in.
 */
export function ResendVerification({
  email = "",
  compact = false,
  label = "Resend verification link",
}: {
  email?: string;
  compact?: boolean;
  label?: string;
}) {
  const [state, action, pending] = useActionState(resendVerificationAction, INITIAL);

  if (state.sent) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex items-start gap-2 border-l-2 border-success bg-success/10 px-2.5 py-2 text-xs leading-relaxed text-success"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>
          A fresh link is on its way to <span className="font-medium">{email}</span>. It can take a minute — check
          spam before asking for another.
        </span>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      {compact ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Email address
          </span>
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue={email}
            placeholder="you@example.com"
            required
            className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
          />
        </label>
      )}

      {state.error ? (
        <p
          role="alert"
          className="border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-xs leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-11 w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] sm:h-10"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : compact ? <Send className="size-3.5" /> : <MailCheck className="size-3.5" />}
        {pending ? "Sending…" : label}
      </Button>
    </form>
  );
}
