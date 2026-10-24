"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Records one page view per navigation. No third-party tracker involved. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({ path: pathname, referrer: document.referrer || null });
    const timer = window.setTimeout(() => {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
