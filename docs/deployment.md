# Deployment

The reference deployment is **Vercel** (function region `bom1`) plus **Supabase**, with the refresh schedule
split between **`pg_cron`**, **GitHub Actions** and an on-demand pulse. Nothing here is Vercel-specific except
the environment-variable commands; any Node host works.

## 1. Supabase

Follow [supabase.md](supabase.md) first: create the project, `npm run db:push`, `npx supabase config push`,
install mail ([email.md](email.md)), promote admins, run `npm run auth:doctor`.

## 2. Environment variables

Set these for **Production**, **Preview** and **Development** as appropriate:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add CRON_SECRET production
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add ADMIN_EMAILS production
```

- `NEXT_PUBLIC_SUPABASE_URL` and the anon key are public.
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `SUPABASE_ACCESS_TOKEN` are secrets.
- Keep `NEXT_PUBLIC_SITE_URL` on the production origin so confirmation links never point at a preview host.
- Preview deployments still sign in if the Supabase redirect allow-list contains the preview wildcard
  (already in `supabase/config.toml`).

## 3. Deploy

```bash
npm i -g vercel
vercel link
vercel --prod
```

`vercel.json` pins the function region to `bom1` so functions sit next to the Supabase project.

## 4. Seed the production wire

```bash
npm run seed
```

The script upserts in chunks, never resets `points` or `comment_count`, and prunes rows older than 24 hours.

Without Supabase the deployment is read-only: it serves the committed `data/seed.json` and ages out to an
empty wire within 24 hours.

## 5. Scheduled refresh

Three layers, cheapest first. All are idempotent: duplicates merge and pruning is safe to repeat.

### 5a. `pg_cron` inside Supabase (primary)

[`supabase/cron.example.sql`](../supabase/cron.example.sql) installs a `pg_cron` + `pg_net` job that calls
`POST /api/ingest` every 15 minutes. It does not depend on GitHub or on anyone visiting the site.

### 5b. GitHub Actions (backup)

[`.github/workflows/refresh-wire.yml`](../.github/workflows/refresh-wire.yml) runs every 15 minutes and on
manual dispatch. Set:

- repository **variable** `SITE_URL` — e.g. `https://the-bureaucracy.vercel.app`
- repository **secret** `CRON_SECRET` — the same value as the Vercel environment variable

The job is guarded with `if: github.repository == '0xMudit/the-bureaucracy'` so forks do not send traffic
(and failure mail) to the upstream site. Point your fork at your own deployment by editing that guard.

### 5c. On-demand pulse (opportunistic)

`GET /api/pulse` lets any open tab nudge a refresh when the newest fetched item is older than 20 minutes
(5-minute cooldown, per-IP rate limit). Vercel Hobby only allows a daily cron, which is why the real schedule
lives in Supabase and GitHub.

## 6. Post-deploy checklist

- [ ] `curl -X POST https://<site>/api/ingest -H "Authorization: Bearer $CRON_SECRET"` returns `ok: true`.
- [ ] The home page shows stories from the last 24 hours.
- [ ] Sign-up → confirmation mail → sign-in works on the production domain.
- [ ] `/auth/forgot-password` mail lands on the production origin.
- [ ] `/admin` is reachable for the `ADMIN_EMAILS` address and refuses everyone else.
- [ ] `/feed.xml`, `/sitemap.xml` and `/robots.txt` use the production URL.
- [ ] `npm run auth:doctor` exits 0 against production credentials.

## Rollback

Vercel keeps every deployment: promote the previous one from the dashboard. Database migrations are additive;
if a migration must be reverted, write a new forward migration rather than editing an applied one.
