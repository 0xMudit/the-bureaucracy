<p align="center">
  <img src="public/brand/logo.jpg" alt="The Bureaucracy masthead portrait" width="96" style="border-radius:50%" />
</p>

<h1 align="center">The Bureaucracy</h1>

<p align="center"><strong>Civil-services intelligence, ranked.</strong><br/>
A Hacker News-style 24-hour radar for UPSC and state PSC aspirants.</p>

<p align="center">
  <a href="https://the-bureaucracy.vercel.app">Live site</a> ·
  <a href="docs/">Documentation</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="https://github.com/0xMudit/the-bureaucracy/issues">Issues</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-black" /></a>
  <a href="https://github.com/0xMudit/the-bureaucracy/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/0xMudit/the-bureaucracy/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-black" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ecf8e" />
  <a href="https://github.com/0xMudit/the-bureaucracy/issues"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen" /></a>
</p>

---

Most current-affairs products are archives. They reward accumulation: one more PDF, one more monthly
compilation, one more open tab. The civil services examination rewards something else — taking a single
policy event, placing it against the syllabus, and arguing about it under time pressure.

The Bureaucracy keeps **only the last 24 hours** of policy journalism, ranks it for exam relevance, and then
archives it. The constraint is the product.

## What it does

- **A ranked wire, not a feed.** Reader likes, freshness and syllabus relevance produce a Hacker News-style
  front page.
- **A hard 24-hour window.** Queries filter older stories out, and every ingestion archives rows older than
  24 hours into a searchable archive — nothing is silently deleted.
- **De-duplication.** Canonical URLs are merged; near-duplicate headlines are clustered with token
  Jaccard/overlap matching, preferring official sources.
- **Syllabus mapping.** Twelve themes across Prelims, GS I–IV and Essay, each with a paper, rationale,
  answer hooks and cue words.
- **Six optional-subject lenses.** PSIR, Geography, Sociology, Public Administration, History and
  Anthropology. A story can be general current affairs and optional material at the same time.
- **LLM enrichment.** One call per article at ingestion returns five punchy bullets, a "Why it matters"
  exam angle, a Prelims fact, and a Mains angle. Cached in Postgres; never called per page view.
- **Accounts, reactions and a desk.** Email-verified sign-up, Like/Dislike/Comment/Save reactions with
  optimistic UI, threaded discussion, a device-local reading list synced to an account.
- **Avatars without uploads.** Users pick a generated avatar (react-nice-avatar) — no file storage needed.
- **Notifications.** Web push (VAPID), streak nudges, reply alerts, a daily 7am brief. iOS requires PWA
  install; an "Add to Home Screen" guide is shown.
- **A clean reading surface.** Warm paper, ink, vermilion, Instrument Serif headlines, dark mode, keyboard
  navigation (`/`, `j`/`k`, `o`, `l`, `d`, `c`, `s`), command palette (`⌘K` / `/`).
- **RSS and SEO.** `/feed.xml`, sitemap, robots, Open Graph metadata.
- **Admin dashboard at `/admin`.** Analytics, accounts, moderation, ingestion health, LLM job queue, push
  campaigns, content management, settings, audit log. Protected by role-based access.
- **A native client.** [`mobile/`](mobile/README.md) is an Expo SDK 58 app for iOS and Android that
  reads the same `/api/mobile/*` endpoints — same ranking, same taxonomy, same votes.

## Quick start

```bash
git clone https://github.com/0xMudit/the-bureaucracy.git
cd the-bureaucracy
npm install
cp .env.example .env.local   # optional for local-only work
npm run seed                 # fetch the wire into data/seed.json + .data/store.json
npm run dev
```

