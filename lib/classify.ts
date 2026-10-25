import {
  PREP_NOISE,
  LOW_SIGNAL,
  SIGNAL_TERMS,
  TOPICS,
  TOPIC_LIST,
  OPTIONAL_LIST,
  DEVANAGARI,
  EXAM_NOISE,
} from "./taxonomy";
import type { OptionalId, Priority, SourceTier, TopicId } from "./types";

export interface Analysis {
  title: string;
  kicker: string;
  topics: TopicId[];
  primaryTopic: TopicId | null;
  examScore: number;
  priority: Priority;
  keywords: string[];
  optionals: OptionalId[];
  primaryOptional: OptionalId | null;
  isNoise: boolean;
  noiseReason?: string;
}

const GENERIC_KEYWORDS = new Set([
  "report", "data", "study", "policy", "scheme", "act", "bill", "index", "survey",
  "commission", "committee", "agreement", "summit", "launch", "mission", "news",
  "india", "government", "centre", "state", "year", "new", "says", "said",
]);

const TITLE_CASE_EXCEPTIONS = new Set(["ai", "gst", "rbi", "isro", "upsc", "ssc", "cag", "niti", "psc", "ir"]);
const POWER_WORDS = new Set([
  "supreme court", "parliament", "constitution", "rbi", "election commission",
  "climate", "inflation", "budget", "judgment", "bill", "amendment", "scheme",
  "china", "pakistan", "isro", "unemployment", "census", "reservation", "federalism",
  "corruption", "defence", "tariff", "gdp", "monsoon", "semiconductor",
]);

