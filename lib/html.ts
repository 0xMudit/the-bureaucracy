export function decodeEntities(s: string): string {
  if (!s) return s;
  let t = s;
  t = t.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (m) => m.slice(9, -3));
  t = t.replace(/&amp;/g, "&");
  t = t.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  t = t.replace(/&quot;/g, '"').replace(/&#34;/g, '"');
  t = t.replace(/&#39;/g, "'").replace(/&apos;/g, "'");
  t = t.replace(/&nbsp;/g, " ");
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  t = t.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  t = t.replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&lsquo;/g, "‘").replace(/&rsquo;/g, "’");
  t = t.replace(/&mdash;/g, "—").replace(/&ndash;/g, "–");
  t = t.replace(/&hellip;/g, "...");
  return t;
}

export function stripTags(s: string): string {
  if (!s) return s;
  let t = s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export function cleanText(s: string): string {
  return stripTags(decodeEntities(s));
}

export function extractTag(html: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  if (!m) return undefined;
  return m[1];
}

export function extractAll(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

export function extractAttr(tagStr: string, name: string): string | undefined {
  const re = new RegExp(name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const m = tagStr.match(re);
  if (m) return m[2];
  const re2 = new RegExp(name + "\\s*=\\s*([^\"'\\s>]+)", "i");
  const m2 = tagStr.match(re2);
  if (m2) return m2[1];
  return undefined;
}

export function absolutize(href: string, base: string): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h) return null;
  if (h.startsWith("javascript:") || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) return null;
  if (h.startsWith("data:")) return null;
  try {
    const u = new URL(h, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

export function canonicalize(url: string): string {
  try {
    const u = new URL(url);
    const bad = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id","fbclid","gclid","igshid","mc_cid","mc_eid","ref","ref_src"];
    for (const b of bad) u.searchParams.delete(b);
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("?")) s = s.slice(0, -1);
    return s;
  } catch {
    return url;
  }
}
