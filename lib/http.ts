const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, application/xhtml+xml, */*",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTextSafe(url: string, timeoutMs = 20000): Promise<{ ok: boolean; text?: string; error?: string; status?: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, application/xhtml+xml, */*",
          "accept-language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status, text };
      return { ok: true, text, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

