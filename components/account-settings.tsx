"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Mail, Save, Trash2 } from "lucide-react";
import {
  changeEmailAction,
  changePasswordAction,
  deleteAccountAction,
  updateNameAction,
  updateProfileAction,
  type DeleteState,
  type ProfileState,
  type SettingsState,
} from "@/app/account/actions";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AvatarConfig } from "@/lib/avatar";

const INITIAL: SettingsState = {};
const PROFILE_INITIAL: ProfileState = {};
const DELETE_INITIAL: DeleteState = {};

export function ProfileSettingsForm({
  name,
  username,
  avatar,
  bio,
  userId,
}: {
  name: string;
  username: string;
  avatar: AvatarConfig | null;
  bio: string;
  userId: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, PROFILE_INITIAL);

  return (
    <form action={action} className="space-y-4">
      <AvatarPicker initial={avatar} name={name} userId={userId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Display name
          </span>
          <Input
            name="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={48}
            autoComplete="name"
            className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
          />
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
              className="h-11 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 sm:h-10 sm:text-sm"
            />
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Bio <span className="normal-case tracking-normal">(optional, 160 characters)</span>
        </span>
        <Textarea
          name="bio"
          defaultValue={bio}
          rows={3}
          maxLength={160}
          placeholder="Optional. Your optional subject, state, or what you are preparing for."
          className="rounded-sm bg-background text-base sm:text-sm"
        />
      </label>

      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
        Save profile
      </Button>
    </form>
  );
}

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-xs leading-relaxed text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="flex items-center gap-1.5 border-l-2 border-emerald-600 bg-emerald-600/5 px-2.5 py-2 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5 shrink-0" /> {state.ok}
      </p>
    );
  }
  return null;
}

export function DisplayNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateNameAction, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Display name
        </span>
        <Input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={48}
          autoComplete="name"
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
        Save name
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Current password
        </span>
        <Input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
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
            className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
          />
        </label>
      </div>

      <Feedback state={state} />

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
        Change password
      </Button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Other browsers are signed out after the change. This one stays in.
      </p>
    </form>
  );
}

export function ChangeEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changeEmailAction, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          New email address
        </span>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={email}
          required
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Current password
        </span>
        <Input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      <Feedback state={state} />

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
        Send confirmation
      </Button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The address does not change until the link is opened. Open it in this browser.
      </p>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, DELETE_INITIAL);
  const [confirm, setConfirm] = useState("");

  return (
    <form action={action} className="space-y-3">
      <p className="flex items-start gap-1.5 border-l-2 border-destructive pl-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
        This deletes the login, the profile and the byline. Comments stay on their stories but lose the account
        link. It cannot be undone.
      </p>

      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Password
        </span>
        <Input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Type DELETE to confirm
        </span>
        <Input
          name="confirm"
          autoComplete="off"
          placeholder="DELETE"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="h-11 rounded-sm bg-background text-base sm:h-10 sm:text-sm"
        />
      </label>

      {state.error ? (
        <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-xs leading-relaxed text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="outline"
        disabled={pending || confirm.trim().toUpperCase() !== "DELETE"}
        className="h-10 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] text-destructive"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        Delete my account
      </Button>
    </form>
  );
}
