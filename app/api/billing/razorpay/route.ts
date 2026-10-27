import {
  activateOrder,
  findOrder,
  markFailed,
  recordEvent,
  refundPayment,
  verifyWebhookSignature,
  webhookConfigured,
} from "@/lib/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RazorpayEntity {
  id?: string;
  order_id?: string | null;
  payment_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  created_at?: number;
}

interface RazorpayEvent {
  event?: string;
  created_at?: number;
  payload?: Record<string, { entity?: RazorpayEntity } | undefined>;
}

function entityOf(event: RazorpayEvent, key: string): RazorpayEntity | null {
  return event.payload?.[key]?.entity ?? null;
}

/**
 * POST /api/billing/razorpay — Razorpay webhook.
 *
 * Verify stays the happy path: the app calls it the moment checkout succeeds.
 * This endpoint exists for the cases the app cannot cover — the reader swipes
 * the app away mid-payment, the network dies after the charge, or a payment
 * settles minutes later. Razorpay retries a delivery until it is acknowledged,
 * so every effect here is idempotent.
 *
 * The raw body is what is signed; it must be read before any JSON parsing. Set
 * RAZORPAY_WEBHOOK_SECRET and point the dashboard at this URL, with the
 * `payment.captured`, `payment.failed` and `refund.processed` events enabled.
 */
export async function POST(request: Request) {
  if (!webhookConfigured()) {
    // 503 rather than 200: an unconfigured endpoint must not silently swallow
    // real payments.
    return Response.json({ ok: false, error: "Webhooks are not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ ok: false, error: "Bad signature." }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return Response.json({ ok: false, error: "Expected JSON." }, { status: 400 });
  }

  const kind = String(event.event ?? "").trim();

  try {
    switch (kind) {
      case "payment.captured": {
        const payment = entityOf(event, "payment");
        if (!payment?.id || !payment.order_id) break;

        const order = await findOrder(payment.order_id);
        if (!order) {
          // The order row is written before checkout opens, so this should not
          // happen. Acknowledge so the delivery stops; verify can still rescue
          // the reader if the row appears.
          return Response.json({ ok: true, ignored: "unknown_order" });
        }

        if (order.status === "paid") break;

        if (payment.amount !== order.amount || payment.currency !== order.currency) {
          // Never grant on a mismatched amount. Refund is handled by hand.
          return Response.json({ ok: true, ignored: "amount_mismatch" });
        }

        await activateOrder({
          order,
          paymentId: payment.id,
          signatureOk: null,
          raw: payment,
        });
        break;
      }

      case "payment.failed": {
        const payment = entityOf(event, "payment");
        if (payment?.order_id) await markFailed(payment.order_id, payment);
        break;
      }

      case "refund.processed": {
        const refund = entityOf(event, "refund");
        if (refund?.payment_id) await refundPayment(refund.payment_id, refund);
        break;
      }

      default:
        // Subscribed to more than we handle; acknowledge and move on.
        break;
    }

    const eventId =
      request.headers.get("x-razorpay-event-id")?.trim() ||
      `${kind}:${entityOf(event, "payment")?.id ?? entityOf(event, "refund")?.id ?? "none"}:${event.created_at ?? 0}`;
    const first = await recordEvent(
      eventId,
      kind || "unknown",
      entityOf(event, "payment")?.order_id ?? null,
    );

    return Response.json({ ok: true, duplicate: !first });
  } catch (error) {
    // 500 makes Razorpay retry. Effects are idempotent, so a retry is safe.
    const message = error instanceof Error ? error.message : "Webhook failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
