# Monitoring

Two questions need an answer before launch: **is the site up**, and **what threw**. The first is a
GitHub Action, the second is Sentry, and both are optional infrastructure rather than code paths.

## Health endpoint

[`/api/health`](../app/api/health/route.ts) returns `200` when the app answers and Postgres responds,
`503` otherwise. It reads one row (`items.published_at desc limit 1`) so it is cheap enough to poll from
anywhere. The shape is documented in [api.md](api.md#get-apihealth).

```bash
curl -s https://the-bureaucracy.vercel.app/api/health | jq
```

A `200` with `"stale": true` is not an outage: it means no story has entered the wire for six hours. Check
the ingest runs before treating it as a fault.

## Uptime probe

[`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml) runs every 15 minutes and on manual
dispatch:

1. calls `/api/health` and requires `status == "ok"` and `db.ok == true`;
2. fetches `/` and requires a `2xx`;
3. writes the database latency, story age and deployed commit to the run summary.

A failed scheduled workflow sends GitHub's failure mail to the repository owner, which is the alert. To
send it somewhere else, add a notification step to the workflow (Slack, email, PagerDuty) or watch the
repository with a [third-party uptime service](https://vercel.com/docs/observability) pointed at
`/api/health`.

Repository **variable** `SITE_URL` overrides the default `https://the-bureaucracy.vercel.app`; no secret
is needed. The job is guarded the same way as ingestion, so forks do not probe the upstream site.

## Sentry

Error reporting is **off until a DSN is configured**. The integration adds no runtime cost and makes no
network calls when the variable is empty.

### Create the project

1. Create a Next.js project at [sentry.io](https://sentry.io). The free tier is enough.
2. Copy the DSN from **Settings → Client Keys (DSN)**.
3. In **Settings → Security & Privacy**, turn off "Send Default PII" as a second layer; the code already
   uses a restrictive `dataCollection` policy.

### Environment

Add to Vercel for **Production** (and Preview, if you want preview errors):

```bash
npx vercel env add SENTRY_DSN production
npx vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

| Variable | Purpose |
| --- | --- |
| `SENTRY_DSN` | Server and edge events. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser events. Also added to the CSP `connect-src` at build time. |
| `SENTRY_ORG` | Organisation slug, for source-map upload only. |
| `SENTRY_PROJECT` | Project slug, for source-map upload only. |
| `SENTRY_AUTH_TOKEN` | Build token with `project:releases` scope. Never exposed to the browser. |

Without `SENTRY_AUTH_TOKEN` the build still succeeds; stack traces are minified in Sentry, but the events
arrive. Add the token when you want readable traces and automatic release creation.

### What is sent

- Server: `instrumentation.ts` loads `sentry.server.config.ts` (Node) or `sentry.edge.config.ts` (edge),
  and forwards request errors through `Sentry.captureRequestError`.
- Browser: `instrumentation-client.ts`, no session replay.
- A root `app/global-error.tsx` catches render failures and shows a way back.
- `tracesSampleRate: 0` and all replay rates are `0`: no performance profile and no session recording.
- `dataCollection` disables user identity, cookies, request/response bodies and stack-frame variables. The
  header list is an allow-list (`user-agent`, `accept`, `accept-language`, `content-type`), so cookies,
  `authorization`, `x-device-id` and forwarding/IP headers are never attached.
- `beforeSend` deletes cookies, `authorization`, `cookie` and `x-device-id` from the event request as a
  second layer.

The privacy policy states this behaviour, so keep the config in step with
[privacy](../app/privacy/page.tsx) if you change it.

### Verify

After the first deploy with a DSN, open **Issues** in Sentry and use **Send a test event** from the
project settings, then trigger a real server error (a broken database key on a preview deployment works).
A browser event should appear with the route, browser version and no cookies.

### Alerts

Sentry's default alert rule emails on a new issue. Add one more for a spike: **Alerts → Create Alert →
Number of errors**, above ~20 events in five minutes, for the production environment. High-volume noise
is usually a failed deploy or a crawler, not 20 readers hitting the same bug.

## When something is down

1. `curl -sS https://<site>/api/health | jq` — `db.error` distinguishes a bad key from a network fault.
2. Vercel → Deployments → Functions: runtime logs still work when Sentry does not.
3. Supabase → Reports: check connection count, disk and slow queries.
4. If the last deploy is the cause, promote the previous deployment (see [deployment.md](deployment.md#rollback)).
   Migrations are additive; never edit an applied migration.
