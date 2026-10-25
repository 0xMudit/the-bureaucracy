"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, Loader2, MapPin, Save, XCircle } from "lucide-react";
import {
  updateLocationAction,
  updateNotificationPrefsAction,
  type PrefState,
} from "@/app/account/notification-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface PrefValues {
  dailyBrief: boolean;
  streakAtRisk: boolean;
  replies: boolean;
  commentLikes: boolean;
  follows: boolean;
  locationAlerts: boolean;
  quietStart: string;
  quietEnd: string;
  maxPerDay: number;
  timezone: string;
}

const ROWS: { key: keyof PrefValues; label: string; hint: string }[] = [
  { key: "dailyBrief", label: "Today's five at 07:00 IST", hint: "One push when the wire turns." },
  { key: "streakAtRisk", label: "Streak at risk", hint: "An evening nudge only if you have not read today." },
  { key: "replies", label: "Replies to my comments", hint: "When someone answers you in a thread." },
  { key: "commentLikes", label: "Likes on my comments", hint: "A quiet signal that the argument landed." },
  { key: "follows", label: "New followers", hint: "When a reader adds your desk to their circle." },
  { key: "locationAlerts", label: "State and district alerts", hint: "Cyclone, flood and state-PSC news for your area." },
];

export function NotificationPrefsForm({
  initial,
  location,
}: {
  initial: PrefValues;
  location: { state: string | null; district: string | null };
}) {
  const [state, action, pending] = useActionState(updateNotificationPrefsAction, {} as PrefState);
  const [values, setValues] = React.useState(initial);
  const [geoBusy, setGeoBusy] = React.useState(false);
  const [geoMessage, setGeoMessage] = React.useState<string | null>(null);

  const toggle = (key: keyof PrefValues) => (checked: boolean) =>
    setValues((current) => ({ ...current, [key]: checked }));

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoMessage("This browser does not expose location.");
      return;
    }
    setGeoBusy(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/location/reverse", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ lat: position.coords.latitude, lon: position.coords.longitude }),
          });
          const payload = (await response.json()) as { ok: boolean; state?: string; error?: string };
          if (!payload.ok) {
            setGeoMessage(payload.error ?? "Could not resolve your state.");
            return;
          }
          setGeoMessage(`Saved: ${payload.state}. Coordinates were discarded.`);
        } finally {
          setGeoBusy(false);
        }
      },
      (error) => {
        setGeoBusy(false);
        setGeoMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location is blocked in this browser. Allow it in site settings, or enter your state below."
            : "Could not read your location. Enter your state below.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-0 border border-border bg-card">
        <input type="hidden" name="dailyBrief" value={String(values.dailyBrief)} />
        <input type="hidden" name="streakAtRisk" value={String(values.streakAtRisk)} />
        <input type="hidden" name="replies" value={String(values.replies)} />
        <input type="hidden" name="commentLikes" value={String(values.commentLikes)} />
        <input type="hidden" name="follows" value={String(values.follows)} />
        <input type="hidden" name="locationAlerts" value={String(values.locationAlerts)} />
        <input type="hidden" name="timezone" value={values.timezone} />

        {ROWS.map((row) => (
          <div key={row.key} className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{row.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{row.hint}</p>
            </div>
            <Switch
              checked={Boolean(values[row.key])}
              onCheckedChange={toggle(row.key)}
              aria-label={row.label}
            />
          </div>
        ))}

        <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Quiet hours start
            </span>
            <Input
              type="time"
              name="quietStart"
              value={values.quietStart}
              onChange={(event) => setValues((current) => ({ ...current, quietStart: event.target.value }))}
              className="h-10 rounded-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Quiet hours end
            </span>
            <Input
              type="time"
              name="quietEnd"
              value={values.quietEnd}
              onChange={(event) => setValues((current) => ({ ...current, quietEnd: event.target.value }))}
              className="h-10 rounded-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Maximum pushes a day
            </span>
            <select
              name="maxPerDay"
              value={values.maxPerDay}
              onChange={(event) => setValues((current) => ({ ...current, maxPerDay: Number(event.target.value) }))}
              className="h-10 w-full rounded-sm border border-input bg-background px-2 text-sm"
            >
              <option value={0}>None</option>
              <option value={1}>One</option>
              <option value={2}>Two (recommended)</option>
            </select>
          </label>
        </div>

        {state.error ? (
          <p role="alert" className="mx-4 mb-4 flex items-start gap-1.5 border-l-2 border-destructive bg-destructive/5 px-2.5 py-2 text-[11.5px] leading-relaxed text-destructive">
            <XCircle className="mt-0.5 size-3.5 shrink-0" /> {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="mx-4 mb-4 flex items-start gap-1.5 border-l-2 border-success bg-success/10 px-2.5 py-2 text-[11.5px] leading-relaxed text-success">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> {state.ok}
          </p>
        ) : null}

        <div className="border-t border-border px-4 py-3">
          <Button type="submit" disabled={pending} className="h-9 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save preferences
          </Button>
        </div>
      </form>

      <form action={updateLocationAction} className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">State and district</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              For state-PSC news and local alerts. Coordinates are used once and discarded.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectLocation}
            disabled={geoBusy}
            className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]"
          >
            {geoBusy ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
            Detect location
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input name="state" defaultValue={location.state ?? ""} placeholder="State (e.g. Kerala)" className="h-10 rounded-sm" />
          <Input name="district" defaultValue={location.district ?? ""} placeholder="District (optional)" className="h-10 rounded-sm" />
        </div>
        {geoMessage ? <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{geoMessage}</p> : null}
        <Button type="submit" variant="outline" className="mt-3 h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
          Save location
        </Button>
      </form>
    </div>
  );
}
