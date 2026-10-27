import { billingView } from "@/lib/billing";
import { mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * GET /api/mobile/billing/plans
 *
 * The in-app paywall's single read: prices from the server's catalog and the
 * plan that currently applies to this reader. Anonymous callers get the price
 * list and `current.plan: "free"`; no auth round trip is made without a token.
 */
export async function GET(request: Request) {
  try {
    const user = await mobileUser(request);
    const view = await billingView(user?.id ?? null);
    return mobileJson({ ok: true, ...view });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The plans could not be read.";
    return mobileError(500, message);
  }
}
