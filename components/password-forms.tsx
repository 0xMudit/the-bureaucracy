"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, MailCheck, Send } from "lucide-react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type ForgotState,
  type ResetState,
} from "@/app/auth/password-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORGOT_INITIAL: ForgotState = {};
const RESET_INITIAL: ResetState = {};

export function ForgotPasswordForm({ email = "" }: { email?: string }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, FORGOT_INITIAL);

  if (state.sent) {
    return (
      <div className="border-l-2 border-success bg-success/10 px-3 py-3" role="status" aria-live="polite">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-success">
          <CheckCircle2 className="size-3.5" /> Check your inbox
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          If an account exists for <span className="font-mono text-foreground">{email || "that address"}</span>, a
          reset link is on its way. It expires after an hour and works once.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Account email
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
        disabled={pending}
        className="h-11 w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] sm:h-10"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, RESET_INITIAL);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          New password
        </span>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Repeat it
        </span>
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Same password again"
          required
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={mismatch}
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      {mismatch ? (
        <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
          The two passwords do not match.
        </p>
      ) : null}

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
        disabled={pending || mismatch}
        className="h-11 w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] sm:h-10"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Set new password
      </Button>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <MailCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Setting a new password signs you out everywhere else.
      </p>
    </form>
  );
}
