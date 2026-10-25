"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * One field, one action. No account, no preferences, no dark pattern: the only
 * thing this form does is ask Resend to send one email a day.
 */
export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "pending" | "already" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state === "sending") return;

    setState("sending");
    setMessage(null);
    setConfirmUrl(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        already?: boolean;
        pending?: boolean;
        confirmUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setState("error");
        setMessage(payload.error ?? "The subscription could not be saved.");
        return;
      }

      if (payload.already) {
        setState("already");
        setMessage("You are already on the list. Tomorrow's brief is on its way.");
        return;
      }

      setState("pending");
      setMessage("Check your inbox for one confirmation link. Then the 7am brief starts.");
      if (payload.confirmUrl) setConfirmUrl(payload.confirmUrl);
    } catch {
      setState("error");
      setMessage("The server could not be reached. Try again.");
    }
  }

  if (state === "pending" || state === "already") {
    return (
      <div className="border border-primary/40 bg-primary/5 p-5">
        <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
          <Check className="size-3.5" strokeWidth={3} />
          {state === "already" ? "Already subscribed" : "One tap left"}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{message}</p>
        {confirmUrl ? (
          <a
            href={confirmUrl}
            className="mt-3 inline-flex border border-primary bg-primary px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary-foreground"
          >
            Confirm now (no email configured)
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-border bg-card p-4">
      <label
        htmlFor="digest-email"
        className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="digest-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
        >
          {state === "sending" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {state === "sending" ? "Sending" : "Send the brief"}
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-[12px] leading-relaxed text-primary" role="status">
          {message}
        </p>
      ) : (
        <p className="mt-2 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
          One email a day at 07:00 IST · no tracking pixels · unsubscribe in one click
        </p>
      )}
    </form>
  );
}
