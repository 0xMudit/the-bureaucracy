import { cleanText, decodeEntities, extractAttr, canonicalize } from "./html";
import type { SourceConfig } from "./sources";
import type { SourceTier } from "./types";

export { decodeEntities, cleanText as stripHtml } from "./html";

export interface RawItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  tier: SourceTier;
  /** media:content / media:thumbnail / enclosure / inline <img>. */
  imageUrl?: string | null;
}

interface ParsedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  sourceName?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

/** Pull the first plausible image out of an RSS item block. */
function getImage(block: string): string | undefined {
  const mediaTags = block.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi) ?? [];
  for (const tag of mediaTags) {
    const url = extractAttr(tag, "url");
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const type = extractAttr(tag, "type") ?? "";
    if (type && !type.toLowerCase().startsWith("image/")) continue;
    return url;
  }
  const description =
    getTagContent(block, "description") ??
    getTagContent(block, "content:encoded") ??
    "";
  const inline = description.match(/<img\b[^>]*src\s*=\s*["']([^"']+)["']/i);
  if (inline && /^https?:\/\//i.test(inline[1])) return inline[1];
  return undefined;
}

function getTagContent(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return undefined;
  const value = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeEntities(value).trim();
}

function getAtomLink(block: string): string | undefined {
  const re = /<link[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const tag = m[0];
    const href = extractAttr(tag, "href");
    if (!href) continue;
    const rel = extractAttr(tag, "rel");
    if (!rel || rel === "alternate") return href;
    if (!rel.includes("self")) return href;
  }
  return undefined;
}

export function parseRss(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const reItem = /<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;
  while ((m = reItem.exec(xml))) {
    const block = m[0];
    const title = getTagContent(block, "title");
    if (!title) continue;

    let link = getTagContent(block, "link");
    if (!link || !/^https?:\/\//i.test(link)) link = getAtomLink(block);
    if (!link || !/^https?:\/\//i.test(link)) continue;

    const summary =
      getTagContent(block, "description") ||
      getTagContent(block, "summary") ||
      getTagContent(block, "content:encoded") ||
      getTagContent(block, "content");

    const pubDate =
      getTagContent(block, "pubDate") ||
      getTagContent(block, "published") ||
      getTagContent(block, "updated") ||
      getTagContent(block, "dc:date");

    const sourceMatch = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
    const sourceUrl = sourceMatch ? extractAttr(sourceMatch[1], "url") : undefined;
    const sourceName = sourceMatch ? cleanText(sourceMatch[2]) : undefined;

    items.push({
      title: cleanText(title),
      link,
      description: summary ? cleanText(summary).slice(0, 420) : undefined,
      pubDate,
      sourceName: sourceName ? sourceName.slice(0, 60) : undefined,
      sourceUrl: sourceUrl || undefined,
      imageUrl: getImage(block),
    });
  }
  return items;
}

function headerSafe(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function fetchFeed(source: SourceConfig): Promise<RawItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 TheBureaucracy/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "accept-language": "en-IN,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml || xml.length < 80) throw new Error("Empty feed");

    const parsed = parseRss(xml);
    return parsed.slice(0, 80).flatMap((item) => {
      const link = canonicalUrl(item.link);
      if (!/^https?:\/\//i.test(link)) return [];
      const sourceName = headerSafe(item.sourceName || source.name);
      const sourceUrl = item.sourceUrl || source.homepage || `https://${hostOf(link)}`;
      const publishedAt = item.pubDate && !Number.isNaN(Date.parse(item.pubDate))
        ? new Date(item.pubDate).toISOString()
        : null;
      return [{
        title: item.title,
        link,
        summary: item.description || "",
        publishedAt,
        sourceName,
        sourceUrl,
        tier: source.tier,
        imageUrl: item.imageUrl ?? null,
      }];
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export function canonicalUrl(url: string): string {
  return canonicalize(url.trim());
}

/** Text-only form used for duplicate detection, not for display. */
export function normalizeTitle(title: string): string {
  return cleanText(title)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
