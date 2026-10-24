<p align="center">
  <img src="public/brand/logo.jpg" alt="The Bureaucracy masthead portrait" width="96" style="border-radius:50%" />
</p>

<h1 align="center">The Bureaucracy</h1>

<p align="center"><strong>Civil-services intelligence, ranked.</strong><br/>
A Hacker News-style 24-hour radar for UPSC and state PSC aspirants.</p>

<p align="center">
  <a href="https://the-bureaucracy.vercel.app">Live site</a> ·
  <a href="#the-24-hour-rule">The 24-hour rule</a> ·
  <a href="#ranking">Ranking</a> ·
  <a href="#optional-subjects">Optionals</a> ·
  <a href="#local-development">Local setup</a> ·
  <a href="#deployment">Deploy</a>
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
- **Syllabus mapping.** Twelve themes across Prelims, GS I–IV and Essay, each with a paper, rationale, answer
  hooks and cue words.
- **Six optional-subject lenses.** PSIR, Geography, Sociology, Public Administration, History and
  Anthropology. A story can be general current affairs and optional material at the same time.
- **Discussion.** Threaded comments with a lightweight cookie identity. No account, no email.
- **Saving for later.** A device-local reading list that expires with the wire.
- **A clean reading surface.** Warm paper, ink, vermilion, Instrument Serif headlines, dark mode, keyboard
  navigation (`/`, `j`/`k`, `o`, `v`, `s`).
- **RSS and SEO.** `/feed.xml`, sitemap, robots, Open Graph metadata.

## The 24-hour rule

1. **Fetch.** Public RSS feeds are pulled every 15 minutes by a scheduled job.
2. **Keep.** Only items with `publishedAt` inside the last 24 hours survive ingestion.
3. **Rank.** The feed query applies the same cutoff again, so a stale row can never leak onto the page.
4. **Prune.** After each upsert, the ingestion endpoint deletes every row older than 24 hours.
5. **Refresh.** Open pages call `router.refresh()` every five minutes and when a backgrounded tab becomes
   visible again.

The item page also returns 404 once a story is older than 24 hours. Shared links are intentionally
ephemeral.

## Ranking

```
score = (points + 1) / (ageHours + 2)^1.8 × relevance × authority × freshness
```

| Term | What it means |
| --- | --- |
| `points` | Community upvotes **plus** a small syllabus-relevance baseline (`seedPoints`) so useful stories are visible before anyone votes. |
| `ageHours` | Time since publication. The `1.8` gravity term makes a story lose half its score roughly every 45 minutes after the first few hours. |
| `relevance` | `0.78 + examScore / 100 × 0.6`, from the taxonomy match. |
| `authority` | Official domains `1.26`, known quality publishers `1.05`, analysis `1.0`, aggregators `0.86`–`0.94`. |
| `freshness` | A `1.18` boost for the first three hours. |

Community votes are stored separately (`points`) from the relevance baseline (`seed_points`). A news refresh
never resets a vote. The front page also caps how many stories one publisher can hold, so a single newspaper
cannot own the top slots.

## Syllabus mapping

The taxonomy lives in [`lib/taxonomy.ts`](lib/taxonomy.ts). Each topic carries:

- a paper (`prelims`, `gs1`–`gs4`, `essay`),
- a relevance weight and rationale,
- three answer hooks,
- four cue phrases,
- a keyword list used for scoring.

The classifier scores title hits three times more than body hits, applies diminishing returns to the
strongest eight cues, and derives a 0–100 relevance score. The primary topic decides the paper; up to two
secondary topics are retained.

### Optional subjects

The six popular optionals are a **second lens**, not a separate feed silo:

| Optional | Typical tags |
| --- | --- |
| **PSIR** | foreign policy, diplomacy, sovereignty, federalism, UNSC, BRICS, G20, Quad, elections |
| **Geography** | monsoon, glacier, river basin, land use, cyclone, earthquake, groundwater, GIS |
| **Sociology** | caste, kinship, gender, religion, social change, urbanisation, inequality, social movements |
| **Public Administration** | bureaucracy, RTI, accountability, e-governance, decentralisation, service delivery, state capacity |
| **History** | ancient/medieval/modern India, freedom struggle, archaeology, heritage, art and culture |
| **Anthropology** | tribe, PVTG, ethnography, kinship, ritual, material culture, human evolution, indigenous knowledge |

A story can carry up to three optional tags. The primary optional drives the "optional fit" card on the
story page. Optional tags do **not** change the main ranking; they power `/?optional=psir`, the
[optionals desk](app/optional/page.tsx), and the optional section of the syllabus map.

