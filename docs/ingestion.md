# Ingestion and the 24-hour rule

## The promise

The Bureaucracy keeps **only the last 24 hours** of policy journalism, ranks it for exam relevance, and then
deletes it. The constraint is the product.

1. **Fetch.** Public RSS feeds are pulled every 15 minutes by a scheduled job.
2. **Keep.** Only items with `publishedAt` inside the last 24 hours survive ingestion.
3. **Rank.** The feed query applies the same cutoff again, so a stale row can never leak onto the page.
4. **Prune.** After each upsert, ingestion deletes every row older than 24 hours.
5. **Refresh.** Open pages call `router.refresh()` every five minutes and when a backgrounded tab becomes
   visible again.

The item page also returns 404 once a story is older than 24 hours. Shared links are intentionally ephemeral.

## Pipeline

```
lib/sources.ts ──► fetchAllFeeds() ──► normalise ──► classify ──► dedupe ──► 24 h filter ──► cap
                                                                                  │
                                                        data/seed.json ◄──────────┤
                                                        .data/store.json ◄────────┤
                                                        Supabase (upsert) ◄───────┘
                                                                                  │
                                                                     pruneOlderThan(now − 24 h)
```

| Stage | File | What it does |
| --- | --- | --- |
| Source list | `lib/sources.ts` | Feeds, authority tier, blocklists, Google News query lenses. |
| Fetch | `lib/ingest.ts` | Parallel fetch with timeouts; per-feed errors are collected, never fatal. |
| Normalise | `lib/html.ts`, `lib/http.ts` | Strip tracking parameters, resolve canonical URLs, clean excerpts. |
| Classify | `lib/classify.ts` | Headline cleanup, kicker, topic scores, optional tags, `examScore`. |
| Dedupe | `lib/ingest.ts` | Canonical-URL merge, then token Jaccard/overlap clustering; official sources win. |
| Window | `lib/config.ts` | `NEWS_WINDOW_HOURS = 24`; nothing older is written. |
| Cap | `lib/ingest.ts` | Bounds how many stories one publisher can place. |
| Write | `lib/store.ts` | Chunked upsert that never resets `points` or `comment_count`. |
| Prune | `lib/store.ts` / `tb_prune` | Deletes rows older than 24 hours. |

## Sources

All feeds are free and public. No paid news APIs. Official releases are marked with a red dot in the UI.

- **Official:** PIB (via Google News, English), RBI press releases.
- **News & analysis:** The Hindu (national, business, sci-tech), Indian Express (India, Explained, Economy),
  Mint, Mongabay India.
- **Topic queries:** Parliament, courts, economy, diplomacy, climate, schemes, exam alerts.
- **Optional queries:** six Google News lenses for PSIR, Geography, Sociology, Public Administration, History
  and Anthropology.

Coaching, test-prep and job-spam domains are blocked at ingestion. Hindi and Devanagari-only items are dropped.
Google News is only a discovery layer; every card links to the original publisher.

### Adding a source

1. Add an entry to `SOURCES` in `lib/sources.ts` with `name`, `url`, `tier` (and a `topic` for query lenses).
2. Run `npm run seed` and check the per-feed `errors` array in the output.
3. Confirm the source resolves to the original publisher (not an aggregator redirect).
4. Open a pull request with a sample headline and the reason the source is useful for the syllabus.

Feeds that require a key, a paid plan or scraping the article body are out of scope.

## Endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/ingest` | `Authorization: Bearer $CRON_SECRET` (or `?secret=`) | Full fetch → upsert → prune cycle. `GET` also allowed for schedulers that only do GET. |
| `GET /api/pulse` | none (rate-limited) | Opportunistic refresh when the wire is stale; no-op when fresh or read-only. |

The ingest response:

```json
{
  "ok": true,
  "fetched": 412,
  "kept": 96,
  "inserted": 41,
  "updated": 55,
  "pruned": 12,
  "errors": [{ "source": "Mint", "message": "HTTP 503" }],
  "durationMs": 8213
}
```

## Failure behaviour

- **One feed is down** → the rest still update; the error appears in `errors`.
- **No writable store** → `503` with a clear message; the wire stays read-only.
- **Scheduler is late** → `/api/pulse` from any open tab closes the gap within 20 minutes.
- **Duplicate stories** → merged on canonical URL, then clustered on headline tokens (Jaccard/overlap ≥
  `0.66`); the higher-authority source keeps the card.
- **Noise and unparseable items** → dropped before they reach the store: blocked domains, Devanagari-only
  text, items older than 24 hours, and unscored items with no primary topic all return `null` from
  `toFeedItem`.
- **A flood of items** → `capItems` keeps the strongest 450 by score, so one busy news day cannot blow the
  page budget.
