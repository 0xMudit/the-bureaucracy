"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTO_REFRESH_MS } from "@/lib/config";

/** Keeps the 24-hour wire current without a full reload. */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    // Falls back to a server-side fetch when the scheduled ingest is late.
    const ping = () => {
      fetch("/api/pulse", { cache: "no-store", keepalive: true }).catch(() => {});
    };
    const refresh = () => {
      last = Date.now();
      ping();
      router.refresh();
    };
    ping();
    const timer = setInterval(refresh, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > AUTO_REFRESH_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
