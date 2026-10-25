# API and routes

The app is server-rendered, so most routes return HTML. This page documents the machine-readable surface and
the page map.

## Page map

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Ranked feed. Query: `sort`, `topic`, `optional`, `paper`, `q`, `days`. | Public |
| `/item/[id]` | Story, why-it-matters, comments, related, optional fit. 404 after 24 h. | Public |
| `/optional` | Six optional-subject desks. | Public |
| `/syllabus` | Papers, themes, optional counts. | Public |
| `/submit` | Sign-in panel, then link submission. | Sign-in |
| `/saved` | Reading list. Device-local, expires with the wire. | Public |
| `/about` | Method, sources, ranking. | Public |
| `/account` | Profile, name, password, email, sessions, deletion. | Sign-in |
| `/admin` | Traffic, sign-ins, latest activity. | Editor |
| `/admin/users` | Account register: search, roles, suspension. | Editor |
| `/admin/audit` | Append-only admin paper trail. | Editor |
| `/auth/check-email` | "Open the verification link" desk. | Public |
| `/auth/confirm` | Exchanges `token_hash` or PKCE `code` for a session. | Public |
| `/auth/forgot-password` | Request a recovery link. | Public |
| `/auth/recovery` | Recovery landing for the stock Supabase mail. | Public |
| `/auth/reset-password` | Choose a new password. | Recovery session |
| `/feed.xml` | RSS 2.0 of the current wire. | Public |
| `/sitemap.xml`, `/robots.txt` | SEO. `/admin` and `/account` are `noindex`. | Public |

## `POST /api/ingest`

Runs fetch → dedupe → upsert → prune. `GET` is accepted for schedulers that cannot send a body.

```bash
curl -X POST https://the-bureaucracy.vercel.app/api/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
# or, for cron services that only support GET URLs:
curl "https://the-bureaucracy.vercel.app/api/ingest?secret=$CRON_SECRET"
```

Auth: `Authorization: Bearer $CRON_SECRET`, or `?secret=`. In development with no `CRON_SECRET` set, the
endpoint is open. In production it refuses.

| Status | Body |
| --- | --- |
| `200` | `{ ok, fetched, kept, inserted, updated, pruned, errors[], durationMs }` |
| `401` | `{ ok: false, error: "Unauthorised." }` |
| `503` | `{ ok: false, error: "No writable store…" }` |
| `500` | `{ ok: false, error, durationMs }` |

`errors` is per source and does not fail the run. The endpoint calls `revalidateTag("items")` so a refresh is
visible immediately.

## `GET /api/pulse`

Opportunistic refresh for open tabs. No auth; rate-limited per IP.

- Returns `503` on a read-only deployment.
- Returns `{ ok: true, skipped: "fresh" | "cooldown" }` when there is nothing to do.
- Otherwise runs the same pipeline and returns the ingest shape with `refreshed: true`.

## `POST /api/track`

First-party page-view counter used by `components/visit-tracker.tsx`.

```json
{ "path": "/item/abc123", "referrer": "https://news.example" }
```

- Bots are ignored (`bot`, `crawl`, `spider`, `headless`, `preview`, …).
- Rate limit: 90 requests per minute per IP.
- Stores the path, referrer, a rotating `tb_visitor` cookie and (when signed in) the account id. **No IP
  addresses.**
- Returns `{ ok: true }`, `{ ok: true, skipped: "bot" | "no-store" }`, or `429`.

## `GET /feed.xml`

RSS 2.0 for the current 24-hour wire. Absolute links come from `NEXT_PUBLIC_SITE_URL`.

## Conventions for new endpoints

- Put route handlers in `app/api/<name>/route.ts` and export `dynamic = "force-dynamic"` for anything that
  reads the store.
- Authorise **inside** the handler. The proxy only refreshes sessions and redirects pages; it is not a
  security boundary for APIs.
- Return JSON with an `ok` boolean and a useful `error` string; use real status codes.
- Add a row to this page in the same pull request.
