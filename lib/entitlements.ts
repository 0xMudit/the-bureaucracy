import { cache } from "react";
import { serviceClient } from "./store";

/**
 * Entitlements.
 *
 * There is exactly one question this module answers: given a reader's plan,
 * may they see a given feature? Everything else — pricing pages, billing
 * webhooks, the app store receipt — writes a plan and then stays out of the
 * read path. Pages and API routes call `can(...)`; they never inspect `plan`
 * themselves, so a new feature only has to be declared once here.
 *
 * A plan is *purchased*, an entitlement is *effective*. `plus` with an expiry
 * in the past is a free reader on the next request, without a cron job.
 */

export const PLANS = ["free", "plus", "mains"] as const;
export type Plan = (typeof PLANS)[number];

export type Feature =
  /** The per-article pack: deep read, Prelims traps, Mains skeleton. */
  | "premium_read"
  /** Archive older than the 24-hour wire. */
  | "archive"
  /** Server-side revision queue shared across devices. */
  | "revision_sync"
  /** Monthly compendium PDF. */
  | "compendium"
  /** Weekly prelims test with percentile. */
  | "weekly_test"
  /** Rubric-scored answer evaluation. */
  | "answer_eval"
  /** Mentor calls and the top-tier support line. */
  | "mentor";

/** The lowest plan that unlocks each feature. */
export const FEATURE_PLAN: Record<Feature, Plan> = {
  premium_read: "plus",
  archive: "plus",
  revision_sync: "plus",
  compendium: "plus",
  weekly_test: "plus",
  answer_eval: "mains",
  mentor: "mains",
};

/** What the reader is being sold, in the order the upgrade page shows it. */
export const FEATURE_LABEL: Record<Feature, string> = {
  premium_read: "The full read on every story",
  archive: "The archive beyond 24 hours",
  revision_sync: "Revision queue across devices",
  compendium: "Monthly compendium PDF",
  weekly_test: "Weekly prelims test",
  answer_eval: "Answer-writing evaluation",
  mentor: "Mentor calls",
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  plus: "Plus",
  mains: "Mains",
};

const RANK: Record<Plan, number> = { free: 0, plus: 1, mains: 2 };

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp, or null for a plan that does not expire. */
  expiresAt: string | null;
  /** How it was granted: manual, razorpay, apple, google, staff, gift. */
  source: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = { plan: "free", expiresAt: null, source: null };

export function normalizePlan(value: unknown): Plan {
  const plan = String(value ?? "").trim().toLowerCase();
  return (PLANS as readonly string[]).includes(plan) ? (plan as Plan) : "free";
}

export function planRank(plan: Plan): number {
  return RANK[plan];
}

/** True when the plan has not lapsed. Free is never active. */
export function planActive(entitlement: Entitlement | null | undefined, now = Date.now()): boolean {
  if (!entitlement || entitlement.plan === "free") return false;
  if (!entitlement.expiresAt) return true;
  const ends = Date.parse(entitlement.expiresAt);
  return Number.isFinite(ends) && ends > now;
}

/** The plan that actually applies right now. */
export function effectivePlan(entitlement: Entitlement | null | undefined, now = Date.now()): Plan {
  if (!entitlement || !planActive(entitlement, now)) return "free";
  return entitlement.plan;
}

export function can(
  entitlement: Entitlement | null | undefined,
  feature: Feature,
  now = Date.now(),
): boolean {
  return planRank(effectivePlan(entitlement, now)) >= planRank(FEATURE_PLAN[feature]);
}

/**
 * Build an entitlement from a profile-shaped object. Admins always see the
 * top tier: an editor has to be able to read what a customer is paying for
 * without granting themselves a fake purchase.
 */
export function entitlementOf(
  profile:
    | {
        plan?: unknown;
        planExpiresAt?: unknown;
        planSource?: unknown;
        role?: unknown;
      }
    | null
    | undefined,
): Entitlement {
  if (!profile) return FREE_ENTITLEMENT;
  if (String(profile.role ?? "").toLowerCase() === "admin") {
    return { plan: "mains", expiresAt: null, source: "staff" };
  }
  const expiresAt =
    typeof profile.planExpiresAt === "string" && profile.planExpiresAt.trim()
      ? profile.planExpiresAt
      : null;
  return {
    plan: normalizePlan(profile.plan),
    expiresAt,
    source: typeof profile.planSource === "string" ? profile.planSource : null,
  };
}

/**
 * The entitlement for an account id. Cached per request because a page may ask
 * twice (the story and the header, for example) for the same answer.
 *
 * Mobile routes call this after verifying a bearer token; the web page uses the
 * profile already loaded by `getSessionUser`. Both end at the same policy.
 */
export const entitlementForUser = cache(async (userId: string): Promise<Entitlement> => {
  const db = serviceClient();
  if (!db || !userId) return FREE_ENTITLEMENT;

  const { data, error } = await db
    .from("profiles")
    .select("plan, plan_expires_at, plan_source, role, status")
    .eq("id", userId)
    .maybeSingle();

  // A transient failure must not lock a paying reader out of a story, but it
  // also must not invent access. A free result is the safe default; the next
  // request retries.
  if (error || !data || data.status === "suspended") return FREE_ENTITLEMENT;

  return entitlementOf({
    plan: data.plan,
    planExpiresAt: data.plan_expires_at,
    planSource: data.plan_source,
    role: data.role,
  });
});
