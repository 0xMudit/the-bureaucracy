# The Bureaucracy — iOS and Android

The ranked 24-hour civil-services wire, in your pocket. An Expo (SDK 54) client for
[the web app](../README.md), sharing its backend, its ranking and its taxonomy.

This is not a second product. The phone talks to the same deployment:

```
Expo app  ──►  /api/mobile/*  ──►  store + ranking + taxonomy  ◄──  Next.js pages
               (one Next.js app, one database, one ingest pipeline)
```

Every story, vote tally and syllabus label the app renders was produced by the server. The app holds
no copy of the classifier and no database credentials — the `service_role` key never leaves Vercel.

## Quick start

```bash
cd mobile
npm install
cp .env.example .env.local     # optional; defaults to http://localhost:3000
npm start                      # press i / a, or scan the QR with Expo Go
```

The web app has to be running for there to be a wire:

```bash
cd ..            # repo root
npm run dev      # http://localhost:3000
```

| Platform | Base URL the app uses |
| --- | --- |
| iOS simulator, Expo web | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` (rewritten automatically) |
| Real phone on your LAN | `http://<your-lan-ip>:3000` — set `EXPO_PUBLIC_API_URL` |
| Production | `https://the-bureaucracy.vercel.app` |

`EXPO_PUBLIC_*` values are inlined into the JavaScript bundle. Never put a secret there.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Metro bundler + dev client. |
| `npm run android` / `npm run ios` | Open on an emulator or simulator. |
| `npm run typecheck` | `tsc --noEmit`. What CI runs. |
| `npm run doctor` | `expo-doctor` — checks the dependency set against SDK 54. |
| `npx expo export --platform android` | Production bundle smoke test (same as CI). |

## Structure

```
src/
  app/                    expo-router file routes
    _layout.tsx           fonts, splash, theme, React Query, the stack
    (tabs)/_layout.tsx    Wire · Saved · Syllabus
    (tabs)/index.tsx      the ranked 24-hour wire
    (tabs)/saved.tsx      device-local reading list
    (tabs)/syllabus.tsx   papers, themes, optional lenses, appearance
    item/[id].tsx         story, why it matters, discussion, related
    search.tsx            modal search over the wire
  api/
    client.ts             fetch wrapper, timeouts, device header, ApiError
    hooks.ts              React Query hooks and the optimistic vote
    types.ts              the /api/mobile/* contract
  components/             FeedRow, Masthead, SortTabs, FilterChips, VoteButton,
                          SaveButton, CommentThread, ui primitives
  lib/                    device id, filter store, reading list, time formatting
  theme/                  palette, type scale, spacing, light/dark provider
```

## The backend contract

All payloads carry `version` (currently `1`) and are served with permissive CORS so the app can
call them cross-origin.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/mobile/feed` | Ranked wire. `sort`, `topic`, `optional`, `paper`, `q`, `limit` (1–60). |
| `GET` | `/api/mobile/item/[id]` | One story with topic rationale, answer hooks, comments, related. `410` once it ages out. |
| `GET` | `/api/mobile/taxonomy` | Papers, twelve themes, six optional lenses. Cached for an hour. |
| `POST` | `/api/mobile/vote` | `{ "itemId": "…" }` toggles this device's vote. Rate limit 30/min. |

Two headers matter:

- `x-device-id` — 8–64 chars of `[A-Za-z0-9_-]`. The app generates one at install and keeps it in
  secure storage; the server namespaces it as `m_<id>` so a phone vote can never collide with a web
  `tb_voter` cookie.
- `content-type: application/json` — on the vote `POST` only.

Errors are `{ version, ok: false, error, retryAfter? }` with real status codes. `410` is normal
behaviour, not a fault: the wire deletes after 24 hours.

If the contract changes, change `src/api/types.ts` in the same pull request as `lib/mobile.ts`, and
update [docs/api.md](../docs/api.md).

## Design

The palette is the web's OKLCH tokens converted to sRGB (`src/theme/tokens.ts`), because React
Native has no OKLCH. Headlines are Instrument Serif, UI text Inter, everything editorial IBM Plex
Mono. Light is warm stock, dark is ink — the masthead switches between them and the choice persists.

Votes are optimistic and haptic: the tap lands before the network does, then reconciles with the
server's tally. A story leaving the wire is handled as a normal ending, never an error dialog.

## Not yet wired

- Posting comments (needs an account and a web session — the app links out to the story page).
- Push notifications, offline cache of the full wire, EAS build profiles.
