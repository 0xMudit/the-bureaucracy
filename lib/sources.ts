import type { OptionalId, SourceTier, TopicId } from "./types";
import type { FeedItem } from "./types";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  homepage: string;
  tier: SourceTier;
  topicHint?: TopicId[];
  optionalHint?: OptionalId[];
  note?: string;
  /** Google News queries are aggregated; the publisher is read from the item. */
  aggregate?: boolean;
}

const gnews = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

export const SOURCES: SourceConfig[] = [
  {
    id: "pib",
    name: "PIB",
    url: gnews("site:pib.gov.in when:14d"),
    homepage: "https://pib.gov.in",
    tier: "official",
    aggregate: true,
    note: "Press Information Bureau releases, via Google News (English).",
  },
  {
    id: "rbi",
    name: "RBI",
    url: "https://www.rbi.org.in/pressreleases_rss.xml",
    homepage: "https://www.rbi.org.in",
    tier: "official",
    topicHint: ["economy"],
    note: "Reserve Bank of India press releases.",
  },
  {
    id: "hindu-national",
    name: "The Hindu",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    homepage: "https://www.thehindu.com/news/national/",
    tier: "news",
  },
  {
    id: "hindu-business",
    name: "The Hindu Business",
    url: "https://www.thehindu.com/business/feeder/default.rss",
    homepage: "https://www.thehindu.com/business/",
    tier: "news",
    topicHint: ["economy"],
  },
  {
    id: "hindu-science",
    name: "The Hindu Sci-Tech",
    url: "https://www.thehindu.com/sci-tech/feeder/default.rss",
    homepage: "https://www.thehindu.com/sci-tech/",
    tier: "news",
    topicHint: ["science", "environment"],
  },
  {
    id: "ie-india",
    name: "Indian Express",
    url: "https://indianexpress.com/section/india/feed/",
    homepage: "https://indianexpress.com/section/india/",
    tier: "news",
  },
  {
    id: "ie-explained",
    name: "Indian Express Explained",
    url: "https://indianexpress.com/section/explained/feed/",
    homepage: "https://indianexpress.com/section/explained/",
    tier: "analysis",
  },
  {
    id: "ie-economy",
    name: "Indian Express Economy",
    url: "https://indianexpress.com/section/business/economy/feed/",
    homepage: "https://indianexpress.com/section/business/economy/",
    tier: "news",
    topicHint: ["economy"],
  },
  {
    id: "mint",
    name: "Mint",
    url: "https://www.livemint.com/rss/news",
    homepage: "https://www.livemint.com",
    tier: "news",
  },
  {
    id: "mongabay",
    name: "Mongabay India",
    url: "https://india.mongabay.com/feed/",
    homepage: "https://india.mongabay.com",
    tier: "analysis",
    topicHint: ["environment"],
  },
  {
    id: "gn-parliament",
    name: "Parliament watch",
    url: gnews("Parliament India bill OR act when:14d"),
    homepage: "https://sansad.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["polity"],
  },
  {
    id: "gn-judiciary",
    name: "Courts watch",
    url: gnews("Supreme Court India judgment OR verdict when:14d"),
    homepage: "https://www.sci.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["polity"],
  },
  {
    id: "gn-economy",
    name: "Economy watch",
    url: gnews("RBI OR inflation OR Union Budget India when:14d"),
    homepage: "https://www.rbi.org.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["economy"],
  },
  {
    id: "gn-ir",
    name: "Diplomacy watch",
    url: gnews("India foreign policy OR Ministry of External Affairs when:14d"),
    homepage: "https://www.mea.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["ir"],
  },
  {
    id: "gn-climate",
    name: "Climate watch",
    url: gnews("India climate policy OR biodiversity when:14d"),
    homepage: "https://moef.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["environment"],
  },
  {
    id: "gn-schemes",
    name: "Schemes watch",
    url: gnews("India government scheme OR welfare when:14d"),
    homepage: "https://www.india.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["governance"],
  },
  {
    id: "gn-psir",
    name: "PSIR watch",
    url: gnews("India foreign policy OR constitution OR Parliament when:2d"),
    homepage: "https://www.mea.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["ir", "polity"],
    optionalHint: ["psir"],
    note: "Optional lens: political theory, institutions and India's external posture.",
  },
  {
    id: "gn-geography",
    name: "Geography watch",
    url: gnews("India monsoon OR earthquake OR glacier OR river OR land use when:2d"),
    homepage: "https://moef.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["environment"],
    optionalHint: ["geography"],
    note: "Optional lens: physical processes, hazards and resource geography.",
  },
  {
    id: "gn-sociology",
    name: "Sociology watch",
    url: gnews("India caste OR gender OR urbanisation OR family OR social change when:2d"),
    homepage: "https://www.india.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["society"],
    optionalHint: ["sociology"],
    note: "Optional lens: social structure, stratification and change.",
  },
  {
    id: "gn-pubadmin",
    name: "Public Admin watch",
    url: gnews("India bureaucracy OR governance OR RTI OR \"civil service reform\" when:2d"),
    homepage: "https://dopt.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["governance"],
    optionalHint: ["pubadmin"],
    note: "Optional lens: administration, accountability and policy delivery.",
  },
  {
    id: "gn-history",
    name: "History watch",
    url: gnews("India archaeology OR heritage OR \"ancient India\" OR \"medieval India\" when:2d"),
    homepage: "https://www.asi.nic.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["history"],
    optionalHint: ["history"],
    note: "Optional lens: ancient, medieval and modern India; art and heritage.",
  },
  {
    id: "gn-anthropology",
    name: "Anthropology watch",
    url: gnews("India tribal OR anthropology OR kinship OR \"tribal society\" when:2d"),
    homepage: "https://ansi.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["society"],
    optionalHint: ["anthropology"],
    note: "Optional lens: tribal societies, kinship, ritual and material culture.",
  },
  {
    id: "gn-exam",
    name: "Exam alerts",
    url: gnews("UPSC OR state public service commission notification when:30d"),
    homepage: "https://upsc.gov.in",
    tier: "aggregator",
    aggregate: true,
    topicHint: ["exam"],
  },
];

