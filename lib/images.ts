import { assertPublicHttpUrl, fetchPublic, readCapped } from "./net-guard";

/**
 * Article image resolution.
 *
 * Every request is made server-side through the SSRF guard in `net-guard.ts`:
 * the URL and every redirect hop must resolve to a public address, the body is
 * capped, and only HTML/image content types are accepted. A failed lookup is
 * not an ingestion failure — the UI falls back to a topic-coloured placeholder.
 */

const PAGE_LIMIT = 480_000;
const IMAGE_LIMIT = 6_000_000;
const TIMEOUT_MS = 8_000;
const UA =
  "Mozilla/5.0 (compatible; TheBureaucracyBot/1.0; +https://the-bureaucracy.vercel.app) AppleWebKit/537.36";

export interface ImageResolution {
  imageUrl: string | null;
  imageSource: string | null;
  imageAttribution: string | null;
  /** The publisher URL after redirects. Google News links need this. */
  finalUrl: string | null;
  reason?: string;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[2] ?? match[3] ?? match[4] ?? "").trim() : null;
}

function metaImage(html: string): { url: string; source: string } | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted: { keys: string[]; source: string }[] = [
    { keys: ["og:image:secure_url", "og:image:url", "og:image"], source: "og:image" },
    { keys: ["twitter:image:src", "twitter:image"], source: "twitter:image" },
  ];

  for (const group of wanted) {
    for (const tag of tags) {
      const property = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
      if (!group.keys.includes(property)) continue;
      const content = attr(tag, "content");
      if (content && /^https?:\/\//i.test(content)) return { url: content, source: group.source };
    }
  }

  // Some regional publishers only publish JSON-LD.
  const jsonLd = html.match(/"image"\s*:\s*(\{[^}]*\}|"[^"]+"|\[[^\]]*\])/i);
  if (jsonLd) {
    const inner = jsonLd[1];
    const url = inner.match(/https?:\/\/[^"\s]+/)?.[0];
    if (url) return { url, source: "json-ld" };
  }

  return null;
}

function absolute(candidate: string, base: string): string | null {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

async function usableImage(raw: string): Promise<string | null> {
  try {
    const url = await assertPublicHttpUrl(raw);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": UA, accept: "image/*" },
      });
      if (!response.ok) {
        // Plenty of CDNs reject HEAD. A short ranged GET confirms the type.
        const ranged = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "user-agent": UA, accept: "image/*", range: "bytes=0-1023" },
        });
        const type = ranged.headers.get("content-type") ?? "";
        await ranged.body?.cancel().catch(() => undefined);
        return ranged.ok && type.toLowerCase().startsWith("image/") ? url.toString() : null;
      }
      const type = response.headers.get("content-type") ?? "";
      const length = Number(response.headers.get("content-length") ?? 0);
      if (!type.toLowerCase().startsWith("image/")) return null;
      if (length > IMAGE_LIMIT) return null;
      return url.toString();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/** Resolve an image and the final publisher URL for one article. */
export async function resolveArticleImage(input: {
  url: string;
  publisher: string;
  rssImage?: string | null;
}): Promise<ImageResolution> {
  const empty: ImageResolution = {
    imageUrl: null,
    imageSource: null,
    imageAttribution: null,
    finalUrl: null,
  };

  if (input.rssImage) {
    const validated = await usableImage(input.rssImage);
    if (validated) {
      return {
        imageUrl: validated,
        imageSource: "rss",
        imageAttribution: input.publisher,
        finalUrl: null,
      };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { response, url } = await fetchPublic(input.url, {
      signal: controller.signal,
      maxBytes: PAGE_LIMIT,
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-IN,en;q=0.9",
      },
    });

    const finalUrl = url.toString();
    if (!response.ok) {
      return { ...empty, finalUrl, reason: `HTTP ${response.status}` };
    }
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("html")) return { ...empty, finalUrl, reason: "not html" };

    const bytes = await readCapped(response, PAGE_LIMIT);
    const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const found = metaImage(html);
    if (!found) return { ...empty, finalUrl, reason: "no meta image" };

    const candidate = absolute(found.url, finalUrl);
    if (!candidate) return { ...empty, finalUrl, reason: "invalid image url" };
    const validated = await usableImage(candidate);
    if (!validated) return { ...empty, finalUrl, reason: "image rejected" };

    return {
      imageUrl: validated,
      imageSource: found.source,
      imageAttribution: input.publisher,
      finalUrl,
    };
  } catch (error) {
    return {
      ...empty,
      reason: error instanceof Error ? error.message.slice(0, 160) : "fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Best-effort final URL for aggregator redirects (e.g. news.google.com). */
export async function resolveFinalUrl(raw: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const { url } = await fetchPublic(raw, {
        signal: controller.signal,
        maxBytes: 64_000,
        headers: { "user-agent": UA, accept: "text/html" },
      });
      return url.toString();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