function asciiTitleCase(word: string): string {
  if (TITLE_CASE_EXCEPTIONS.has(word.toLowerCase())) return word.toUpperCase();
  return word.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const clean = needle.trim().toLowerCase();
  if (!clean) return 0;
  if (!/^[a-z0-9 ]+$/.test(clean)) return 0;
  if (clean.length <= 3) {
    const re = new RegExp(`\\b${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    return (haystack.match(re) || []).length;
  }
  let count = 0;
  let idx = haystack.indexOf(clean);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(clean, idx + clean.length);
  }
  return count;
}

function isDevanagari(text: string): boolean {
  return DEVANAGARI.test(text);
}

/** Trim publisher suffixes and prep-brand prefixes without changing the claim. */
export function cleanHeadline(raw: string, sourceName?: string): string {
  let title = raw
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (sourceName) {
    const suffix = new RegExp(`\\s+[-–—|:]\\s+${escapeRegExp(sourceName)}\\s*$`, "i");
    for (let i = 0; i < 3; i++) {
      const next = title.replace(suffix, "");
      if (next === title) break;
      title = next;
    }
  }

  title = title
    .replace(/^(explained|opinion|editorial|analysis|decoded|knowledge nugget|upsc key|premium)\s*[:|–-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  title = title.replace(/^[a-z]/, (c) => c.toUpperCase());

  if (title.length > 150) {
    const cut = title.slice(0, 147);
    const lastSpace = cut.lastIndexOf(" ");
    title = `${cut.slice(0, lastSpace > 90 ? lastSpace : 147).trim()}…`;
  }

  return title;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function scoreOptionals(
  t: string,
  b: string,
  hint: OptionalId[] = [],
): { optionals: OptionalId[]; primaryOptional: OptionalId | null } {
  const scores = new Map<OptionalId, { score: number; hits: number }>();
  for (const subject of OPTIONAL_LIST) {
    let score = 0;
    let hits = 0;
    for (const kw of subject.keywords) {
      const inTitle = countOccurrences(t, kw);
      const inBody = countOccurrences(b, kw);
      if (inTitle + inBody === 0) continue;
      hits += 1;
      const weight = kw.includes(" ") ? 1.6 : 1;
      score += (inTitle * 3 + Math.min(inBody, 2) * 0.7) * weight;
    }
    if (hint.includes(subject.id)) {
      score += 3;
      hits += 1;
    }
    if (score > 0) scores.set(subject.id, { score, hits });
  }

  const sorted = [...scores.entries()].sort((a, b2) => b2[1].score - a[1].score);
  const top = sorted[0];
  if (!top || top[1].score < 2 || top[1].hits === 0) {
    return { optionals: [], primaryOptional: null };
  }

  const optionals = sorted
    .filter(([, value], index) => value.score >= 2 && (index === 0 || value.score >= top[1].score * 0.4))
    .slice(0, 3)
    .map(([id]) => id);

  return { optionals, primaryOptional: top[0] };
}

export function analyze(
  rawTitle: string,
  summary: string,
  opts: {
    sourceName?: string;
    sourceTier?: SourceTier;
    topicHint?: TopicId[];
    optionalHint?: OptionalId[];
    now?: Date;
  } = {},
): Analysis {
  const title = cleanHeadline(rawTitle, opts.sourceName);
  const body = summary.replace(/\s+/g, " ").slice(0, 4000);
  const t = ` ${title.toLowerCase()} `;
  const b = ` ${body.toLowerCase()} `;
  const prepHit = PREP_NOISE.find((p) => t.includes(p) || b.includes(p));
  const lowSignal = LOW_SIGNAL.find((p) => t.includes(p));
  const examSpam =
    EXAM_NOISE.test(title) &&
    /(recruitment|notification|vacancy|vacancies|apply|exam|result|admit|eligibility|selection)/i.test(title);
  if (isDevanagari(title) || (isDevanagari(body) && !/[a-z]{20}/i.test(body))) {
    return {
      title,
      kicker: "",
      topics: [],
      primaryTopic: null,
      examScore: 0,
      priority: "low",
      keywords: [],
      optionals: [],
      primaryOptional: null,
      isNoise: true,
      noiseReason: "non-english",
    };
  }
  if (prepHit || lowSignal || examSpam) {
    return {
      title,
      kicker: "",
      topics: [],
      primaryTopic: null,
      examScore: 0,
      priority: "low",
      keywords: [],
      optionals: [],
      primaryOptional: null,
      isNoise: true,
      noiseReason: prepHit ? `prep:${prepHit}` : lowSignal ? `low-signal:${lowSignal}` : "exam-spam",
    };
  }

  const topicScores = new Map<TopicId, number>();
  const keywordHits = new Map<string, number>();

  for (const topic of TOPIC_LIST) {
    const scored: { kw: string; score: number }[] = [];
    for (const kw of topic.keywords) {
      const inTitle = countOccurrences(t, kw);
      const inBody = countOccurrences(b, kw);
      if (inTitle + inBody === 0) continue;
      const weight = kw.includes(" ") ? 1.2 : 1;
      const score = (inTitle * 3 + Math.min(inBody, 2) * 0.8) * weight;
      scored.push({ kw, score });
      const display = kw.trim();
      if (!GENERIC_KEYWORDS.has(display)) {
        keywordHits.set(display, (keywordHits.get(display) || 0) + inTitle * 3 + inBody);
      }
    }
    // Diminishing returns: only the eight strongest cues count.
    const total = scored
      .sort((a, b2) => b2.score - a.score)
      .slice(0, 8)
      .reduce((sum, s) => sum + s.score, 0);
    if (total > 0) topicScores.set(topic.id, total);
    if (opts.topicHint?.includes(topic.id)) {
      topicScores.set(topic.id, (topicScores.get(topic.id) || 0) + 3);
    }
  }

  const sorted = [...topicScores.entries()].sort((a, b2) => b2[1] - a[1]);
  const top = sorted[0];

  const signalHits =
    SIGNAL_TERMS.reduce((n, term) => n + (countOccurrences(t, term) > 0 ? 2 : countOccurrences(b, term) > 0 ? 1 : 0), 0);
  const officialBonus = opts.sourceTier === "official" ? 9 : opts.sourceTier === "analysis" ? 4 : 0;

  if (!top) {
    return {
      title,
      kicker: "",
      topics: [],
      primaryTopic: null,
      examScore: Math.min(22, 8 + officialBonus + Math.min(signalHits, 3)),
      priority: "low",
      keywords: [],
      optionals: [],
      primaryOptional: null,
      isNoise: false,
    };
  }

  const second = sorted[1]?.[1] ?? 0;
  const relevance = Math.min(50, top[1] + 0.4 * second);
  let raw = 16 + Math.sqrt(relevance) * 11.5 + Math.min(signalHits, 8) * 2 + officialBonus;
  if (top[0] === "exam" && opts.sourceTier !== "official") raw *= 0.82;
  const examScore = Math.max(5, Math.min(98, Math.round(raw)));

  const primaryTopic = top[0];
  const topics: TopicId[] = sorted
    .filter(([, s], i) => i === 0 || (s >= 2 && s >= top[1] * 0.34))
    .slice(0, 3)
    .map(([id]) => id);

  const optionalFit = scoreOptionals(t, b, opts.optionalHint);

  const strongKeywords = [...keywordHits.entries()]
    .filter(([k]) => k.length > 2 && !/^\s*ai\s*$/.test(k))
    .sort((a, b2) => b2[1] - a[1])
    .map(([k]) => asciiTitleCase(k))
    .filter((k, i, arr) => arr.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)
    .slice(0, 6);

  const kickerSource = [...keywordHits.entries()]
    .filter(([k]) => POWER_WORDS.has(k) || (k.includes(" ") && k.length > 6))
    .sort((a, b2) => b2[1] - a[1])
    .map(([k]) => asciiTitleCase(k))
    .slice(0, 3);

  const kicker =
    kickerSource.length > 0
      ? kickerSource.join(" · ").toUpperCase()
      : TOPICS[primaryTopic].label.toUpperCase();

  const priority: Priority = examScore >= 70 ? "high" : examScore >= 48 ? "medium" : "low";

  return {
    title,
    kicker,
    topics,
    primaryTopic,
    examScore,
    priority,
    keywords: strongKeywords.length ? strongKeywords : [TOPICS[primaryTopic].label],
    optionals: optionalFit.optionals,
    primaryOptional: optionalFit.primaryOptional,
    isNoise: false,
  };
}

export function priorityLabel(p: Priority): string {
  return p === "high" ? "High priority" : p === "medium" ? "Worth reading" : "Background";
}
