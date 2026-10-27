# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **In-app membership** (`/plus` in the app, `lib/billing.ts`): Razorpay's native checkout opens over
  the paywall — no browser redirect. The app asks the server for an order priced from `CATALOG`, then
  returns Razorpay's three signed values; `POST /api/mobile/billing/verify` checks the HMAC **and**
  fetches the payment to require `captured` before writing `profiles.plan`. One-time orders per
  prepaid period, so there is no auto-debit: renewals are manual and `plan_expires_at` drives access.
  A signed webhook (`/api/billing/razorpay`) applies `payment.captured`, `payment.failed` and
  `refund.processed` for payments that complete while the app is closed, idempotent via
  `tb_payments` status transitions. See [`docs/billing.md`](docs/billing.md).
- **Premium read** (`/plus`, `lib/premium.ts`): a Groq-written pack per story — a deep read,
  takeaways, three Prelims traps with reasoning, a Mains skeleton and a glossary — generated once
  per story per prompt version and cached in `tb_premium_reads`. The story API and the web page
  return the paid text only to a `plus` or `mains` plan; free readers get a teaser, and the gate is
  server-side, never a CSS overlay.
- **Entitlements** (`lib/entitlements.ts`): `free` / `plus` / `mains` on `profiles`, `can(feature)`,
  read-time expiry so a lapsed plan needs no cron, and an automatic top tier for admins. Provider
  usage lands in `tb_ai_usage` with token counts and estimated cost.
- **Read-time de-duplication** (`lib/dedupe.ts`): near-duplicate stories that entered in
  different ingest runs now collapse on the front page, the brief and the mobile feed, keeping
  the highest-tier, highest-scoring copy.
- **Relevance floor** (`FEED_MIN_SCORE = 35`): browsing is curated, search stays complete, and
  saved stories never disappear.
- **A payoff line on every feed card** (`payoffFor`), shared by the brief and the mobile payload.
- **A dedicated login page** (`/login`); signed-out visits to `/submit` are redirected there with
  a `next` return path.
- **`docs/prompts/retention-engine.md`**: the phased brief for PYQ linkage, guess-before-reveal,
  the coverage map, spaced revision and the Telegram digest.
- **Daily reading loop**: a finite "Today's five" brief, per-day read tracking, an IST streak,
  a desk (exam / stage / optional) that tilts the ranking without filtering it, serial
  "next unread" reading, a 07:00 IST countdown with a downloadable calendar reminder, and a
  home-screen manifest. See [`docs/engagement.md`](docs/engagement.md).
- **First-party funnel events** (`/_event/*` via `/api/track`) for desk setup, brief completion,
  reads, shares and reminders.
- **Native app** (`mobile/`): an Expo SDK 54 client — expo-router tabs for the wire, the reading list
  and the syllabus, a story screen with why-it-matters and discussion, search, optimistic haptic
  voting, and the web's palette ported to React Native.
- **`/api/mobile/*`**: feed, item, taxonomy and vote endpoints with `version: 1`, CORS and per-device
  vote identity (`m_<device-id>`).
- **Accounts and roles**: email-verified sign-up, password recovery, session management, profile
  editing and deletion; `reader` / `editor` / `admin` with suspension and an append-only audit trail.
- **Editor desk**: `/admin` traffic and activity, `/admin/users` register with role changes and
  `/admin/audit`.
- **Analytics desk** (`/admin`): a sidebar-backed dashboard with overview, acquisition and retention
  tabs, first-party traffic and brief-funnel charts, and clearly labelled demo blocks for device,
  source-share and cohort data that the current tracker cannot measure yet.
- Branded Supabase confirmation and recovery templates (`npm run auth:email`), plus
  `npm run auth:admins` and `npm run auth:doctor`.
- Open-source project scaffolding: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and pull
  request templates, Dependabot and a CI workflow.
- `docs/` — architecture, local development, ingestion, ranking and taxonomy, Supabase, deployment and API
  reference.
- `npm run check`, `db:push`, `db:reset` and `db:start` scripts.

### Changed

- The front page leads with a five-story brief and a one-tap desk question instead of a bare
  forty-row feed; the anonymous header CTA is "Today's five" rather than "Log in".
- CI typechecks and bundles both surfaces: the Next.js app and `mobile/`.
- README slimmed to a front door; operational detail moved to `docs/`.
- The scheduled ingest workflow is guarded to the upstream repository so forks do not trigger it.
- `supabase/schema.sql` is documented as a snapshot; `supabase/migrations/` is the source of truth.
- `.gitignore` now covers local agent tooling, editor state and logs.

### Removed

- Duplicate root copy of the masthead image (`public/brand/logo.jpg` remains the canonical file).

## [1.0.0] — 2026-10-24

### Added

- 24-hour ranked wire: fetch → dedupe → classify → upsert → prune, with a hard delete after 24 hours.
- Hacker News-style gravity ranking weighted by syllabus relevance, source authority and freshness.
- Twelve syllabus themes across Prelims, GS I–IV and Essay, plus six optional-subject lenses.
- Threaded comments, anonymous voting, saving for later, keyboard navigation and dark mode.
- Supabase accounts with email verification, password recovery, profile and session management.
- Three roles (`reader`, `editor`, `admin`) with a server-side permission matrix, suspension and an audit log.
- Editor dashboard with traffic, sign-ins, the account register and recent paths.
- RSS feed, sitemap, robots and Open Graph metadata.
- Scheduled ingestion through `pg_cron`, GitHub Actions and an on-demand pulse endpoint.
