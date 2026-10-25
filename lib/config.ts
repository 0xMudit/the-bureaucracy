export const SITE = {
  name: "The Bureaucracy",
  shortName: "Bureaucracy",
  tagline: "Civil-services intelligence, ranked.",
  description:
    "A Hacker News-style radar for UPSC and state PSC aspirants. Only the last 24 hours of policy, polity, economy and environment news, ranked by exam relevance.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  github: "https://github.com/0xMudit/the-bureaucracy",
  author: "0xMudit",
  editor: {
    name: "Muditya Raghav",
    email: "0xmudit@gmail.com",
  },
  keywords: [
    "UPSC", "current affairs", "civil services", "state PSC", "news aggregator",
    "polity", "economy", "environment", "government schemes", "PIB", "exam preparation",
  ],
} as const;

/** The product promise: a rolling 24-hour window, nothing older. */
export const NEWS_WINDOW_HOURS = 24;
export const NEWS_WINDOW_MS = NEWS_WINDOW_HOURS * 3_600_000;

/**
 * A syllabus feed is only credible if everything on it clears the bar. Below
 * this score a story is still reachable by search or a direct link, but it does
 * not sit next to exam material.
 */
export const FEED_MIN_SCORE = 35;

/** Client-side refresh cadence for the live feed. */
export const AUTO_REFRESH_MS = 5 * 60_000;

/** How often the wire should be re-ingested (GitHub Action schedule). */
export const INGEST_INTERVAL_MINUTES = 15;