Open <http://localhost:3000>. Without Supabase credentials the app runs on a local JSON store, so votes and
comments work and survive restarts. Full instructions, including the Supabase and Vercel paths, live in
**[docs/local-development.md](docs/local-development.md)**.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run check` | Typecheck + production build (what CI runs). |
| `npm run seed` | Fetch feeds, write `data/seed.json`, the local store and (when configured) Supabase. |
| `npm run auth:email` | Push the branded confirmation/recovery mail to Supabase. |
| `npm run auth:smtp` | Pre-flight SPF, DKIM, DMARC, MX, SMTP reachability and the Supabase mail state. |
| `npm run auth:admins` | Promote `ADMIN_EMAILS` in the `tb_profiles` register. |
| `npm run auth:doctor` | Read-only check of keys, tables, profiles and admin rows. |
| `npm run db:push` / `db:reset` | Supabase migrations via the CLI. |
| `npm run db:snapshot` | Regenerate `supabase/schema.sql` from the migrations. |

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** primitives (Radix UI)
- **Supabase** (Postgres, Auth) for production persistence; JSON + local file store for development
- **Vercel** for hosting, **GitHub Actions** / **`pg_cron`** for the 15-minute ingestion schedule
- **Lucide** icons, **Instrument Serif** / **Inter** / **IBM Plex Mono**
- **Expo SDK 58** + **expo-router** + **React Query** for the native app in `mobile/`
- **react-nice-avatar** for generated avatars (no file uploads)
- **web-push** for VAPID-signed web push notifications
- **zod** for LLM response validation

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values you need:

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Accounts, reactions, push | From the Supabase project dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, reactions, push | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin dashboard, RLS bypass | Keep server-side only |
| `VAPID_PUBLIC_KEY` | Web push | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web push | Keep server-side only |
| `VAPID_SUBJECT` | Web push | `mailto:your@email.com` or your site URL |
| `GEMINI_API_KEY` | LLM enrichment | Free tier; 60 req/min |
| `GROQ_API_KEY` | LLM enrichment (fallback) | Free tier; 30 req/min |
| `OPENROUTER_API_KEY` | LLM enrichment (fallback) | Free-tier models available |
| `CLOUDFLARE_ACCOUNT_ID` | LLM enrichment (fallback) | Workers AI |
| `CLOUDFLARE_AI_TOKEN` | LLM enrichment (fallback) | Workers AI |
| `ADMIN_EMAILS` | Admin access | Comma-separated; always admin regardless of DB |
| `AI_MAX_PER_RUN` | LLM rate cap | Max articles enriched per ingest run (default 20) |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring | Optional |

The app runs without any env vars set — it falls back to local JSON storage and skips LLM calls.

## Database schema and RLS

Migrations live in `supabase/migrations/`. Run `npm run db:push` to apply them to your linked project.
`supabase/schema.sql` is a regenerated snapshot (`npm run db:snapshot`).

### Key tables

| Table | Purpose | RLS rule |
| --- | --- | --- |
| `profiles` | username, avatar, role, state/district | Users read/write own row; admins read all |
| `reactions` | like / dislike, one per user per item | Users write own row; counts readable by all |
| `saves` | user's reading list | Users read/write own rows only |
| `comments` | threaded discussion (one level) | Readable by all; writable by auth'd users |
| `comment_likes` | likes on comments | Users write own row |
| `user_follows` | follower/following graph | Users write own rows; no self-follow |
| `notifications` | in-app notification inbox | Users read own rows only |
| `push_subscriptions` | VAPID subscription objects | Users read/write own rows |
| `notification_prefs` | per-type toggles and quiet hours | Users read/write own rows |
| `streaks` | daily brief completion streak | Users read own row |
| `items` | feed articles (mirrored from seed) | Readable by all; writable by service role |
| `tb_visits` | privacy-first page views | Service role only |
| `tb_admin_events` | append-only audit log | Admin read; service role write |

Counts (likes, dislikes, comment counts, follower/following) are maintained by triggers — never `COUNT(*)` per
request.

## LLM pipeline

One call per article at ingestion. The response is validated with zod, cached in Postgres, and reused until
the story is archived. Page views never call a provider.

**Fallback chain:** Gemini free → Groq free → OpenRouter free → Cloudflare Workers AI

Each provider can fail. On failure the chain moves to the next. After all providers fail, the article falls
back to a plain excerpt. Every attempt and failure is logged to `tb_llm_jobs`.

**Rate limits:** None of the free tiers is unlimited. `AI_MAX_PER_RUN` caps work per ingest tick (default
20). The queue fills on the next cron run. The admin LLM page shows coverage and provider stats.

## Web push / VAPID

1. Generate keys: `npx web-push generate-vapid-keys`
2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in env vars.
3. The service worker at `public/sw.js` handles push events.
4. Push is delivered by `lib/web-push.ts` via the `/api/notifications/run` route or Vercel cron.
5. iOS requires the site to be installed as a PWA (Add to Home Screen). The permission banner explains this.
6. Frequency cap: max 2 pushes per user per day; quiet hours respected via `notification_prefs`.

## Admin dashboard (`/admin`)

Protected: Supabase auth + `profiles.role = 'admin'` (or `'editor'` for moderation). Non-admins see a 403
page; the middleware redirects unauthenticated users to login.

### How to grant admin access

**Option 1 (recommended):** Set `ADMIN_EMAILS=you@example.com` in your env. This address is always admin.
Run `npm run auth:admins` to promote it in the database.

**Option 2:** In the Accounts page (`/admin/users`), change a user's role to `admin`. Requires an existing
admin account.

### Dashboard sections

| Route | What it shows |
| --- | --- |
| `/admin` | Analytics: visitors, sessions, page views, DAU/WAU/MAU, D1/D7/D30 retention, brief finish rate, top pages, traffic sources, device split, geo/state breakdown |
| `/admin/users` | Accounts table: search, filter by role/status, promote, suspend, revoke sessions |
| `/admin/comments` | Moderation queue: reported comments (hide, dismiss, delete), recent comments |
| `/admin/ingestion` | Feed health: per-source article counts, last-sync timestamps, error log |
| `/admin/llm` | LLM enrichment: coverage %, provider stats, recent job log |
| `/admin/push` | Push campaigns: subscriber count, manual-send form, campaign history with delivery/click rates |
| `/admin/content` | Wire management: pin, hide, or reclassify topic of any story |
| `/admin/settings` | Env var health check, quick-action buttons, admin grant instructions |
| `/admin/audit` | Append-only audit log of role changes, suspensions and session revocations |

Analytics uses real `tb_visits` data where available. Session length, device/browser split, D1/D7/D30
retention and traffic-source share use **demo data** (clearly labelled in the code and UI with a "Demo
data" badge) — these need a richer event stream than the current privacy-preserving tracker writes.

## Theming

Design tokens are OKLCH CSS variables in `app/globals.css`. Both light and dark are fully defined; no
hardcoded colours anywhere.

`ThemeColorSync` keeps the browser chrome / iOS PWA status bar in sync with the chosen theme. It adds an
*additional* override `<meta name="theme-color">` tag rather than replacing the server-rendered
media-conditional ones, avoiding a flash on PWA re-open.

`next-themes` is configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and
`suppressHydrationWarning` on `<html>`. The storage key is `tb-theme`.

## Opening animation

A one-second reading-room curtain (`components/opening-sequence.tsx`). The real page renders underneath;
the overlay is a cosmetic curtain that never delays data or interaction. Runs once per browser session
(keyed to `sessionStorage`). Removed instantly for users who prefer reduced motion. Uses a `"pending"`
state on first render so the server never paints the overlay — eliminating SSR/hydration flash.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `j` / `k` | Next / previous story |
| `o` or `Enter` | Open selected story |
| `l` | Like selected story |
| `d` | Dislike selected story |
| `c` | Open comments for selected story |
| `s` | Save / unsave selected story |
| `/` or `⌘K` | Open command palette |
| `Escape` | Deselect story |

## The native app

The phone is not a second product: it is a client of this deployment.

```bash
npm run dev                # the API the app reads, on :3000
cd mobile && npm install && npm start
```

| Platform | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS simulator / Expo web | `http://localhost:3000` |
| Android emulator | rewritten to `http://10.0.2.2:3000` automatically |
| Real phone | `http://<your-lan-ip>:3000` |

