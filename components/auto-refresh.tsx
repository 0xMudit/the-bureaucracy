"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTO_REFRESH_MS } from "@/lib/config";

/** Keeps the 24-hour wire current without a full reload. */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };
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
