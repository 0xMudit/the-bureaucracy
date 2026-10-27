# Membership and payments

The premium plans are sold **inside the app** through Razorpay's native checkout. Nothing hands the
reader to a browser: the app asks this server for an order, Razorpay's sheet opens over the app, and
the server grants the plan only after it has checked the payment itself.

The web still has [`/plus`](../app/plus/page.tsx) for people who read in a browser; it uses the same
catalog and the same `profiles.plan` fields.

## What is sold

`CATALOG` in [`lib/billing.ts`](../lib/billing.ts) is the single price list. The client never sends a
price, only `plan` and `period`, so a modified app cannot buy Mains for a rupee.

| Plan | Period | Price | Days added |
| --- | --- | --- | --- |
| Plus | Monthly | ₹149 | 30 |
| Plus | Yearly | ₹999 | 365 |
| Mains | Monthly | ₹399 | 30 |
| Mains | Yearly | ₹2,999 | 365 |

Amounts are stored in **paise** (`14_900`) because Razorpay's API uses the smallest currency unit.
`priceLabel()` is the only place that formats rupees.

These are **prepaid periods, not subscriptions.** There is no auto-debit, no e-mandate and no
surprise renewal. `profiles.plan_expires_at` is the source of truth; when it passes, the reader is
free again without a cron job (`planActive()` in `lib/entitlements.ts`).

Paying for the same plan again **extends** it from the existing expiry. Paying for a different plan
starts that plan now, so upgrading never burns the days already paid for.

## The flow

```
app                            server                          Razorpay
 |  POST /billing/order  ------>  price from CATALOG
 |                               create order  -------------->  POST /v1/orders
 |                               insert tb_payments (created)
 |  <----- { order, keyId, amount, prefill }
 |
 |  RazorpayCheckout.open(...)  ------------------------------>  native sheet
 |  <---- { payment_id, order_id, signature }
 |
 |  POST /billing/verify  ----->  order belongs to caller?
 |                               HMAC(order_id|payment_id) ok?
 |                               GET /v1/payments/:id --------->  status == captured?
 |                               activate: status=paid, profile.plan=…
 |  <----- { entitlement }
```

If the app dies after the charge, Razorpay still calls the webhook
(`POST /api/billing/razorpay`), which finds the same `tb_payments` row and applies the same
activation. Both paths are idempotent: activation is a conditional status transition
(`created|failed → paid`), so whichever arrives second is a no-op.

## Tables

`supabase/migrations/20261029000001_billing.sql`

- **`tb_payments`** — one row per checkout attempt: user, provider order id, plan, period, amount,
  status (`created|paid|failed|refunded`), the payment id, whether the app signature verified, the
  raw provider object and timestamps. RLS is on with no policies; only the service role reads it.
- **`tb_billing_events`** — webhook replay guard, keyed by `x-razorpay-event-id`. Pruned after 180
  days with the rest of the operational history. Payments are never pruned: they are the record of
  what someone bought.

## Environment

Add these to `.env.local` and to the Vercel project (Production, Preview and Development):

```bash
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Nothing is `NEXT_PUBLIC_`. The key id reaches the app through the order response, which is fine —
it is the public half. The secret and the webhook secret stay on the server.

With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` missing, `paymentConfigured()` is false: the plans
page says payments are being switched on, the order route returns `503`, and no checkout can open.
A half-configured deployment cannot charge anyone.

## Razorpay setup

1. Create an account at <https://dashboard.razorpay.com/signup>. Complete business KYC (PAN, bank
   account, business proof). Test mode works before KYC; live mode does not.
2. **Account & Settings → API keys → Generate key.** Copy the key id and secret into
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Test keys start with `rzp_test_`.
3. **Account & Settings → Webhooks → Add webhook.**
   - URL: `https://the-bureaucracy.vercel.app/api/billing/razorpay`
   - Secret: generate one (`openssl rand -hex 32`), put it in `RAZORPAY_WEBHOOK_SECRET`.
   - Active events: **`payment.captured`**, **`payment.failed`**, **`refund.processed`**.