The app talks only to `/api/mobile/*`; the service role stays on the server. See
[docs/mobile.md](docs/mobile.md) for the contract and [mobile/README.md](mobile/README.md) for the
client. It is a **true native Expo SDK 58 app** (not a PWA wrapper) using expo-router and React Query.

## shadcn/ui components used

| Component | Used in | Path |
| --- | --- | --- |
| Avatar | User avatars everywhere | `components/ui/avatar.tsx` |
| Badge | Topics, tiers, status labels | `components/ui/badge.tsx` |
| Button | All interactive buttons | `components/ui/button.tsx` |
| Calendar | Admin push scheduling (future) | `components/ui/calendar.tsx` |
| Card | Feed cards, stats panels | `components/ui/card.tsx` |
| Chart | Admin analytics charts | `components/ui/chart.tsx` |
| Command | Command palette | `components/ui/command.tsx`, `components/command-menu.tsx` |
| Dialog | Avatar picker, modals | `components/ui/dialog.tsx` |
| Dropdown Menu | Theme toggle, sort menus | `components/ui/dropdown-menu.tsx` |
| Empty | Empty-state placeholders | `components/ui/empty.tsx` |
| Field | Form fields | `components/ui/field.tsx` |
| Input | Search, forms | `components/ui/input.tsx` |
| Label | Form labels | `components/ui/label.tsx` |
| Popover | Tooltips, popovers | `components/ui/popover.tsx` |
| Progress | Brief completion, streaks | `components/ui/progress.tsx` |
| Scroll Area | Sidebar, long lists | `components/ui/scroll-area.tsx` |
| Select | Filters, dropdowns | `components/ui/select.tsx` |
| Separator | Section dividers | `components/ui/separator.tsx` |
| Sheet | Mobile nav drawer | `components/ui/sheet.tsx` |
| Sidebar | Admin navigation | `components/ui/sidebar.tsx` |
| Skeleton | Loading states | `components/ui/skeleton.tsx` |
| Sonner (Toaster) | Toast notifications | `components/ui/sonner.tsx` |
| Switch | Notification preference toggles | `components/ui/switch.tsx` |
| Table | Admin data tables | `components/ui/table.tsx` |
| Tabs | Feed sort tabs, admin tabs | `components/ui/tabs.tsx` |
| Textarea | Comment input | `components/ui/textarea.tsx` |
| Tooltip | Button labels on hover | `components/ui/tooltip.tsx` |

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/local-development.md](docs/local-development.md) | Clone, environment variables, the local store, troubleshooting. |
| [docs/architecture.md](docs/architecture.md) | Request flow, directory map, rendering and caching, security model. |
| [docs/ingestion.md](docs/ingestion.md) | Sources, the fetch → dedupe → upsert → prune pipeline, the 24-hour rule. |
| [docs/ranking-and-taxonomy.md](docs/ranking-and-taxonomy.md) | The ranking formula, the twelve themes and six optional lenses. |
| [docs/supabase.md](docs/supabase.md) | Migrations, auth, roles, email templates and the CLI workflow. |
| [docs/deployment.md](docs/deployment.md) | Vercel, environment variables, scheduled refresh. |
| [docs/monitoring.md](docs/monitoring.md) | Health endpoint, the uptime probe, Sentry and incident triage. |
| [docs/api.md](docs/api.md) | Every route and endpoint, with request/response shapes. |
| [docs/mobile.md](docs/mobile.md) | The native app: endpoints, device identity, keeping the contract in sync. |
| [docs/roadmap.md](docs/roadmap.md) | Where the project is going; mirrors the GitHub issues. |

