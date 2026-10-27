import { createHmac, timingSafeEqual } from "node:crypto";
import {
  entitlementForUser,
  type Entitlement,
  type Plan,
} from "./entitlements";
import { SITE } from "./config";
import { serviceClient } from "./store";

/**
 * In-app payments.
 *
 * The reader pays inside the app with Razorpay. Three rules keep that honest:
 *
 *   1. The server owns the price. The client asks for a `plan` and a `period`;
 *      the amount comes from `CATALOG` here, never from the request.
 *   2. Access is granted only after Razorpay's HMAC signature is verified and
 *      the payment itself is fetched and checked for `captured`.
 *   3. A payment that finishes while the app is closed is recovered from the
 *      webhook, which finds the order row written before checkout opened.
 *
 * Keys live in env only: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and
 * RAZORPAY_WEBHOOK_SECRET. With none of them, the app shows that payments are
 * being switched on instead of failing at checkout.
 */

const API = "https://api.razorpay.com/v1";

export type BillingPeriod = "monthly" | "yearly";
export type PaidPlan = Exclude<Plan, "free">;

export interface PlanOption {
  plan: PaidPlan;
  period: BillingPeriod;
  /** Paise. Razorpay's smallest unit, so no floating point in the money path. */
  amount: number;
  /** Days added to the plan on a successful payment. */
  days: number;
  label: string;
  cadence: string;
  blurb: string;
}

/** The price list. Change it here and both the app and the order agree. */
export const CATALOG: PlanOption[] = [
  {
    plan: "plus",
    period: "monthly",
    amount: 14_900,
    days: 30,
    label: "Plus",
    cadence: "month",
    blurb: "The full read on every story, the archive and the revision queue.",
  },
  {
    plan: "plus",
    period: "yearly",
    amount: 99_900,
    days: 365,
    label: "Plus",
    cadence: "year",
    blurb: "Two months free against the monthly price.",
  },
  {
    plan: "mains",
    period: "monthly",
    amount: 39_900,
    days: 30,
    label: "Mains",
    cadence: "month",
    blurb: "Everything in Plus, plus answer evaluation and the weekly test.",
  },
  {
    plan: "mains",
    period: "yearly",
    amount: 299_900,
    days: 365,
    label: "Mains",
    cadence: "year",
    blurb: "The full Mains year, with the mentor call every month.",
  },
];

export function paymentConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim(),
  );
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

export function findOption(plan: unknown, period: unknown): PlanOption | null {
  const wantedPlan = String(plan ?? "").trim().toLowerCase();
  const wantedPeriod = String(period ?? "").trim().toLowerCase();
  return (
    CATALOG.find(
      (option) => option.plan === wantedPlan && option.period === wantedPeriod,
    ) ?? null
  );
}

function keyId(): string {
  return process.env.RAZORPAY_KEY_ID?.trim() ?? "";
}

function keySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
}

function basicAuth(): string {
  return Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
}

