"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Loader2, MapPin, ShieldAlert, Smartphone, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface PushStatus {
  signedIn: boolean;
  subscribed: boolean;
  state: string | null;
  district: string | null;
}

function urlBase64ToBytes(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function browserName(): "chrome" | "firefox" | "safari" | "edge" | "other" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("chrome") || ua.includes("crios")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "other";
}

function unblockSteps(): string[] {
  switch (browserName()) {
    case "firefox":
      return ["Click the lock icon in the address bar.", "Open Permissions → Notifications.", "Choose Allow for this site."];
    case "safari":
      return ["Open Safari → Settings for This Website.", "Find Notifications.", "Choose Allow."];
    case "edge":
      return ["Click the lock/tune icon in the address bar.", "Open Permissions → Notifications.", "Choose Allow."];
    case "chrome":
      return ["Click the lock/tune icon in the address bar.", "Open Site settings → Notifications.", "Choose Allow and reload."];
    default:
      return ["Open your browser's site settings for this address.", "Find Notifications.", "Choose Allow and reload."];
  }
}

/**
 * Notifications and location permissions.
 *
 * Browsers only allow the native prompt from a user gesture, and a denied
 * permission cannot be re-prompted at all. This banner therefore does three
 * things: explains the value on every visit while the state is `default`,
 * requests the prompt only on tap, and shows the exact unblock path when the
 * state is `denied`.
 */
export function PermissionPrompt() {
  const router = useRouter();
  const [permission, setPermission] = React.useState<PermissionState>("default");
  const [status, setStatus] = React.useState<PushStatus | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [geoDismissed, setGeoDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState<"push" | "geo" | null>(null);
  const [geoMessage, setGeoMessage] = React.useState<string | null>(null);
  const [iosHomeScreen, setIosHomeScreen] = React.useState(false);

  React.useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setPermission(supported ? (Notification.permission as PermissionState) : "unsupported");

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosHomeScreen(ios && !standalone);

    fetch("/api/push/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setStatus(data as PushStatus))
      .catch(() => undefined);
  }, []);

  const subscribe = React.useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) return false;
    try {
      const keyResponse = await fetch("/api/push/vapid", { cache: "no-store" });
      const keyPayload = (await keyResponse.json()) as { ok: boolean; key?: string };
      if (!keyPayload.ok || !keyPayload.key) {
        toast.add({
          type: "error",
          title: "Push is not configured on this deployment",
          description: "Add VAPID keys to enable notifications.",
        });
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlToBuffer(urlBase64ToBytes(keyPayload.key)),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 401) {
          toast.add({ type: "error", title: "Log in to enable push", description: "The notification centre and alerts need an account." });
        } else {
          toast.add({ type: "error", title: payload?.error ?? "Could not enable push on this browser." });
        }
        return false;
      }
      setStatus((current) => (current ? { ...current, subscribed: true } : current));
      return true;
    } catch {
      toast.add({ type: "error", title: "Could not enable push on this browser." });
      return false;
    }
  }, []);

  const enablePush = async () => {
    if (!status?.signedIn) {
      toast.add({
        type: "info",
        title: "Log in to keep your notifications in one place",
        description: "You can also enable this from account settings after signing in.",
      });
      return;
    }
    setBusy("push");
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === "granted") {
        const ok = await subscribe();
        if (ok) toast.add({ type: "success", title: "Notifications on", description: "At most two pushes a day. Quiet hours respected." });
      }
    } finally {
      setBusy(null);
    }
  };

  const useLocation = async () => {
    if (!("geolocation" in navigator)) {
      setGeoMessage("This browser does not expose location.");
      return;
    }
    setBusy("geo");
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
          setStatus((current) =>
            current ? { ...current, state: payload.state ?? null, district: current.district } : current,
          );
          setGeoMessage(`Saved: ${payload.state}. Only your state and district are stored.`);
          router.refresh();
        } finally {
          setBusy(null);
        }
      },
      (error) => {
        setBusy(null);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage("Location is blocked. Open your browser's site settings, find Location and allow it.");
        } else {
          setGeoMessage("Could not read your location. You can choose your state in account settings.");
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  const needsPush = permission === "default" || (permission === "granted" && status?.signedIn && !status.subscribed);
  const needsLocation = Boolean(status?.signedIn && !status.state && !geoDismissed);
  const blocked = permission === "denied";

  if (!needsPush && !needsLocation && !blocked) return null;
  if (dismissed && !blocked) return null;

  return (
    <aside
      aria-label="Notification and location permissions"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-2 bottom-2 z-[90] flex justify-center sm:inset-x-4 sm:bottom-4"
    >
      <div className="pointer-events-auto w-full max-w-lg border border-border bg-card p-3 shadow-lg shadow-foreground/10">
        {blocked ? (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  <p className="text-[12.5px] font-medium">Notifications are blocked in this browser.</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Browsers do not allow this site to ask again. Unblock it from site settings:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss blocked notification notice for now"
                className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-8 text-[11px] leading-relaxed text-muted-foreground">
              {unblockSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link href="/account/notifications" className="mt-2 inline-flex text-[10px] uppercase tracking-[0.1em] text-primary hover:underline">
              Open notification settings
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[12.5px] font-medium">One nudge at 7am, and only if it matters.</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Today&apos;s five when the wire turns, a streak warning at dusk, replies to your comments and
                    new followers. At most two pushes a day; quiet hours respected.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss permission prompt"
                className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {iosHomeScreen ? (
              <div className="mt-3 border-l-2 border-warning bg-warning/10 px-2.5 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-warning">
                  <Smartphone className="size-3.5" /> iPhone / iPad
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Safari only delivers web push when this site is installed. Tap Share →{" "}
                  <strong className="font-medium text-foreground">Add to Home Screen</strong>, open it from the home
                  screen, then enable notifications here.
                </p>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={enablePush} disabled={busy !== null} className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
                  {busy === "push" ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
                  Enable notifications
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)} className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
                  Not now
                </Button>
              </div>
            )}

            {needsLocation ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <strong className="font-medium text-foreground">State-level personalisation.</strong> Used once
                      to find your state and district; coordinates are discarded, never stored.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeoDismissed(true)}
                    aria-label="Dismiss location prompt"
                    className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={useLocation} disabled={busy !== null} className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.1em]">
                    {busy === "geo" ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
                    Use my location
                  </Button>
                  <Link href="/account/notifications" className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
                    Choose manually
                  </Link>
                </div>
                {geoMessage ? (
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">{geoMessage}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

/** TS lib dom types want BufferSource; Uint8Array is accepted at runtime. */
function urlToBuffer(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
