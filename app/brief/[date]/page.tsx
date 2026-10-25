import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBrief } from "@/components/public-brief";
import { frozenBrief } from "@/lib/brief-store";
import { SITE } from "@/lib/config";
import { humanDate, istDateKey } from "@/lib/progress";

export const revalidate = 300;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    value <= istDateKey()
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!validDay(date)) return { title: "Brief not found", robots: { index: false, follow: false } };

  const brief = await frozenBrief(date);
  if (!brief) return { title: "Brief not found", robots: { index: false, follow: false } };

  const lead = brief.entries[0];
  const label = humanDate(date);
  return {
    title: `${label} · The daily brief`,
    description: lead
      ? `${lead.title} — and four more stories ranked for the syllabus on ${label}.`
      : `The daily brief for ${label}.`,
    alternates: { canonical: `/brief/${date}` },
    openGraph: {
      type: "article",
      url: `${SITE.url}/brief/${date}`,
      title: `${label} · The Bureaucracy daily brief`,
      description: lead ? `${lead.title} — plus four more, with the syllabus angle.` : undefined,
    },
  };
}

export default async function ArchivedBriefPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!validDay(date)) notFound();

  const brief = await frozenBrief(date);
  if (!brief) notFound();

  return <PublicBrief day={date} entries={brief.entries} today={istDateKey()} />;
}
