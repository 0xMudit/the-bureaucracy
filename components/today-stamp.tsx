"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/config";

export function TodayStamp() {
  const [label, setLabel] = useState("24-hour wire");

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date());
    setLabel(format());
    const timer = setInterval(() => setLabel(format()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="block min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] lg:text-[10px]">
      {label} · IST · {SITE.shortName}
    </span>
  );
}