export function sourceById(id: string): SourceConfig | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Domains shown as trusted official publishers, used for the source dot. */
export const OFFICIAL_DOMAINS = [
  "pib.gov.in", "rbi.org.in", "niti.gov.in", "upsc.gov.in", "sansad.in",
  "mea.gov.in", "moef.gov.in", "india.gov.in", "sci.gov.in", "gov.in", "nic.in",
];

export function isOfficialDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function sourceTierOf(url: string, fallback: SourceTier): SourceTier {
  return isOfficialDomain(url) ? "official" : fallback;
}

const BLOCKED_DOMAINS = [
  "vajiramias.com", "vajiramandravi.com", "drishtiias.com", "visionias.in", "insightsonindia.com",
  "iasbaba.com", "adda247.com", "pw.live", "careers360.com", "jagranjosh.com",
  "testbook.com", "byjus.com", "unacademy.com", "sscadda.com", "guidely.in",
  "oliveboard.in", "practicemock.com", "ixambee.com", "studyiq.com", "onlyias.com",
  "sleepyclasses.com", "forumias.com", "civilsdaily.com", "edukemy.com",
  "lawtext.in", "lawchakra.in", "lawbeat.in", "lawtrend.in", "organiser.org",
  "latestly.com", "edexlive.com", "careerindia.com", "sarkariresult.com",
];

export function isBlockedSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Known publishers get a small ranking edge over unknown aggregator blogs. */
const QUALITY_DOMAINS = [
  "thehindu.com", "indianexpress.com", "livemint.com", "business-standard.com",
  "economictimes.indiatimes.com", "moneycontrol.com", "ndtv.com", "theprint.in",
  "scroll.in", "thewire.in", "deccanherald.com", "telegraphindia.com",
  "tribuneindia.com", "hindustantimes.com", "timesofindia.indiatimes.com",
  "indiatoday.in", "reuters.com", "bbc.com", "bbc.co.uk", "mongabay.com",
  "down to earth.org.in", "downtoearth.org.in", "livelaw.in", "barandbench.com",
  "sansad.in", "prsindia.org", "orfonline.org", "carnegieendowment.org",
];

export function sourceAuthority(url: string, tier: SourceTier): number {
  if (tier === "official") return 1.26;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (QUALITY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return 1.05;
    if (host.endsWith(".gov.in") || host.endsWith(".nic.in")) return 1.2;
    if (tier === "analysis") return 1;
  } catch {
    /* ignore */
  }
  return tier === "news" ? 0.94 : 0.86;
}

export function countBySource(items: FeedItem[]): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.source, (counts.get(item.source) || 0) + 1);
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
