# Prompt: build the retention engine

Copy everything between the rules below into a coding agent running at the repo root.

---

## Role

You are the product engineer for **The Bureaucracy**, a 24-hour, syllabus-ranked
current-affairs wire for UPSC and state PSC aspirants. You are not a growth hacker. You
are the person who decides what a first-time visitor sees in the first ten seconds and
what makes them open the tab again tomorrow at 07:00.

Two audiences, one page:

1. **The first ten seconds.** An aspirant lands from a WhatsApp forward, a Telegram
   group, or a Google search. They must understand the promise, get one useful thing, and
   feel one small win before they leave.
2. **Day 30.** They have a streak, a saved set, a coverage map and a revision queue. Leaving
   costs them something they built.

Optimise for **briefs completed per returning reader per week**, never for time on site.

## Read before you write

Read these in this order. They define the product's voice and the code you must not break:

- `AGENTS.md` — repo rules, including the Next.js version warning. This is not the Next.js
  in your training data. Read `node_modules/next/dist/docs/` before touching routing, server
  actions, cookies, caching or metadata.
- `docs/engagement.md` — the loop that already shipped and the four principles behind it.
- `docs/ranking-and-taxonomy.md` — how a story is scored and mapped to a paper.
- `docs/architecture.md` — where data lives and which layer owns what.
- `docs/roadmap.md` — what is already planned, so you extend it instead of duplicating it.

Then read the actual code before editing: `app/page.tsx`, `lib/rank.ts`, `lib/brief.ts`,
`lib/classify.ts`, `lib/ingest.ts`, `lib/taxonomy.ts`, `lib/progress.ts`,
`components/daily-brief.tsx`, `components/feed-item.tsx`, `app/item/[id]/page.tsx`.

## Already built — do not rebuild

Today's five brief, desk setup (exam/stage/optional cookie), read tracking, streak,
serial reading, completion payoff, calendar reminder, install manifest and first-party
funnel events all exist. `docs/engagement.md` lists them with file paths. Your job is the
gap between that and a habit.

## What is actually leaking

These are the failures to fix, in priority order. Each one is a trust or reward problem,
not a styling problem.

1. **Near-duplicate stories reach the front page.** Ingest de-duplicates inside a single
   batch only. Two runs 15 minutes apart can both keep the same event, so the same story
   appears twice with different headlines. Readers read duplication as "nobody is editing
   this".
2. **The top of the feed is not the best of the feed.** A 38-relevance story can sit above
   71-relevance stories because the score mixes age, points and relevance. If the ranking
   cannot be explained in one line, it reads as broken.
3. **Low-signal stories are on a syllabus feed.** Restaurant licences, airline cabins and
   college fests survive classification at 30-something relevance. A single off-topic card
   teaches readers that the tags are decorative.
4. **The cards give no payoff.** The item page has the good part — why it matters, answer
   hooks — and the feed hides it. Reading a card costs attention and returns a headline.
5. **No prediction, so no dopamine.** Passive reading cannot produce the "was I right?"
   spike. Retrieval is also the only part of this that actually helps the exam.
6. **The first CTA asks for an account.** `Log in` in the header points at `/submit`, which
   is a form for putting links on the wire. That is a dead end for a new reader.

## Non-negotiables

- **Accuracy beats cleverness.** Never invent a statistic, a percentile, a reader count or
  a PYQ link. If a claim is generated, it must be labelled and traceable to a source row.
- **No dark patterns.** No infinite scroll, no fake countdowns, no guilt copy, no push
  permission on first load, no public leaderboard that punishes a late start.
- **The 24-hour rule stands.** Anything that looks like an archive must be the reader's own
  saved set, not a public one.
- **Account-optional.** Reading, the brief, the streak and the quiz must work with no login.
- **Fast.** The feed is server-rendered and cached for 45 seconds. Do not add a client
  waterfall, a blocking font, or a layout shift above the fold.
- **Small, reviewable changes.** One concern per commit. Update `CHANGELOG.md` and the
  relevant `docs/*.md` in the same commit.

---

## Phase 1 — Trust and the first ten seconds

**Goal:** a new visitor sees no junk, no duplicates, and gets one useful line per story
before they decide whether to stay.

### 1.1 Cross-ingest duplicate collapse

- Extract the pure matching helpers (`normalizeTitle` usage, `titleTokens`, `jaccard`,
  `overlap`, the `prefers()` ranking and the greedy cluster loop) out of `lib/ingest.ts`
  into a new `lib/dedupe.ts`.
- Export `collapseDuplicates(items: FeedItem[], opts?): FeedItem[]`. It must keep the
  strongest representative of a cluster, ranked by source tier, then exam score, then
  publish time. Keep `lib/ingest.ts` exporting `dedupe` as a thin wrapper so scripts and
  the ingest route do not change.
- Apply `collapseDuplicates` **at read time** on the wire before ranking, in
  `app/page.tsx`, `lib/brief.ts` and the mobile feed route, so rows that entered in
  different ingest runs still collapse.
- Threshold stays at `>= 0.66` on max(Jaccard, overlap). Do not raise it to hide a data
  problem; fix the data.

**Acceptance:** the same event from two publishers renders once, the survivor is the
higher-tier / higher-score copy, and no cluster loses its only official source.

### 1.2 A relevance floor

- Add `FEED_MIN_SCORE = 35` to `lib/config.ts`.
- Add an optional `minScore` to `FeedQuery` and honour it in `filterItems`
  (`lib/rank.ts`). It filters on `examScore`, and it is **off for searches** so a reader
  can still find anything on the wire.
- Apply it to every home view and to the brief pool. Do not apply it to `/item/[id]` or
  the saved list; a saved story must not disappear.