## Sources

All feeds are free and public. No paid news APIs. Official releases are marked with a red dot in the UI.

- **Official:** PIB (via Google News, English), RBI press releases.
- **News & analysis:** The Hindu (national, business, sci-tech), Indian Express (India, Explained, Economy),
  Mint, Mongabay India.
- **Topic queries:** Parliament, courts, economy, diplomacy, climate, schemes, exam alerts.
- **Optional queries:** six Google News lenses for PSIR, Geography, Sociology, Public Administration,
  History and Anthropology.

Coaching, test-prep and job-spam domains are blocked at ingestion. Hindi and Devanagari-only items are
dropped. Google News is only a discovery layer; every card links to the original publisher.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** primitives (`radix-nova` style, Radix UI)
- **Supabase** (Postgres) for production persistence; JSON + local file store for development
- **Vercel** for hosting, **GitHub Actions** for the 15-minute ingestion schedule
- **Lucide** icons, **Instrument Serif** / **Inter** / **IBM Plex Mono**

## Local development

```bash
npm install
cp .env.example .env.local   # optional for local-only work
npm run seed                 # fetch the wire, write data/seed.json + .data/store.json
npm run dev
```

Open <http://localhost:3000>.

Without Supabase credentials the app uses a local JSON store. `npm run seed` writes both the committed seed
file and `.data/store.json`; votes and comments work locally and survive restarts. `npm run seed -- --file-only`
only regenerates `data/seed.json`.

Useful commands:

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run seed         # ingest + write seed/local store (+ Supabase if configured)
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | production | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production | Public key used for sign-in sessions. Safe for the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | production | Server-only key. Never expose with `NEXT_PUBLIC_`. |
| `CRON_SECRET` | production | Bearer token for `POST /api/ingest`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URL for metadata, sitemap and RSS. |
| `ADMIN_EMAILS` | optional | Comma-separated emails forced to editor, on top of the database role. |

## Accounts and the editor's desk

- **Sign-in lives at `/submit`.** Logged-out visitors get a sign-in / create-account panel; once signed in,
  the same page shows the link submission form.
- **The editor role comes from `ADMIN_EMAILS`.** The deployment's editor email (and anything listed in
  `ADMIN_EMAILS`) is promoted on sign-up and on every request; other accounts stay readers.
- **Commenting requires an account.** Voting stays anonymous and is tied to the `tb_voter` cookie, so anyone
  can vote without signing in.
- **`/admin` is the editor dashboard** — visitors and page views for 14 days, sign-ins, accounts, latest
  comments and recent paths. It is `noindex` and refuses non-editors.
- **Tracking is first-party.** [`app/api/track`](app/api/track/route.ts) stores the path, referrer, a rotating
  browser id and (when signed in) the account id. No IP addresses, no third-party scripts.

Auth tables (`tb_profiles`, `tb_visits`, `tb_login_events`) and the `comments.author_id` column are created by
[`supabase/migrations/20261024000002_accounts.sql`](supabase/migrations/20261024000002_accounts.sql).

## Supabase setup

1. Create a project at <https://supabase.com/dashboard>.
2. Apply the schema **and** the account migration, either with the SQL Editor
   ([`supabase/schema.sql`](supabase/schema.sql), then
   [`supabase/migrations/20261024000002_accounts.sql`](supabase/migrations/20261024000002_accounts.sql)) or with
   the CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   The schema creates `items`, `votes`, `comments`, RLS (no public policies), and the
   `tb_vote` / `tb_add_comment` / `tb_prune` functions. The accounts migration adds `tb_profiles`,
   `tb_visits`, `tb_login_events`, the new-user trigger and `comments.author_id`. All access uses the service
   role on the server; the browser never receives a database key.
3. Copy the project URL, the **anon** key and the **service role** key into `.env.local`.
4. Seed production:

   ```bash
   npm run seed
   ```

   The script upserts in chunks, never resets `points` or `comment_count`, and prunes rows older than
   24 hours.

> `SUPABASE_ACCESS_TOKEN` is only needed for non-interactive CLI login in CI. The running app does not use it.

## Ingestion API