/** Rupees for display, without trailing `.00`. */
export function priceLabel(amount: number): string {
  const rupees = amount / 100;
  return `₹${rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2)}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basicAuth()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay order failed: ${response.status} ${text.slice(0, 180)}`);
  }
  const order = JSON.parse(text) as RazorpayOrder;
  if (!order.id) throw new Error("Razorpay returned no order id.");
  return order;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  captured?: boolean;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment | null> {
  const response = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: `Basic ${basicAuth()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  return (await response.json()) as RazorpayPayment;
}

/**
 * Razorpay's checkout signature: HMAC-SHA256 of `order_id|payment_id` with the
 * key secret. Compared in constant time so a wrong signature cannot be probed
 * byte by byte.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!keySecret() || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", keySecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/* -------------------------------- storage -------------------------------- */

export interface PaymentRow {
  id: number;
  user_id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  plan: PaidPlan;
  period: BillingPeriod;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  paid_at: string | null;
  created_at: string;
}

export async function insertOrder(input: {
  userId: string;
  option: PlanOption;
  orderId: string;
}): Promise<PaymentRow> {
  const db = serviceClient();
  if (!db) throw new Error("Payments are not configured.");
  const { data, error } = await db
    .from("tb_payments")
    .insert({
      user_id: input.userId,
      provider_order_id: input.orderId,
      plan: input.option.plan,
      period: input.option.period,
      amount: input.option.amount,
      currency: "INR",
    })
    .select(
      "id, user_id, provider_order_id, provider_payment_id, plan, period, amount, currency, status, paid_at, created_at",
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "The order could not be saved.");
  return data as PaymentRow;
}

export async function findOrder(orderId: string): Promise<PaymentRow | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data, error } = await db
    .from("tb_payments")
    .select(
      "id, user_id, provider_order_id, provider_payment_id, plan, period, amount, currency, status, paid_at, created_at",
    )
    .eq("provider_order_id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PaymentRow;
}

async function expiryFor(userId: string, option: PlanOption): Promise<{ plan: PaidPlan; expiresAt: string }> {
  const db = serviceClient();
  const { data } = db
    ? await db.from("profiles").select("plan, plan_expires_at").eq("id", userId).maybeSingle()
    : { data: null };

  // Paying for the same plan again extends it; a different plan starts now.
  // Either way the reader never loses days they already paid for.
  const current = data?.plan_expires_at ? Date.parse(String(data.plan_expires_at)) : NaN;
  const samePlan = String(data?.plan ?? "") === option.plan;
  const start = samePlan && Number.isFinite(current) && current > Date.now() ? current : Date.now();
  return {
    plan: option.plan,
    expiresAt: new Date(start + option.days * 86_400_000).toISOString(),
  };
}

export interface ActivateResult {
  activated: boolean;
  entitlement: Entitlement;
}

/**
 * Mark a paid order and grant the plan. Idempotent: a webhook and a verify call
 * racing each other produce one activation, because the status transition is a
 * conditional update.
 */
export async function activateOrder(input: {
  order: PaymentRow;
  paymentId: string;
  /** True when the app's checkout signature was verified; null from a webhook. */
  signatureOk: boolean | null;
  raw?: unknown;
}): Promise<ActivateResult> {
  const db = serviceClient();
  if (!db) throw new Error("Payments are not configured.");

  const { data: updated, error } = await db
    .from("tb_payments")
    .update({
      status: "paid",
      provider_payment_id: input.paymentId,
      signature_ok: input.signatureOk,
      raw: (input.raw ?? null) as never,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider_order_id", input.order.provider_order_id)
    .in("status", ["created", "failed"])
    .select("id");

  if (error) throw new Error(error.message);

  if (!updated?.length) {
    // Already activated by the other path; report the plan as it stands.
    return { activated: false, entitlement: await entitlementForUser(input.order.user_id) };
  }

  const option = findOption(input.order.plan, input.order.period);
  if (!option) throw new Error("Unknown plan on this order.");

  const { plan, expiresAt } = await expiryFor(input.order.user_id, option);
  const { error: profileError } = await db
    .from("profiles")
    .update({
      plan,
      plan_expires_at: expiresAt,
      plan_source: "razorpay",
      plan_updated_at: new Date().toISOString(),
    })
    .eq("id", input.order.user_id);
  if (profileError) throw new Error(profileError.message);

  return {
    activated: true,
    entitlement: { plan, expiresAt, source: "razorpay" },
  };
}

export async function markFailed(orderId: string, raw: unknown): Promise<void> {
  const db = serviceClient();
  if (!db) return;
  await db
    .from("tb_payments")
    .update({ status: "failed", raw: raw as never, updated_at: new Date().toISOString() })
    .eq("provider_order_id", orderId)
    .eq("status", "created");
}

/**
 * A refund removes access, but only if this payment is still the one that
 * granted the current plan. A reader who bought a newer period keeps it.
 */
export async function refundPayment(paymentId: string, raw: unknown): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const { data: row } = await db
    .from("tb_payments")
    .select(
      "id, user_id, provider_order_id, provider_payment_id, plan, period, amount, currency, status, paid_at, created_at",
    )
    .eq("provider_payment_id", paymentId)
    .maybeSingle();
  if (!row) return;

  await db
    .from("tb_payments")
    .update({ status: "refunded", raw: raw as never, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  const { data: latest } = await db
    .from("tb_payments")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.id !== row.id) return;

  const { data: profile } = await db
    .from("profiles")
    .select("plan_source")
    .eq("id", row.user_id)
    .maybeSingle();
  if (profile?.plan_source !== "razorpay") return;

  await db
    .from("profiles")
    .update({
      plan: "free",
      plan_expires_at: null,
      plan_source: "refund",
      plan_updated_at: new Date().toISOString(),
    })
    .eq("id", row.user_id);
}

/** Record a webhook id once. Returns false when it has been seen before. */
export async function recordEvent(eventId: string, kind: string, orderId: string | null): Promise<boolean> {
  const db = serviceClient();
  if (!db) throw new Error("Payments are not configured.");
  const { error } = await db.from("tb_billing_events").insert({
    event_id: eventId,
    kind,
    order_id: orderId,
  });
  if (!error) return true;
  // 23505 is the primary-key collision of a replay.
  if (error.code === "23505") return false;
  // Anything else is a real failure: acking it would lose the payment.
  throw new Error(error.message);
}

/* --------------------------------- view ---------------------------------- */

export interface BillingPlanView {
  plan: PaidPlan;
  period: BillingPeriod;
  amount: number;
  price: string;
  perMonth: string;
  days: number;
  label: string;
  cadence: string;
  blurb: string;
}

export interface BillingView {
  configured: boolean;
  contact: string;
  plans: BillingPlanView[];
  /** The plan that applies right now, never a lapsed one. */
  current: {
    plan: Plan;
    expiresAt: string | null;
    source: string | null;
  };
}

export async function billingView(userId: string | null): Promise<BillingView> {
  const entitlement = userId ? await entitlementForUser(userId) : null;
  const active = entitlement && entitlement.plan !== "free" ? entitlement : null;

  return {
    configured: paymentConfigured(),
    contact: SITE.editor.email,
    current: {
      plan: active?.plan ?? "free",
      expiresAt: active?.expiresAt ?? null,
      source: active?.source ?? null,
    },
    plans: CATALOG.map((option) => ({
      plan: option.plan,
      period: option.period,
      amount: option.amount,
      price: priceLabel(option.amount),
      perMonth:
        option.period === "yearly"
          ? priceLabel(Math.round(option.amount / 12))
          : priceLabel(option.amount),
      days: option.days,
      label: option.label,
      cadence: option.cadence,
      blurb: option.blurb,
    })),
  };
}
