import {
  activateOrder,
  fetchRazorpayPayment,
  findOrder,
  paymentConfigured,
  verifyCheckoutSignature,
} from "@/lib/billing";
import { entitlementForUser } from "@/lib/entitlements";
import { mobileUser } from "@/lib/mobile-auth";
import { mobileError, mobileJson, preflight } from "@/lib/mobile";
import { hashKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * POST /api/mobile/billing/verify  { orderId, paymentId, signature }
 *
 * The app calls this when Razorpay's checkout hands back a payment. Checkout is
 * only as trustworthy as the three values it returns, so this route does not
 * take them at face value:
 *
 *   1. the order must belong to the caller,
 *   2. the HMAC signature must match `order_id|payment_id`,
 *   3. Razorpay itself must report the payment as `captured` for that order, at
 *      the amount the server priced.
 *
 * Only then is the plan granted. The webhook applies the same order row, so a
 * reader who kills the app mid-payment still gets what they paid for.
 */
export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileError(401, "Sign in to finish this payment.");

  const limit = await rateLimit(`mobile:billing:verify:${hashKey(user.id)}`, 30, 60 * 60_000);
  if (!limit.ok) {
    return mobileJson(
      { ok: false, error: "Too many attempts. Try again in a few minutes.", retryAfter: limit.retryAfter },
      429,
    );
  }

  if (!paymentConfigured()) {
    return mobileError(503, "Payments are being switched on.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mobileError(400, "Expected a JSON body.");
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const orderId = String(raw.orderId ?? "").trim();
  const paymentId = String(raw.paymentId ?? "").trim();
  const signature = String(raw.signature ?? "").trim();

  if (!orderId || !paymentId || !signature) {
    return mobileError(400, "The payment reference is incomplete.");
  }

  const order = await findOrder(orderId);
  if (!order || order.user_id !== user.id) {
    return mobileError(404, "That order was not found.");
  }

  // Already granted by the webhook while the app was away. Nothing to verify
  // again; report the plan so the paywall can close on a success state.
  if (order.status === "paid") {
    return mobileJson({ ok: true, activated: false, entitlement: await entitlementForUser(user.id) });
  }

  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return mobileError(400, "That payment could not be verified. Nothing was charged.");
  }

  // The signature proves the checkout response came from Razorpay, but not that
  // the money settled. Ask the API directly.
  const payment = await fetchRazorpayPayment(paymentId);
  if (!payment || payment.order_id !== orderId) {
    return mobileError(502, "Razorpay has not confirmed this payment yet. It grants access automatically.");
  }
  if (payment.status !== "captured") {
    return mobileError(
      409,
      payment.status === "failed"
        ? "The payment failed. Nothing was charged."
        : "The payment is still being confirmed. Access arrives automatically.",
    );
  }
  if (payment.amount !== order.amount || payment.currency !== order.currency) {
    return mobileError(409, "The amount paid does not match the order. Write to the editor.");
  }

  try {
    const result = await activateOrder({
      order,
      paymentId,
      signatureOk: true,
      raw: payment,
    });
    return mobileJson({ ok: true, activated: result.activated, entitlement: result.entitlement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The plan could not be granted.";
    return mobileError(500, message);
  }
}
