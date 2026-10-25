export type TagDef = { tag: string; patterns: RegExp[] };

export const TAGS: TagDef[] = [
  { tag: "Polity & Constitution", patterns: [/constitution/i, /parliament/i, /rajya sabha/i, /lok sabha/i, /article\s+\d+/i, /amendment/i, /bill/i, /ordinance/i, /panchayat/i, /federal/i, /judicial review/i] },
  { tag: "Governance", patterns: [/governance/i, /bureaucracy/i, /rt[ia]/i, /e-governance/i, /public policy/i, /schemes?/i, /welfare/i, /psc/i] },
  { tag: "Economy", patterns: [/gdp/i, /inflation/i, /rbi/i, /monetary/i, /fiscal/i, /budget/i, /tax/i, /gst/i, /cpi/i, /wpi/i, /deficit/i, /npa/i, /bank/i, /bond/i, /currency/i] },
  { tag: "Agriculture", patterns: [/agri/i, /farm/i, /crop/i, /msps?/i, /fertili[sz]er/i, /irrigat/i, /food security/i, /kisan/i] },
  { tag: "Environment", patterns: [/climate/i, /environment/i, /pollution/i, /forest/i, /wildlife/i, /biodiversity/i, /cop\d+/i, /carbon/i, /net zero/i, /wetland/i, /conservation/i] },
  { tag: "Science & Tech", patterns: [/isro/i, /drdo/i, /ai\b/i, /semicon/i, /space/i, /nuclear/i, /biotech/i, /quantum/i, /5g/i, /6g/i] },
  { tag: "International Relations", patterns: [/foreign policy/i, /bilateral/i, /multilateral/i, /un\b/i, /g20/i, /brics/i, /quad/i, /saarc/i, /asean/i, /diplomat/i, /treaty/i] },
  { tag: "Security", patterns: [/defence/i, /army|navy|air force/i, /terror/i, /border/i, /china|pakistan/i, /insurg/i, /cyber/i, /nsa/i] },
  { tag: "Social Issues", patterns: [/women/i, /gender/i, /child/i, /education/i, /health/i, /caste/i, /tribal/i, /poverty/i, /employment/i, /unemployment/i, /migration/i] },
  { tag: "Disaster Management", patterns: [/flood/i, /cyclone/i, /earthquake/i, /drought/i, /disaster/i, /ndma/i, /relief/i] },
  { tag: "Geography", patterns: [/monsoon/i, /river/i, /glacier/i, /coastal/i, /island/i, /plateau/i] },
  { tag: "Ethics & Integrity", patterns: [/ethics/i, /corruption/i, /transparency/i, /accountability/i] },
  { tag: "Editorial", patterns: [/editorial/i, /\bleditorial\b/i] },
  { tag: "Explained", patterns: [/\bexplained\b/i, /\bexplain(er)?\b/i] },
  { tag: "Analysis", patterns: [/\banalysis\b/i, /\bin-depth\b/i] },
  { tag: "Current Affairs", patterns: [/\bcurrent affairs\b/i, /\bnews today\b/i, /\bdaily\b/i] },
];

export function tagArticle(title: string, summary?: string): string[] {
  const text = `${title} ${summary || ""}`.toLowerCase();
  const tags = new Set<string>();
  for (const def of TAGS) {
    for (const p of def.patterns) {
      if (p.test(text)) { tags.add(def.tag); break; }
    }
  }
  if (tags.size === 0) tags.add("Current Affairs");
  return Array.from(tags);
}

export function scoreArticle(article: {
  title: string; summary?: string; tags: string[]; publishedAt: string; sourceWeight: number;
}, now: Date): number {
  const pub = new Date(article.publishedAt);
  const hours = Math.max(0, (now.getTime() - pub.getTime()) / 3600000);
  const recency = Math.max(0, 48 - hours) / 48 * 10;
  let s = recency + article.sourceWeight * 2.0;
  s += Math.min(article.tags.length, 5) * 1.2;
  const t = article.title.toLowerCase();
  if (/\beditorial\b/.test(t)) s += 4;
  if (/\bexplained\b/.test(t)) s += 3;
  if (/\banalysis\b/.test(t)) s += 2;
  if (/(supreme court|parliament|rbi|budget|union budget|interim budget|scheme|policy|ordinance|bill)/.test(t)) s += 1.5;
  if (/(upsc|prelims|mains|ias|pcs)/.test(t)) s += 0.8;
  return Math.round(s * 10) / 10;
}
