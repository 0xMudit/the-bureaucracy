"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { analyze } from "@/lib/classify";
import { getSessionUser } from "@/lib/auth";
import { canonicalUrl } from "@/lib/rss";
import { fetchPageMetadata } from "@/lib/page-meta";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { seedPoints } from "@/lib/rank";
import { isOfficialDomain } from "@/lib/sources";
import { addComment, canWrite, itemExistsByUrl, StoreError, upsertItems, vote } from "@/lib/store";
import type { FeedItem } from "@/lib/types";
import { hashId } from "@/lib/utils";

const VOTER_COOKIE = "tb_voter";
const YEAR = 60 * 60 * 24 * 365;

async function getVoterId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(VOTER_COOKIE)?.value;
  if (existing) return existing;
  if (!create) return null;
  const id = crypto.randomUUID();
  jar.set(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return id;
}

export type VoteResult = { ok: true; points: number; voted: boolean } | { ok: false; error: string };

export async function voteAction(itemId: string): Promise<VoteResult> {
  if (!canWrite()) {
    return { ok: false, error: "Voting is disabled until the database is connected." };
  }
  const jar = await cookies();
  if (!jar.get(VOTER_COOKIE)?.value) {
    const headerList = await headers();
    const limit = rateLimit(`vote:${clientKey(headerList)}`, 40, 10 * 60_000);
    if (!limit.ok) return { ok: false, error: "Easy there. Try again in a few minutes." };
  }
  const voterId = await getVoterId(true);
  if (!voterId) return { ok: false, error: "Could not identify this browser." };

  try {
    const result = await vote(itemId, voterId);
    revalidatePath("/");
    revalidatePath(`/item/${itemId}`);
    revalidateTag("items", { expire: 30 });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof StoreError) return { ok: false, error: error.message };
    return { ok: false, error: "The vote could not be recorded." };
  }
}

export interface CommentState {
  ok: boolean;
  error?: string;
  field?: "author" | "body";
  stamp?: number;
}

export async function commentAction(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const itemId = String(formData.get("itemId") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim();

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Log in to join the discussion." };

  const author = user.name.trim().replace(/[<>]/g, "").slice(0, 32);

  if (!itemId) return { ok: false, error: "Missing story." };
  if (author.length < 2) return { ok: false, error: "Add a display name on your account first.", field: "author" };
  if (body.length < 3) return { ok: false, error: "Write at least a few words.", field: "body" };
  if (body.length > 1500) return { ok: false, error: "Keep it under 1,500 characters.", field: "body" };
  if (!canWrite()) {
    return { ok: false, error: "Discussions are disabled until the database is connected." };
  }

  try {
    await addComment({ itemId, parentId, author, body, authorId: user.id });
    revalidatePath(`/item/${itemId}`);
    revalidateTag("comments", { expire: 0 });
    revalidateTag("items", { expire: 30 });
    return { ok: true, stamp: Date.now() };
  } catch (error) {
    if (error instanceof StoreError && error.code === "not-found") {
      return { ok: false, error: "This story has left the 24-hour window." };
    }
    return { ok: false, error: "The comment could not be saved." };
  }
}

export interface SubmitState {
  error?: string;
  warning?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const user = await getSessionUser();
  if (!user) return { error: "Log in to submit a link." };

  const rawUrl = String(formData.get("url") ?? "").trim();
  const manualTitle = String(formData.get("title") ?? "").trim();
  const manualSummary = String(formData.get("summary") ?? "").trim();
  if (!rawUrl) return { error: "Paste a link first." };

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return { error: "That does not look like a valid URL." };
  }
  if (!canWrite()) {
    return { error: "Submissions are disabled until the database is connected." };
  }

  const headerList = await headers();
  const limit = rateLimit(`submit:${clientKey(headerList)}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return { error: `Submission limit reached. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` };
  }

  let meta;
  try {
    meta = await fetchPageMetadata(parsed.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that page.";
    if (!manualTitle) {
      return {
        error: `${message} You can still submit it by adding a headline and summary below.`,
        fieldErrors: { title: "Required when the page cannot be fetched." },
      };
    }
    meta = {
      title: manualTitle,
      description: manualSummary,
      siteName: parsed.hostname.replace(/^www\./, ""),
      publishedAt: null,
      finalUrl: parsed.toString(),
    };
  }

  const title = manualTitle || meta.title;
  if (title.length < 12) return { error: "The headline is too short to be useful." };

  const url = canonicalUrl(meta.finalUrl);
  const existing = await itemExistsByUrl(url);
  if (existing) redirect(`/item/${existing.id}?duplicate=1`);

  const analysis = analyze(title, manualSummary || meta.description, {
    sourceName: meta.siteName,
    sourceTier: isOfficialDomain(url) ? "official" : "news",
  });
  if (analysis.isNoise) {
    return { error: "That reads like prep material or off-syllabus noise. Try a policy story instead." };
  }

  const now = new Date();
  const points = 0;
  const item: FeedItem = {
    id: hashId(url),
    title: analysis.title,
    kicker: analysis.kicker,
    url,
    source: meta.siteName || parsed.hostname.replace(/^www\./, ""),
    sourceUrl: parsed.origin,
    sourceTier: isOfficialDomain(url) ? "official" : "news",
    summary: (manualSummary || meta.description).slice(0, 700),
    publishedAt: now.toISOString(),
    fetchedAt: now.toISOString(),
    topics: analysis.topics,
    primaryTopic: analysis.primaryTopic,
    examScore: analysis.examScore,
    priority: analysis.priority,
    keywords: analysis.keywords,
    optionals: analysis.optionals,
    primaryOptional: analysis.primaryOptional,
    points,
    seedPoints: seedPoints(analysis.examScore),
    commentCount: 0,
  };

  try {
    await upsertItems([item]);
    revalidatePath("/");
    revalidatePath("/syllabus");
    revalidateTag("items", { expire: 0 });
  } catch (error) {
    if (error instanceof StoreError) return { error: error.message };
    return { error: "The story could not be saved." };
  }

  redirect(`/item/${item.id}${analysis.priority === "low" ? "?low=1" : ""}`);
}
