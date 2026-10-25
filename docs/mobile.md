# The mobile app

The iOS and Android client lives in [`mobile/`](../mobile/README.md) in this repository: an Expo
SDK 54 app, expo-router, React Query. It is a client of **this** deployment, not a fork of it.

```
mobile/src/api  ──►  /api/mobile/*  ──►  cachedItems(), buildFeed(), TOPICS, vote()
                      (this repo)         the same store and ranking the pages use
```

## Why there is an API layer at all

Supabase has row-level security enabled with **no policies**, and the service role stays on the
server. A phone therefore cannot read Postgres directly, and should not: the ranking formula, the
24-hour window and the classifier are server-side logic that must not be duplicated in a client that
ships as a bundle.

`lib/mobile.ts` is the shared plumbing for the four handlers — CORS, JSON envelopes, device ids,
taxonomy payload and comment slimming. Pages and mobile read the same functions, so a ranking change
lands on both at once.

## Endpoints

All responses are JSON, carry `version: 1` and are written by `mobileJson()`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/mobile/feed` | `sort=top\|new\|best\|discussed`, `topic`, `optional`, `paper`, `q`, `limit` (default 40, max 60). Each item arrives with `topic`, `optional`, `expiresAt` and `position` resolved server-side. |
| `GET` | `/api/mobile/item/[id]` | The story, `related`, `comments` (slim tree), `discussion`, `webUrl`, `expiresAt`. `404` unknown, `410` outside the 24-hour window. |
| `GET` | `/api/mobile/taxonomy` | `papers`, `topics` (with `why`, `hooks`, `cues`), `optionals` (with `topicIds`), `sorts`, `windowHours`. `force-static`, CDN-cached for a day. |
| `POST` | `/api/mobile/vote` | `{ "itemId": "…" }`; toggles. Needs `x-device-id`. Rate limit 30/min per device. `503` when the store is read-only. |
| `OPTIONS` | all four | CORS preflight (`preflight`). |

```bash
curl -s "https://the-bureaucracy.vercel.app/api/mobile/feed?sort=top&limit=3" | jq '.items[0].title'
curl -s "https://the-bureaucracy.vercel.app/api/mobile/taxonomy"           | jq '.topics | length'
curl -s -X POST "http://localhost:3000/api/mobile/vote" \
  -H "content-type: application/json" -H "x-device-id: dev_localcheck001" \
  -d '{"itemId":"<id>"}'                                                   # twice = net zero
```

## Device identity, not accounts

Voting is open to every reader on the web (`tb_voter` cookie) and must stay open on the phone. The
app generates `dev_<base36><random>` once, keeps it in secure storage and sends it as `x-device-id`.
`voterIdFor()` prefixes it with `m_` before it reaches the `votes` table, so the two surfaces can
never overwrite each other's tally.

Commenting still requires an account, so the app reads discussions and links out to the story's web
page to post.

## Keeping the two in sync

The contract has three copies, and they must change together:

1. `lib/mobile.ts` + `app/api/mobile/*/route.ts` — what the server actually sends.
2. `mobile/src/api/types.ts` — the TypeScript mirror.
3. This page and [`docs/api.md`](api.md) — what humans read.

CI typechecks both sides (`npm run typecheck` at the root and in `mobile/`) and bundles the app, so a
field renamed on one side fails the build rather than a phone at runtime.

## Local development

```bash
npm run dev                      # this app, port 3000
cd mobile && npm start           # the app, in another terminal
```

Android emulators reach the host at `10.0.2.2`; `mobile/src/api/client.ts` rewrites `localhost`
automatically, so one `.env.local` works on both platforms. A real phone needs your LAN IP in
`EXPO_PUBLIC_API_URL`.
