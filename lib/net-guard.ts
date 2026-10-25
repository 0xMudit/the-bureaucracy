import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound request guard for user-supplied URLs.
 *
 * The submit form lets a reader hand us any address and the server fetches it
 * to pull a headline. Without a guard that is an SSRF primitive: on a cloud
 * host `http://169.254.169.254/` reaches the instance metadata service, and
 * `http://localhost:5432` probes the private network. Redirects are the usual
 * bypass, so they are followed manually and every hop is re-validated.
 *
 * DNS rebinding between the check and the connect is still theoretically
 * possible; pinning the resolved address would close it, at the cost of
 * breaking virtual hosts that depend on SNI. The public-address check plus the
 * response-size cap is the useful 95%.
 */

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".onion",
  ".test",
  ".invalid",
  ".example",
];

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "metadata.azure.internal",
]);

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function ipv4IsPublic(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 88 && c === 99) return false; // 6to4 relay anycast
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // documentation
  if (a === 203 && b === 0 && c === 113) return false; // documentation
  if (a >= 224) return false; // multicast and reserved
  return true;
}

function ipv6IsPublic(raw: string): boolean {
  const address = raw.toLowerCase().split("%")[0];

  if (address === "::" || address === "::1") return false;

  // IPv4-mapped (::ffff:1.2.3.4) and NAT64 (64:ff9b::1.2.3.4) embed an IPv4
  // address; judge the address a request would actually reach.
  const mapped = address.match(/(?:^|:)(?:ffff:)?((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mapped) return ipv4IsPublic(mapped[1]);
  if (address.startsWith("64:ff9b:")) {
    const tail = address.split(":").pop() ?? "";
    const hex = tail.padStart(4, "0");
    const a = parseInt(hex.slice(0, 2), 16);
    const b = parseInt(hex.slice(2, 4), 16);
    return ipv4IsPublic(`0.0.${a}.${b}`) && !(a === 0 && b === 0);
  }

  if (address.startsWith("fc") || address.startsWith("fd")) return false; // unique local
  if (/^fe[89ab]/.test(address)) return false; // link-local
  if (address.startsWith("ff")) return false; // multicast
  if (address.startsWith("2001:db8")) return false; // documentation
  if (address.startsWith("100::")) return false; // discard
  return true;
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return ipv4IsPublic(address);
  if (version === 6) return ipv6IsPublic(address);
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  return BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function unsupported(message: string): Error {
  return new Error(message);
}

/**
 * Validates a URL and every address its hostname resolves to. Throws a
 * user-facing error when the target is not publicly routable.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw unsupported("That does not look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw unsupported("Only http and https links can be opened.");
  }
  if (url.username || url.password) {
    throw unsupported("That link hides credentials. Use a plain public URL.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw unsupported("That address is not reachable from the public internet.");
  }

  const literal = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal)) {
    if (!isPublicAddress(literal)) {
      throw unsupported("That address is not reachable from the public internet.");
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw unsupported("That domain could not be resolved.");
  }
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw unsupported("That address is not reachable from the public internet.");
  }

  return url;
}

/** Reads at most `maxBytes` from a response body, so a huge page cannot exhaust memory. */
export async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    throw unsupported("That page is too large to read.");
  }
  if (!res.body) return new Uint8Array();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw unsupported("That page is too large to read.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * `fetch` for a user-supplied URL: manual redirects, each hop validated,
 * bounded in both redirect count and body size.
 */
export async function fetchPublic(
  raw: string,
  options: { signal?: AbortSignal; headers?: HeadersInit; maxBytes?: number; maxRedirects?: number } = {},
): Promise<{ response: Response; url: URL }> {
  const maxRedirects = options.maxRedirects ?? 4;
  const maxBytes = options.maxBytes ?? 2_000_000;

  let current = await assertPublicHttpUrl(raw);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetch(current, {
      signal: options.signal,
      headers: options.headers,
      redirect: "manual",
    });

    if (!REDIRECT_CODES.has(response.status)) {
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw unsupported("That response is too large to read safely.");
      }
      return { response, url: current };
    }

    const location = response.headers.get("location");
    if (!location) throw unsupported("That link redirects to nowhere.");
    if (hop === maxRedirects) throw unsupported("That link redirects too many times.");

    const next = new URL(location, current);
    current = await assertPublicHttpUrl(next.toString());
  }

  throw unsupported("That link redirects too many times.");
}
