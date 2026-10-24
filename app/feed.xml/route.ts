import { SITE, NEWS_WINDOW_MS } from "@/lib/config";
import { cachedItems } from "@/lib/cached";
import { buildFeed } from "@/lib/rank";
import { OPTIONALS, TOPICS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const cutoff = Date.now() - NEWS_WINDOW_MS;
  const all = await cachedItems();
  const fresh = all.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
  const items = buildFeed(fresh, { sort: "top", limit: 30 });

  const entries = items
    .map((item) => {
      const topic = item.primaryTopic ? TOPICS[item.primaryTopic] : null;
      const optional = item.primaryOptional ? OPTIONALS[item.primaryOptional] : null;
      const link = `${SITE.url}/item/${item.id}`;
      const description = `${item.summary || "Open the original for the full report."}${
        optional ? ` Optional: ${optional.label}.` : ""
      }`;
      return `    <item>
      <title>${xml(item.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <description>${xml(description)}</description>
      <source url="${xml(item.url)}">${xml(item.source)}</source>
      ${topic ? `<category>${xml(topic.label)}</category>` : ""}
      ${optional ? `<category>${xml(optional.label)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE.name)} — UPSC news, ranked for the syllabus</title>
    <link>${SITE.url}</link>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${xml(SITE.description)}</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>15</ttl>
    <generator>Next.js</generator>
${entries}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
