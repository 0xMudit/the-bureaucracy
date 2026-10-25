import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card">
        <CloudOff className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <h1 className="display mt-5 text-[2.2rem] leading-none">The wire is off the desk.</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        You are offline. Pages you have already opened stay readable from the cache; reactions and comments will
        resume when the connection returns.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Try the wire again</Link>
      </Button>
    </div>
  );
}
