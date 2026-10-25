# Documentation

Everything an operator, contributor or self-hoster needs. The root
[README](../README.md) is the front door; these pages are the manual.

| Page | Read it when… |
| --- | --- |
| [local-development.md](local-development.md) | You want the app running on your machine in five minutes. |
| [architecture.md](architecture.md) | You need to know how a request becomes a page, and where code belongs. |
| [ingestion.md](ingestion.md) | You are adding a source, debugging a feed, or touching the 24-hour rule. |
| [ranking-and-taxonomy.md](ranking-and-taxonomy.md) | You are changing scores, themes, papers or optional lenses. |
| [supabase.md](supabase.md) | You are setting up Postgres, auth, roles, migrations or email. |
| [deployment.md](deployment.md) | You are shipping to Vercel and wiring the refresh schedule. |
| [monitoring.md](monitoring.md) | You are setting up Sentry, the uptime probe, or answering "is it down?". |
| [api.md](api.md) | You are calling the app from a script, cron job or another service. |
| [mobile.md](mobile.md) | You are working on the iOS/Android app in `mobile/` or changing the `/api/mobile/*` contract. |
| [engagement.md](engagement.md) | You are touching the brief, the streak, the desk or the funnel events. |
| [prompts/retention-engine.md](prompts/retention-engine.md) | You are picking up the next retention phase: PYQ, reveal, coverage, revision, digest. |
| [roadmap.md](roadmap.md) | You want to know what is planned and where to help. |

## Ground rules

- **The 24-hour window is the product.** Nothing in the docs should quietly introduce an archive. A feature
  that keeps a story forever needs a deliberate design discussion in an issue first.
- **One source of truth.** Database DDL lives in `supabase/migrations/`. Feed definitions live in
  `lib/sources.ts`. Taxonomy lives in `lib/taxonomy.ts`. Do not duplicate those lists elsewhere.
- **Server-side authority.** The browser never receives a Supabase key. Roles and permissions are checked on
  the server (`lib/rbac.ts`), not hidden in the client.
- **Privacy is a feature.** First-party tracking only, no IP addresses, no third-party scripts. Keep it that
  way.
