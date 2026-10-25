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
deletes it. The constraint is the product.

## What it does

- **A ranked wire, not a feed.** Reader upvotes, freshness and syllabus relevance produce a Hacker News-style
  front page.
- **A hard 24-hour window.** Queries filter older stories out, and every ingestion deletes rows older than
  24 hours. Nothing is archived.
- **De-duplication.** Canonical URLs are merged; near-duplicate headlines are clustered with token
  Jaccard/overlap matching, preferring official sources.
- **Syllabus mapping.** Twelve themes across Prelims, GS I–IV and Essay, each with a paper, rationale,
  answer hooks and cue words.
- **Six optional-subject lenses.** PSIR, Geography, Sociology, Public Administration, History and
  Anthropology. A story can be general current affairs and optional material at the same time.
- **Accounts, comments and a desk.** Email-verified sign-up, threaded discussion, a device-local reading
  list, and an editor dashboard with roles, suspension and an audit trail.
- **A clean reading surface.** Warm paper, ink, vermilion, Instrument Serif headlines, dark mode, keyboard
  navigation (`/`, `j`/`k`, `o`, `v`, `s`).
- **RSS and SEO.** `/feed.xml`, sitemap, robots, Open Graph metadata.
- **A native client.** [`mobile/`](mobile/README.md) is an Expo SDK 54 app for iOS and Android that
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

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** primitives (Radix UI)
- **Supabase** (Postgres, Auth) for production persistence; JSON + local file store for development
- **Vercel** for hosting, **GitHub Actions** / **`pg_cron`** for the 15-minute ingestion schedule
- **Lucide** icons, **Instrument Serif** / **Inter** / **IBM Plex Mono**
- **Expo SDK 54** + **expo-router** + **React Query** for the native app in `mobile/`

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
client.

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