## Supabase free / Pro limits and scaling notes

The app is designed to stay well within Supabase free tier:
- **Postgres rows:** Feed items are limited to 24 hours (~200–400 rows max); older items move to archive.
- **Auth:** Free tier supports up to 50,000 MAU.
- **Realtime:** Only used on open discussion pages (one channel per item page). Idle channels are
  unsubscribed on unmount.
- **Storage:** Not used — avatars are generated client-side, no file storage needed.
- **Edge Functions:** Not used in the current deployment (Vercel crons handle ingestion).

If you scale past free tier, the first bottleneck will be Realtime connections and `tb_visits` write
throughput. Both can be addressed without schema changes.

## Deployment on Vercel

```bash
vercel deploy --prod
```

Or push to `main` — the CI workflow (`/.github/workflows/ci.yml`) runs typecheck + build on every push.

Set all env vars in the Vercel project settings. The ingestion cron (`/.github/workflows/refresh-wire.yml`)
runs every 15 minutes via a GitHub Actions workflow that calls `/api/ingest`.

## What needs your manual action

| Item | What to do |
| --- | --- |
| **Supabase project** | Create a project, copy URL + anon key + service role key into env |
| **DB migrations** | Run `npm run db:push` after linking with `npx supabase link` |
| **VAPID keys** | `npx web-push generate-vapid-keys` → add to env |
| **Admin account** | Add your email to `ADMIN_EMAILS`, run `npm run auth:admins` |
| **LLM keys** | Add at least one of GEMINI/GROQ/OPENROUTER to enable enrichment |
| **Ingest cron** | The GitHub Actions workflow is ready; set `INGEST_SECRET` and enable it |
| **Custom domain** | Set in Vercel project settings |

## Contributing

Contributions are welcome — bug reports, source suggestions, taxonomy fixes and features alike.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
2. Browse [`good first issue`](https://github.com/0xMudit/the-bureaucracy/labels/good%20first%20issue) or
   [`help wanted`](https://github.com/0xMudit/the-bureaucracy/labels/help%20wanted).
3. Open an issue before a large pull request so the approach can be agreed first.

Security reports go through [SECURITY.md](SECURITY.md), not the public issue tracker.

## Licence

Source code and the interface are released under the [MIT licence](LICENSE).

The masthead portrait ("VIVA CHE", Jim Fitzpatrick, 1968) is supplied by the editor, is a masthead
reference rather than a political endorsement, and is **not** covered by the MIT licence. News headlines and
excerpts remain the property of their respective publishers.

Built by [0xMudit](https://github.com/0xMudit). Not affiliated with UPSC, any state PSC, or the Government of
India.
