import { createBillingOrder, verifyBillingPayment } from "@/api/client";
import type { BillingPeriod, Entitlement, PaidPlanId } from "@/api/types";

/**
 * In-app checkout.
 *
 * The app never talks to Razorpay's API and never decides a price. It asks the
 * server for an order, opens Razorpay's native sheet over the app, then hands
 * the three signed values straight back to the server. Access is granted by
 * `POST /api/mobile/billing/verify`, not by this file.
 *
 * `react-native-razorpay` is a native module, so the import is deliberately
 * lazy: Expo Go has no such module, and a static import would crash the whole
 * app at launch instead of just disabling the paywall.
 */

export class CheckoutError extends Error {
  /** True when the reader closed the sheet themselves; no payment was made. */
  readonly cancelled: boolean;

  constructor(message: string, cancelled = false) {
    super(message);
    this.name = "CheckoutError";
    this.cancelled = cancelled;
  }
}

type RazorpayModule = typeof import("react-native-razorpay");

function loadCheckout(): RazorpayModule["default"] | null {
  try {
    const loaded = require("react-native-razorpay") as RazorpayModule;
    return loaded?.default ?? null;
  } catch {
    // Expo Go, or a build that was not rebuilt after the dependency landed.
    return null;
  }
}

/** Whether this install can open the native payment sheet at all. */
export function checkoutAvailable(): boolean {
  return loadCheckout() !== null;
}

export interface PurchaseInput {
  plan: PaidPlanId;
  period: BillingPeriod;
  name: string;
  email: string;
}

export interface PurchaseResult {
  entitlement: Entitlement;
  /** False when the webhook had already granted the plan. */
  activated: boolean;
}

function messageOf(failure: unknown): { message: string; cancelled: boolean } {
  const payload = (failure ?? {}) as { code?: unknown; description?: unknown; message?: unknown };
  const text =
    typeof payload.description === "string"
      ? payload.description
      : typeof payload.message === "string"
        ? payload.message
        : "The payment did not go through.";

  // Razorpay's native SDK reports a dismissed sheet as code 2.
  const cancelled = payload.code === 2 || /cancel|dismiss/i.test(text);
  return {
    message: cancelled ? "Payment cancelled. Nothing was charged." : text,
    cancelled,
  };
}

/**
 * Open checkout, then verify. Resolves only when the server has confirmed the
 * plan; any other outcome throws a `CheckoutError` with a sentence fit to show.
 */
export async function purchasePlan(input: PurchaseInput): Promise<PurchaseResult> {
  const RazorpayCheckout = loadCheckout();
  if (!RazorpayCheckout) {
    throw new CheckoutError(
      "In-app payments need the installed app build. This preview cannot open them.",
    );
  }

  const response = await createBillingOrder(input.plan, input.period);
  const order = response.order;
  if (!order.keyId) {
    throw new CheckoutError("Payments are not configured on the server yet.");
  }

  let result: Awaited<ReturnType<RazorpayModule["default"]["open"]>>;
  try {
    result = await RazorpayCheckout.open({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.id,
      prefill: order.prefill,
      notes: order.notes,
      theme: { color: "#292929" },
      retry: { enabled: true, max_count: 2 },
      modal: { backdropclose: false, handleback: true },
    });
  } catch (failure) {
    const { message, cancelled } = messageOf(failure);
    throw new CheckoutError(message, cancelled);
  }

  if (!result?.razorpay_payment_id || !result.razorpay_order_id || !result.razorpay_signature) {
    throw new CheckoutError(
      "Razorpay closed without a payment reference. If money left your account, write to the editor and it will be traced.",
    );
  }

  const verify = await verifyBillingPayment({
    orderId: result.razorpay_order_id,
    paymentId: result.razorpay_payment_id,
    signature: result.razorpay_signature,
  });

  return { entitlement: verify.entitlement, activated: verify.activated };
}

/** `27 October 2026` — used on the membership row and the success state. */
export function membershipDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