`POST /api/ingest` (or `GET`) runs the full fetch → dedupe → upsert → prune cycle.

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
```

It returns JSON with `fetched`, `kept`, `inserted`, `updated`, `pruned`, per-feed `errors` and `durationMs`.
The endpoint refuses to run when no writable store is configured, and requires `CRON_SECRET` in production.

### Scheduled refresh

Three layers, cheapest first:

1. **`pg_cron` inside Supabase** ([`supabase/cron.example.sql`](supabase/cron.example.sql)) calls
   `POST /api/ingest` every 15 minutes via `pg_net`. This is the primary scheduler and the most reliable:
   it does not depend on GitHub or on anyone visiting the site.
2. **[`.github/workflows/ingest.yml`](.github/workflows/ingest.yml)** runs every 15 minutes (and on manual
   dispatch). Set:
   - repository **variable** `SITE_URL` — e.g. `https://the-bureaucracy.vercel.app`
   - repository **secret** `CRON_SECRET` — the same value as the Vercel environment variable
3. **`GET /api/pulse`** — any open tab nudges a refresh when the newest fetched item is older than 20
   minutes (5-minute cooldown, per-IP rate limit).

All three are idempotent: duplicates are merged and pruning is safe to repeat. Vercel Hobby only allows a
daily cron, which is why the schedule lives in Supabase and GitHub.

## Deployment

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Then seed the production database (`npm run seed` with production env) and trigger the GitHub Action once to
confirm the schedule. Without Supabase, the deployment is read-only: it serves the committed `data/seed.json`
and ages out to an empty wire within 24 hours.

## Project structure

```
app/
  page.tsx                 ranked home feed (sort/topic/optional/paper/search)
  item/[id]/page.tsx       story, why-it-matters, comments, related, optional fit
  optional/page.tsx        six optional-subject desks
  syllabus/page.tsx        papers, themes and optional counts
  submit/page.tsx          submit + syllabus guidelines
  saved/page.tsx           device-local reading list
  about/page.tsx           method, sources, ranking
  api/ingest/route.ts      authenticated fetch → upsert → prune
  feed.xml/route.ts        RSS 2.0
  sitemap.ts, robots.ts
components/                feed, vote, save, comments, filters, shadcn/ui
lib/
  taxonomy.ts              papers, 12 topics, 6 optionals, noise rules
  classify.ts              headline cleanup, kicker, relevance, optional tags
  ingest.ts                feed merge, dedupe, 24h filter, cap
  rank.ts                  gravity ranking, filters, optional counts
  store.ts                 Supabase / local JSON / read-only store
  sources.ts               feed config, authority, blocklists
  schema helpers           rows.ts, comments.ts, saved.ts
scripts/seed.ts            ingest + seed file + local store + Supabase
supabase/schema.sql        tables, RLS, RPC functions
.github/workflows/ingest.yml
```

## Data model

`items` stores the story, its taxonomy tags, the relevance score, community `points`, the `seed_points`
baseline and `comment_count`. `votes` is a `(item_id, voter_id)` primary key. `comments` is a self-referencing
thread. The RPC functions toggle a vote and add a comment atomically.

Feed items carry:

```ts
type FeedItem = {
  id: string; title: string; kicker: string; url: string;
  source: string; sourceUrl: string;
  sourceTier: "official" | "news" | "analysis" | "aggregator";
  summary: string; publishedAt: string; fetchedAt: string;
  topics: TopicId[]; primaryTopic: TopicId | null;
  optionals: OptionalId[]; primaryOptional: OptionalId | null;
  examScore: number; priority: "high" | "medium" | "low";
  keywords: string[];
  points: number; seedPoints: number; commentCount: number;
};
```

## Limitations

- **RSS is late and lossy.** Some publishers update their feeds hourly; breaking news can lag. Google News
  occasionally rewrites links, so canonical URLs vary between runs.
- **The 24-hour delete is deliberate.** Shared item links 404 after the window. Save the original if you
  need a permanent record.
- **Keyword mapping is approximate.** It is a reading aid, not an authoritative syllabus. Always check the
  official notification or judgment.
- **Anonymous identity is a cookie.** Clearing cookies loses your votes and comments; there is no account
  recovery.
- **GitHub Actions can be delayed.** Under load, schedules may drift by several minutes. The client refresh
  and on-demand ingest keep the wire usable.
- **No full-text scraping.** Excerpts come from RSS and page metadata; paywalled originals stay paywalled.

## Credits

Masthead portrait: **VIVA CHE**, Jim Fitzpatrick (1968), supplied by the editor. It is a masthead reference,
not a political endorsement, and is excluded from the MIT licence.

Headlines and excerpts remain the property of their publishers. The ranking, taxonomy and interface are
released under the [MIT licence](LICENSE).

Built by [0xMudit](https://github.com/0xMudit). Not affiliated with UPSC, any state PSC, or the Government of
India.
