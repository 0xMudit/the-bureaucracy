import type { MetadataRoute } from "next";
import { SITE, NEWS_WINDOW_MS } from "@/lib/config";
import { recentBriefDays } from "@/lib/brief-store";
import { listItems } from "@/lib/store";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE.url}/brief`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/syllabus`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE.url}/optional`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE.url}/subscribe`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/submit`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const dynamic: MetadataRoute.Sitemap = [];
  const cutoff = Date.now() - NEWS_WINDOW_MS;

  try {
    const items = await listItems();
    const fresh = items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    dynamic.push(
      ...fresh.map((item) => ({
        url: `${SITE.url}/item/${item.id}`,
        lastModified: new Date(item.fetchedAt),
        changeFrequency: "hourly" as const,
        priority: 0.6,
      })),
    );
  } catch {
    // A database outage should not take the sitemap down with it.
  }

  try {
    const days = await recentBriefDays(60);
    dynamic.push(
      ...days.map((day) => ({
        url: `${SITE.url}/brief/${day}`,
        lastModified: new Date(`${day}T12:00:00Z`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    );
  } catch {
    // Same: the archive is additive.
  }

  return [...staticRoutes, ...dynamic];
}