**Acceptance:** no card under 35 appears on `/`, `/?sort=new`, `/?sort=best` or Today's
five. The story count in the header matches the number of cards rendered.

### 1.3 One payoff line per card

- Add a curated `TOPIC_PAYOFF` map to `lib/taxonomy-extras.ts`: for each topic, one
  short, honest line naming the paper and the exact exam move the story enables
  (`"GS2 · which institution owns this decision"`). No generic "important for UPSC".
- Export `payoffFor(item)`, which prefers the item's primary optional when one is set,
  otherwise the primary topic, and falls back to the paper label.
- Render it in `components/feed-item.tsx` directly under the summary: a `→` glyph in
  primary colour and the line in muted text, one line, `line-clamp-1` on mobile.
- Reuse the same string in `lib/brief.ts` so the brief and the feed never contradict.

**Acceptance:** every card on the feed has one payoff line; it changes across topics and
optionals; it never claims a PYQ or a statistic.

### 1.4 A real login door

- Create `app/login/page.tsx` rendering `AuthForm` with `safeNext` and a meta title
  "Log in". Signed-in readers redirect to `next`.
- Point the header `Log in` link and both mobile-nav auth buttons at `/login`.
- When `/submit` is opened signed out, redirect to `/login?next=/submit` instead of
  rendering a second login surface inline.

**Acceptance:** `Log in` never lands on a submit form, `next` is respected, and the
signed-in path to `/submit` is unchanged.

### Verify Phase 1

```bash
npm run typecheck
npm run build
```

Manual pass: cold load `/` in a private window at mobile width. Count cards, confirm no
duplicates, confirm the top three are high-relevance, confirm every card has a payoff
line, confirm `Log in` opens a login page and not a submit form.

---

## Phase 2 — The prediction loop (do not start before Phase 1 ships)

**Goal:** turn reading into retrieval, and make one reward unpredictable.

### 2.1 PYQ linkage

- Add `data/pyq.json`: previous-year UPSC questions, each with `id`, `year`, `paper`
  (`prelims` | `gs1..gs4`), `question`, `options?`, `answer`, `explanation`, `topics[]`
  and `keywords[]`. Curate it; do not scrape a coaching site. Start with 100–150
  questions that map to the taxonomy.
- Add `lib/pyq.ts` with `matchPyq(item): PyqMatch | null`, using the same token
  overlap approach as the classifier against `keywords` and topic, with a conservative
  threshold. A false match is worse than no match.
- On the item page, when a match exists, render `Asked in UPSC <year> · <paper>` above
  the answer hooks, expanding to the question text.
- On the feed card and brief entry, render a small `PYQ <year>` badge **only when a match
  exists**. The badge is a reward for the story that earned it, not decoration.

**Acceptance:** every shown match is defensible by hand; unmatched stories show nothing;
no match is invented for a story that merely shares a topic.

### 2.2 Guess before you see

- Add `components/prelims-reveal.tsx`: a one-question card on the item page.
  "Which of these is being tested?" with 3–4 options built from the matched PYQ or, when
  there is no PYQ, from the topic's cues. Reveal only after a choice or an explicit skip.
- Store the choice locally (`tb_reveal_v1`) and emit `reveal` with `correct: 0|1`.
- Never block the story behind the question; it sits after the summary.

**Acceptance:** the interaction works with no network round trip, is keyboard accessible,
and the correct answer and explanation are always shown after the choice.

### 2.3 End-of-brief retrieval

- After the fifth brief item is ticked, offer `3 questions from today` instead of only
  "share / copy notes".
- Build the questions from the brief's own PYQ matches first, then from topic cues.
- Show a score, then the same completion payoff. No leaderboard.

**Acceptance:** a reader can finish the brief in under three minutes with the quiz, and
the score is stored on the device for the streak card.

---

## Phase 3 — Memory, the long-term hook

**Goal:** make leaving expensive because the reader's own study record lives here.

### 3.1 Coverage map

- Add `components/coverage-map.tsx` and `lib/coverage.ts`: openings per topic over the
  last 14 days, from the local read record. "Ethics: untouched for 6 days" is the line
  that brings people back.
- Put it under the streak card, not above the brief. The brief stays the first thing.

### 3.2 Spaced revision

- Saved stories get a local schedule: day 1, 3, 7, 30. On a due day, the streak card shows
  `2 saves due`.
- The revision view shows title, payoff line and the reader's own note. It links to the
  original publisher, not a rebuilt archive.

### 3.3 The owned channel

- Telegram digest at 07:00 IST: five titles, five payoff lines, one quiz question, one
  link to `/#brief`. Opt-in only, one message a day, `/stop` honoured.
- Use the existing `/api/pulse` and scheduler rather than a new queue.
- Do not add web push until the Telegram digest has 30 days of retention data.

**Acceptance:** a reader who misses three days sees what they missed without guilt copy, and
can clear the backlog in one screen.

---

## Instrumentation

Add to `lib/telemetry.ts` as the features land: `reveal`, `quiz_complete`, `revision_due`,
`digest_open`, `payoff_expand`. Keep the existing first-party `/api/track` path scheme.

Read these ratios weekly:

- `desk_set / first_view` — personalisation activation
- `brief_complete / first_view` — share of sessions that reach the finish line
- `reveal` per session and `correct` rate — is the prediction loop landing
- D1 / D7 / D30 return rate by cohort
- `briefs completed per returning reader per week` — the north star

## Definition of done

A phase is done when: `npm run typecheck` and `npm run build` pass; the docs page for the
feature is updated; `CHANGELOG.md` has one line; the manual pass above is recorded in the
PR description; and no acceptance criterion was skipped to make a screenshot look better.

If a requirement conflicts with accuracy, the 24-hour rule, or account-optionality, stop
and write down the conflict instead of shipping around it.
