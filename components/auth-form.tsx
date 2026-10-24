"use client";

import { useActionState, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { signInAction, signUpAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const INITIAL: AuthState = {};

export function AuthForm({ next = "/", initialMode = "signin" }: { next?: string; initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [signInState, signIn, signingIn] = useActionState(signInAction, INITIAL);
  const [signUpState, signUp, signingUp] = useActionState(signUpAction, INITIAL);

  const state = mode === "signin" ? signInState : signUpState;
  const action = mode === "signin" ? signIn : signUp;
  const pending = mode === "signin" ? signingIn : signingUp;

  return (
    <div>
      <div className="flex border border-border bg-card" role="tablist" aria-label="Account">
        {(
          [
            { key: "signin", label: "Sign in" },
            { key: "signup", label: "Create account" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mode === tab.key}
            onClick={() => setMode(tab.key)}
            className={cn(
              "flex-1 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              mode === tab.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="next" value={next} />

        {mode === "signup" ? (
          <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Display name
            </span>
            <Input
              name="name"
              autoComplete="name"
              placeholder="How your comments will appear"
              required
              minLength={2}
              maxLength={48}
              className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Email
          </span>
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Password
          </span>
          <Input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
            required
            minLength={mode === "signin" ? 1 : 8}
            className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
          />
        </label>

        {state.error ? (
          <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-xs leading-relaxed text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="h-11 w-full rounded-sm font-mono text-[10px] uppercase tracking-[0.14em] sm:h-10">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "signin" ? (
            <LogIn className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("signup")} className="underline hover:text-foreground">
              Create an account
            </button>{" "}
            to comment and submit links.
          </>
        ) : (
          <>
            Already registered?{" "}
            <button type="button" onClick={() => setMode("signin")} className="underline hover:text-foreground">
              Sign in
            </button>
            .
          </>
        )}
      </p>
    </div>
  );
}
