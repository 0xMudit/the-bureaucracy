import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` in script-src is not ideal, but Next's bootstrap and the
 * theme script are inline and a nonce would force every route to render
 * dynamically — including the prerendered robots/sitemap/icon routes, whose
 * script tags would then fail their own policy. Everything that matters is
 * still locked down: no third-party script origins, no framing, no object
 * embeds, and forms can only post back to us.
 *
 * When a nonce-based policy is adopted, generate it in `proxy.ts` and read it
 * from the request header here.
 */
function supabaseOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [url.origin, url.origin.replace(/^https:/, "wss:")];
  } catch {
    return [];
  }
}

/**
 * The browser SDK posts to the ingest host named in the DSN. Without it in
 * connect-src the policy silently drops every client-side error.
 */
function sentryOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!raw) return [];
  try {
    return [new URL(raw).origin];
  } catch {
    return [];
  }
}

const connectSrc = ["'self'", ...supabaseOrigins(), ...sentryOrigins()].join(" ");

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Source-map upload runs only when SENTRY_AUTH_TOKEN is present; without it the
 * wrapper is inert apart from attaching the release. Builds stay reproducible
 * on a machine that has no Sentry account.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  telemetry: false,
});
