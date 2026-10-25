import { decodeEntities, stripHtml } from "./rss";
import { fetchPublic, readCapped } from "./net-guard";

const MAX_PAGE_BYTES = 1_500_000;

export interface PageMetadata {
  title: string;
  description: string;
  siteName: string;
  publishedAt: string | null;
  finalUrl: string;
}

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return decodeEntities(match[1]).trim();
    }
  }
  return null;
}

export async function fetchPageMetadata(rawUrl: string): Promise<PageMetadata> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  let url = rawUrl;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const { response: res, url: finalUrl } = await fetchPublic(url, {
      signal: controller.signal,
      maxBytes: MAX_PAGE_BYTES,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-IN,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) {
      throw new Error("That link is not an HTML article.");
    }
    const charset = type.match(/charset=([^;]+)/i)?.[1]?.trim() ?? "utf-8";
    const bytes = await readCapped(res, MAX_PAGE_BYTES);
    let html: string;
    try {
      html = new TextDecoder(charset).decode(bytes);
    } catch {
      html = new TextDecoder("utf-8").decode(bytes);
    }

    const jsonLd = html.match(/"headline"\s*:\s*"([^"]{10,300})"/i)?.[1];
    const titleRaw =
      meta(html, ["og:title", "twitter:title"]) ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      jsonLd ||
      "";
    const description =
      meta(html, ["og:description", "twitter:description", "description"]) ||
      html.match(/"description"\s*:\s*"([^"]{20,600})"/i)?.[1] ||
      "";

    const siteName =
      meta(html, ["og:site_name"]) ||
      finalUrl.hostname.replace(/^www\./, "");

    const published =
      meta(html, ["article:published_time", "datePublished", "og:published_time", "pubdate"]) ||
      html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ||
      null;
    const publishedAt = published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null;

    const title = stripHtml(titleRaw).slice(0, 240);
    if (!title) throw new Error("Could not find a headline on that page.");

    return {
      title,
      description: stripHtml(description).slice(0, 700),
      siteName: stripHtml(siteName).slice(0, 60),
      publishedAt,
      finalUrl: finalUrl.toString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