4. Keep the account in test mode until a real end-to-end payment succeeds. The verify route accepts
   both test and live payments; the key pair decides which environment is in use.

### Testing a payment

Use a development build (see below), sign in, open **Account → Membership**, choose a plan and pay
with Razorpay's test instruments:

- Card `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`.
- UPI id `success@razorpay` (success) or `failure@razorpay` (failure).

The payment should return to the app, the success panel should appear, and
`select status, plan, amount from tb_payments order by id desc limit 1;` should show `paid`.

To prove the webhook path, close the app immediately after the sheet succeeds. Within a minute the
payment should still become `paid` and the plan should be on the profile. The Razorpay dashboard's
webhook log shows the delivery and the response code.

### Local webhooks

Razorpay cannot reach `localhost`. Tunnel it (`ngrok http 3000`) and use the tunnel URL as the
webhook endpoint while developing, or rely on `/verify` (the app's own call) and leave the webhook
for production.

## Refunds

A refund is issued from the Razorpay dashboard. The `refund.processed` webhook finds the payment,
marks it `refunded`, and removes the plan **only if that payment is still the one granting the
current plan**. A reader who has since bought a newer period keeps it.

Manual refunds outside Razorpay are not automatic: after refunding by hand, clear the plan in
`/admin/users` or with SQL, and note why in the support thread.

## Manual grants

Founding readers and support cases are granted from `/admin/users` (or SQL):

```sql
update profiles
   set plan = 'plus',
       plan_expires_at = null,
       plan_source = 'founding',
       plan_updated_at = now()
 where email = 'reader@example.com';
```

`plan_source` values in use: `razorpay` (paid in the app), `founding` (granted by hand), `staff`
(admin, automatic), `refund` (access removed after a refund).

## The app build

`react-native-razorpay@3.0.0` is a native module. It **does not work in Expo Go** — the paywall
loads it lazily, so Expo Go still runs the rest of the app, but the paywall reports that this preview
cannot open the payment sheet.

To test or ship payments:

```bash
cd mobile
npx expo run:android      # local dev build (needs Android Studio + an emulator/device)
# or
npx eas build --profile development --platform android
```

After adding or upgrading the dependency, rebuild the native app; a Metro reload is not enough.

## Distribution policy — read before shipping to a store

Google Play's Payments policy requires Play Billing for **digital content consumed inside the app**,
which includes these plans. Apple's App Store has the same rule (StoreKit). A Razorpay sheet inside
the app is therefore **not compliant for Play/App Store distribution**.

This path is appropriate when the app is distributed as a **direct APK** (sideload, your own site, or
an enterprise/MDM channel), or if you are enrolled in Play's **user-choice billing** programme and
meet its requirements. Do not publish this build to Play without switching the adapter or enrolling.

`lib/billing.ts` is written so an adapter can be added later: the entitlement is just
`profiles.plan` / `plan_expires_at` / `plan_source`, and nothing in the read path knows which
provider granted it.

## Failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Paywall says "Payments are being switched on" | `paymentConfigured()` false | Add both Razorpay keys to the environment and redeploy |
| Paywall says "preview build cannot open the payment sheet" | Expo Go, or the native app was not rebuilt | `npx expo run:android` |
| Order route returns `502 Razorpay order failed: 401` | Wrong key id/secret, or test keys against a live account | Regenerate and re-check the pair |
| Verify returns "still being confirmed" | Payment authorised but not captured | Razorpay auto-captures within minutes; the webhook grants on `payment.captured` |
| Webhook 401 | Signature does not match `RAZORPAY_WEBHOOK_SECRET` | Paste the same secret in Razorpay and the environment |
| Webhook 503 | Secret missing | Set `RAZORPAY_WEBHOOK_SECRET` and redeploy |
| Plan paid but not active | Neither verify nor webhook reached the server | Check Razorpay's webhook log, then re-deliver the event; activation is idempotent |
