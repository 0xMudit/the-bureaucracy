# Contributing to The Bureaucracy

Thanks for wanting to help. This project is a syllabus-aware 24-hour news radar for UPSC and state PSC
aspirants, and it improves fastest when readers, aspirants and engineers all push on it.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| You are… | Start here |
| --- | --- |
| Reporting a bug | [Open a bug report](https://github.com/0xMudit/the-bureaucracy/issues/new?template=bug_report.yml) |
| Suggesting a feature | [Open a feature request](https://github.com/0xMudit/the-bureaucracy/issues/new?template=feature_request.yml) |
| Suggesting a news source | Feature request, labelled `area: content` — include a sample headline and why it helps the syllabus |
| Fixing the taxonomy | Edit `lib/taxonomy.ts`; explain the exam rationale, not just the regex |
| Writing code | Look for [`good first issue`](https://github.com/0xMudit/the-bureaucracy/labels/good%20first%20issue) |
| Improving docs | `docs/` is fair game; small fixes need no issue |
| Reporting a vulnerability | **Do not open a public issue** — see [SECURITY.md](SECURITY.md) |

## Before you start

- **Open an issue for anything larger than a typo.** It is cheaper to agree on the approach first.
- **One concern per pull request.** A bug fix should not carry a refactor.
- **Do not add a dependency** without saying why in the issue. The stack is deliberately small.
- **Do not break the 24-hour rule.** No feature may quietly retain stories past the window. Discuss it in an
  issue first.

## Development setup

```bash
git clone https://github.com/<your-fork>/the-bureaucracy.git
cd the-bureaucracy
npm install
cp .env.example .env.local   # optional
npm run seed
npm run dev
```

Full instructions, including Supabase, live in [docs/local-development.md](docs/local-development.md).

## The checks your PR must pass

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

CI runs both on every pull request (`npm run check`). A pull request that does not build will not be reviewed.

## Code conventions

- **TypeScript strict mode.** No `any` unless you explain it in a comment.
- **Server authority.** Authorise in the server action or route handler, not only in the UI. Roles come from
  `tb_profiles` via `lib/rbac.ts`.
- **One source of truth.** Database DDL in `supabase/migrations/`, feeds in `lib/sources.ts`, taxonomy in
  `lib/taxonomy.ts`. Do not copy those lists into components.
- **Match the surrounding style.** Named exports, small functions, comments that explain *why*.
- **Accessibility is not optional.** Every interactive element needs a keyboard path and an accessible name.
- **No client-side secrets.** Only `NEXT_PUBLIC_*` values may reach the browser.

## Commit and pull request style

Commit subjects follow `<scope>: <what changed>`, for example:

```
rank: cap publisher share of the top ten
auth: refuse unconfirmed addresses on login
docs: document the pg_cron schedule
```

A good pull request description answers:

1. **What changed** and why.
2. **How you tested it** (commands, routes, screenshots).
3. **What could break** — migrations, env vars, scheduled jobs.
4. **Issue link** (`Closes #123`).

Keep the diff reviewable. If a change touches more than ~400 lines, split it.

## Adding or changing a news source

1. Add the feed to `SOURCES` in `lib/sources.ts` with `name`, `url`, `tier` and an optional topic hint.
2. Run `npm run seed` and check the per-feed `errors`.
3. Confirm the card links to the original publisher, not an aggregator redirect.
4. Include a sample headline in the pull request.

Feeds that need a paid key or article-body scraping are out of scope.

## Database changes

- Add a new migration under `supabase/migrations/` with a timestamp prefix; never edit an applied one.
- Make it forward-only and idempotent where practical (`if not exists`, `create or replace`).
- Update [docs/supabase.md](docs/supabase.md) and, if the shape changed, the schema snapshot header.
- Test with `npm run db:reset` locally before opening the pull request.

## Review and merge

- A maintainer reviews every pull request. Expect comments, not silence.
- Squash-merge is the default; keep the subject line meaningful.
- The maintainer may push small fixups to your branch to land it faster. Say so if you would rather not.

## Licence

By contributing you agree that your work is released under the [MIT licence](LICENSE). The masthead portrait
is excluded from that licence and must not be reused elsewhere.
