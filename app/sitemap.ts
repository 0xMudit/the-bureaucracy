import type { MetadataRoute } from "next";
import { SITE, NEWS_WINDOW_MS } from "@/lib/config";
import { listItems } from "@/lib/store";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE.url}/syllabus`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE.url}/optional`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/submit`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const cutoff = Date.now() - NEWS_WINDOW_MS;
  try {
    const items = await listItems();
    const fresh = items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    return [
      ...staticRoutes,
      ...fresh.map((item) => ({
        url: `${SITE.url}/item/${item.id}`,
        lastModified: new Date(item.fetchedAt),
        changeFrequency: "hourly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
