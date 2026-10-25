# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source project scaffolding: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and pull
  request templates, Dependabot and a CI workflow.
- `docs/` — architecture, local development, ingestion, ranking and taxonomy, Supabase, deployment and API
  reference.
- `npm run check`, `db:push`, `db:reset` and `db:start` scripts.

### Changed

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
