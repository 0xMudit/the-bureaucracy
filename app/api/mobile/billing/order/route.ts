import {
  createRazorpayOrder,
  findOption,
  insertOrder,
  paymentConfigured,
  priceLabel,
} from "@/lib/billing";
import { displayName, mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { hashKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * POST /api/mobile/billing/order  { plan, period }
 *
 * Creates a Razorpay order for the server's price, then hands the app the
 * checkout parameters. The amount is resolved from the catalog, so a modified
 * client cannot buy Mains for a rupee. The row is written before checkout
 * opens; the webhook needs it if the app dies mid-payment.
 */
export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to become a member.");

  const limit = await rateLimit(`mobile:billing:order:${hashKey(user.id)}`, 12, 60 * 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many checkout attempts. Try again in a few minutes.", retryAfter: limit.retryAfter },
      429,
    );
  }

  if (!paymentConfigured()) {
    return mobileError(
      503,
      "Payments are being switched on. Write to the editor and founding access is granted manually.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const option = findOption(raw.plan, raw.period);
  if (!option) return mobileError(400, "Choose a plan and a billing period.");

  try {
    const order = await createRazorpayOrder({
      amount: option.amount,
      receipt: `tb_${Date.now()}_${user.id.slice(0, 8)}`,
      notes: {
        user_id: user.id,
        plan: option.plan,
        period: option.period,
      },
    });

    await insertOrder({ userId: user.id, option, orderId: order.id });

    return mobileJson({
      ok: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID?.trim() ?? "",
        name: "The Bureaucracy",
        description: `${option.label} · ${priceLabel(option.amount)} / ${option.cadence}`,
        prefill: { name: displayName(user), email: user.email ?? "" },
        notes: { plan: option.plan, period: option.period },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not start.";
    return mobileError(502, message);
  }
}
