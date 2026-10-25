"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2, SkipForward } from "lucide-react";
import { onboardingAction, skipOnboardingAction, type OnboardingState } from "@/app/welcome/actions";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AvatarConfig } from "@/lib/avatar";

const INITIAL: OnboardingState = {};

export function OnboardingForm({
  name,
  username,
  avatar,
  userId,
  next,
}: {
  name: string;
  username: string;
  avatar: AvatarConfig | null;
  userId: string;
  next: string;
}) {
  const [state, action, pending] = useActionState(onboardingAction, INITIAL);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next} />

        <AvatarPicker initial={avatar} name={name} userId={userId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Byline
            </span>
            <Input
              name="name"
              defaultValue={name}
              required
              minLength={2}
              maxLength={48}
              autoComplete="name"
              className="h-11 rounded-sm bg-background text-base sm:text-sm"
            />
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              Shown on every comment and reply.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Username
            </span>
            <span className="flex items-center rounded-sm border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 font-mono text-sm text-muted-foreground">@</span>
              <Input
                name="username"
                defaultValue={username}
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_]{3,32}"
                autoComplete="username"
                className="h-11 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 sm:text-sm"
              />
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              Your public desk: /u/username. Letters, numbers and underscores.
            </span>
          </label>
        </div>

        {state.error ? (
          <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-[12px] leading-relaxed text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="submit" disabled={pending} className="h-10 rounded-sm px-5 font-mono text-[10px] uppercase tracking-[0.14em]">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
            Enter the wire
          </Button>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            Takes about twenty seconds
          </span>
        </div>
      </form>

      <form action={skipOnboardingAction} className="border-t border-dashed border-border pt-4">
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          variant="ghost"
          className="h-8 rounded-sm px-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <SkipForward className="size-3.5" /> Skip this once
        </Button>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          We will keep a quiet reminder in your account. You can change the avatar and username later.
        </p>
      </form>
    </div>
  );
}
