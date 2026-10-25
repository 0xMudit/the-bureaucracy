import type { Metadata } from "next";
import Link from "next/link";
import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = {
  title: "Saved",
  description: "Your reading list from the last 24 hours of The Bureaucracy.",
  alternates: { canonical: "/saved" },
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Your desk</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.6rem]">
          Reading list.
        </h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
          Saved stories live in this browser only. They leave the public wire after 24 hours, so older saves open
          at the publisher and come back for revision on day 1, 3, 7 and 30.
        </p>
      </div>

      <div className="mt-6">
        <SavedList />
      </div>

      <p className="mt-6 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        No account, no server-side profile.{" "}
        <Link href="/" className="text-primary hover:underline">
          Return to the wire
        </Link>
        .
      </p>
    </div>
  );
}
