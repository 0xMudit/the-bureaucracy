"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

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

function unblockHint(): string {
  switch (browserName()) {
    case "firefox":
      return "Permissions → Notifications → Allow, then reload.";
    case "safari":
      return "Settings for This Website → Notifications → Allow, then reload.";
    case "edge":
      return "Permissions → Notifications → Allow, then reload.";
    case "chrome":
      return "Site settings → Notifications → Allow, then reload.";
    default:
      return "Allow notifications in site settings, then reload.";
  }
}

/**
 * Notifications and location permissions.
 *
 * Browsers only allow the native prompt from a user gesture, and a denied
 * permission cannot be re-prompted at all. This used to render a card pinned to
 * the bottom of the viewport; it now asks through the toast layer so the
 * request stays out of the reading column and every prompt carries its own
 * action button.
 */
export function PermissionPrompt() {
  const router = useRouter();
  const [permission, setPermission] = React.useState<PermissionState>("default");
  const [status, setStatus] = React.useState<PushStatus | null>(null);
  const [ready, setReady] = React.useState(false);
  const [pushDismissed, setPushDismissed] = React.useState(false);
  const [geoDismissed, setGeoDismissed] = React.useState(false);
  const [blockedDismissed, setBlockedDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState<"push" | "geo" | null>(null);
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
      .catch(() => undefined)
      .finally(() => setReady(true));
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
    if (busy !== null) return;
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
        if (ok) {
          toast.add({
            type: "success",
            title: "Notifications on",
            description: "At most two pushes a day. Quiet hours respected.",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const useLocation = async () => {
    if (busy !== null) return;
    if (!("geolocation" in navigator)) {
      toast.add({ type: "error", title: "This browser does not expose location." });
      return;
    }
    setBusy("geo");
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
            toast.add({ type: "error", title: payload.error ?? "Could not resolve your state." });
            return;
          }
          setStatus((current) =>
            current ? { ...current, state: payload.state ?? null, district: current.district } : current,
          );
          toast.add({
            type: "success",
            title: `Saved: ${payload.state}`,
            description: "Only your state and district are stored.",
          });
          router.refresh();
        } catch {
          toast.add({ type: "error", title: "Could not save your state. Try again." });
        } finally {
          setBusy(null);
        }
      },
      (error) => {
        setBusy(null);
        if (error.code === error.PERMISSION_DENIED) {
          toast.add({
            type: "error",
            title: "Location is blocked",
            description: "Allow it from this site's browser settings, then try again.",
          });
        } else {
          toast.add({ type: "error", title: "Could not read your location. You can choose your state in account settings." });
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  // The effect reads handlers through a ref so re-renders don't re-open toasts.
  const handlers = React.useRef({ enablePush, useLocation });
  handlers.current = { enablePush, useLocation };

  const openIds = React.useRef<{ push?: string; geo?: string; blocked?: string }>({});
  const needsPush = permission === "default" || (permission === "granted" && Boolean(status?.signedIn) && !status?.subscribed);
  const needsLocation = Boolean(status?.signedIn && !status.state);
  const blocked = permission === "denied";

  React.useEffect(() => {
    if (!ready) return;
    const ids = openIds.current;

    if (blocked && !blockedDismissed) {
      if (!ids.blocked) {
        ids.blocked = toast.add({
          type: "warning",
          title: "Notifications are blocked",
          description: unblockHint(),
          timeout: 0,
          actionProps: {
            children: "Open settings",
            onClick: () => router.push("/account/notifications"),
          },
          onClose: () => {
            ids.blocked = undefined;
            setBlockedDismissed(true);
          },
        });
      }
    } else if (ids.blocked) {
      toast.close(ids.blocked);
      ids.blocked = undefined;
    }

    if (needsPush && !pushDismissed) {
      if (!ids.push) {
        ids.push = toast.add({
          type: "info",
          title: iosHomeScreen ? "Add the site to your Home Screen" : "Notifications are off",
          description: iosHomeScreen
            ? "Safari only delivers web push to an installed site. Share → Add to Home Screen, then turn them on."
            : "At most two a day, quiet hours respected.",
          timeout: 0,
          ...(iosHomeScreen
            ? {}
            : {
                actionProps: {
                  children: "Turn on",
                  onClick: () => {
                    void handlers.current.enablePush();
                  },
                },
              }),
          onClose: () => {
            ids.push = undefined;
            setPushDismissed(true);
          },
        });
      }
    } else if (ids.push) {
      toast.close(ids.push);
      ids.push = undefined;
    }

    if (needsLocation && !geoDismissed) {
      if (!ids.geo) {
        ids.geo = toast.add({
          type: "info",
          title: "Set your state",
          description: "Coordinates are never stored.",
          timeout: 0,
          actionProps: {
            children: "Use location",
            onClick: () => {
              void handlers.current.useLocation();
            },
          },
          onClose: () => {
            ids.geo = undefined;
            setGeoDismissed(true);
          },
        });
      }
    } else if (ids.geo) {
      toast.close(ids.geo);
      ids.geo = undefined;
    }
  }, [ready, blocked, blockedDismissed, needsPush, pushDismissed, needsLocation, geoDismissed, iosHomeScreen, router]);

  return null;
}

/** TS lib dom types want BufferSource; Uint8Array is accepted at runtime. */
function urlToBuffer(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
