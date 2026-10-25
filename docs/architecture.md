# Architecture

## The shape of the app

The Bureaucracy is a single Next.js 16 application. There is no separate backend: pages, server actions and
route handlers all talk to the same store abstraction.

```
browser
  │
  ├─ page (Server Component) ──► lib/cached.ts ──► lib/store.ts ──► Supabase (service role)
  │        │                                        └────────────► .data/store.json (dev)
  │        └─ Client Components (vote, save, comment, filters)
  │
  ├─ server action (app/**/actions.ts) ──► lib/auth.ts ──► lib/rbac.ts ──► lib/store.ts
  │
  └─ route handler (app/api/**) ──► lib/ingest.ts / lib/store.ts / lib/rss.ts
```

All database access happens on the server with the **service-role key**. The browser only ever holds the
public anon key (via `@supabase/ssr`) for the auth session. Row Level Security is enabled with no public
policies, so even the anon key cannot read the tables directly.

## Directory map

```
app/
  page.tsx                  ranked home feed (sort / topic / optional / paper / search)
  item/[id]/page.tsx        story, why-it-matters, comments, related, optional fit
  optional/page.tsx         six optional-subject desks
  syllabus/page.tsx         papers, themes and optional counts
  submit/page.tsx           sign-in gate + link submission
  saved/page.tsx            device-local reading list
  about/page.tsx            method, sources, ranking
  account/                  profile, name, password, email, sessions, deletion
  admin/                    editor desk: traffic, users, audit (role-gated)
  auth/                     check-email, confirm, recovery, forgot/reset password
  api/                      ingest, pulse, track route handlers
  feed.xml/route.ts         RSS 2.0
  sitemap.ts, robots.ts     SEO
  layout.tsx, globals.css   shell, fonts, theme tokens

components/                 feed, vote, save, comments, filters, shadcn/ui primitives
lib/
  store.ts                  Supabase / local JSON / read-only store, single entry point
  cached.ts                 unstable_cache wrappers for the wire (45 s) and comments (30 s)
  ingest.ts                 fetch → normalise → dedupe → 24 h filter → cap
  classify.ts               headline cleanup, kicker, relevance score, optional tags
  rank.ts                   gravity score, sorting, filtering, optional counts
  taxonomy.ts               papers, 12 topics, 6 optionals, noise rules
  sources.ts                feed config, authority tiers, blocklists
  auth.ts                   session, profile, suspension, guards
  rbac.ts                   roles, permissions, labels
  rows.ts / comments.ts / saved.ts   schema helpers
  supabase/server.ts        cookie-bound client for auth
  supabase/admin.ts         service-role client for admin actions
scripts/                    seed/ingest, auth:email, auth:admins, auth:doctor
supabase/                   migrations, config.toml, templates, schema snapshot
proxy.ts                    Next 16 proxy (formerly middleware): session refresh + guards
```

## Request lifecycle

1. **Proxy** (`proxy.ts`) runs before page requests. Anonymous visitors short-circuit without a network call;
   `/account` and `/admin` redirect to `/submit?next=…`. A request with a Supabase session cookie gets its
   token refreshed and the new cookies written back.
2. **Page** resolves search params, reads the feed through `lib/cached.ts` (React `cache` +
   `unstable_cache`, tagged `items`, 45-second revalidate), then applies filters and sorting in
   `lib/rank.ts`.
3. **Client Components** handle interaction. Votes go through a server action; saves live in `localStorage`
   and expire with the wire.
4. **Revalidation.** Ingestion calls `revalidateTag("items")` after an upsert, so a refresh is visible
   immediately rather than after the 45-second window.

## Rendering and caching

| Layer | Setting | Why |
| --- | --- | --- |
| Feed reads | `unstable_cache`, tag `items`, 45 s | The wire only changes every 15 minutes; this removes a database round trip from almost every navigation. |
| Comment reads | `unstable_cache`, tag `comments`, 30 s | Comments are hotter, but still not per-request. |
| Item page | dynamic, 404 after 24 h | Shared links are intentionally ephemeral. |
| `/sitemap.xml` | revalidate 5 min | New stories should appear without a deploy. |
| Client refresh | `router.refresh()` every 5 min + on tab focus | Keeps an open tab honest without polling. |

## Security model

- **Roles are read from `tb_profiles` on every request**, never trusted from the JWT, so a demotion takes
  effect on the next page load. The permission matrix is `lib/rbac.ts`.
- **Suspension is immediate.** `getSessionUser` returns `null` for a suspended profile and the admin action
  revokes every refresh token through the GoTrue admin logout endpoint.
- **Admin actions are audited** in `tb_admin_events` (append-only).
- **The ingest endpoint** requires `Authorization: Bearer $CRON_SECRET` in production and refuses to run
  without a writable store.
- **No secrets in the browser.** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `SUPABASE_ACCESS_TOKEN` are
  server-only. See [SECURITY.md](../SECURITY.md) for reporting.

## Failure behaviour

- **No Supabase configured** → local JSON store at `.data/store.json`; if that is missing too, the app serves
  the committed `data/seed.json` read-only and ages out to an empty wire within 24 hours.
- **A feed is down** → ingestion continues; the per-feed error is returned in the JSON response and the rest
  of the wire still updates.
- **Scheduled ingest is late** → `GET /api/pulse` lets an open tab nudge a refresh (5-minute cooldown, per-IP
  rate limit).
