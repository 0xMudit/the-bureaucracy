# The engagement loop

This is the working note behind the first-session hook and the daily return loop. It is
written for the person maintaining the product, not for a growth dashboard. Every mechanic
here has to survive one test: **does it help an aspirant finish today's reading and come back
tomorrow, or does it only inflate a session?** If it only inflates a session, it is not here.

## The audit, before the change

| Surface | What it did | Why it leaked attention |
| --- | --- | --- |
| First screen | 40 ranked headlines, four sort tabs, topic and optional chips, four sidebar cards | Value was legible only after reading several headlines. No single next action, no end state. |
| Personalisation | None until a reader manually filtered by topic or optional | A first-time visitor got the same page as a PSIR veteran. Nothing said "this is for my papers". |
| Session shape | An infinite-feeling list with a 24-hour turnover | No beginning, no finish line. Nothing to complete, so nothing pulled the reader back. |
| Progress | Votes and saves only | Reading — the actual behaviour — left no trace. No streak, no "continue", no reason to return tomorrow. |
| Re-entry | RSS, a GitHub link and memory | After the tab closed there was no owned channel. The 07:00 habit had to be remembered by the reader. |
| Header CTA | "Log in" → `/submit` | The first ask was an account, before any value had been delivered. |
| Item page | Strong "why it matters" and answer hooks, buried | The differentiated value existed but was never surfaced in the feed. |
| Measurement | Page views only | No activation or completion signal, so the loop could not be tuned. |

## The loop

```
open → Today's five (finite, ranked, 8 minutes)
     → read → "why it matters" → tick it off
     → progress 3/5 → finish → streak +1
     → "next edition 07:00 IST" + calendar reminder + install
     → tomorrow: the streak is the reason to open
```

Four principles hold it together:

1. **Finite over infinite.** Five stories is a session, not a slot machine. The brief has a
   finish line and the finish line is celebrated.
2. **Progress is visible and earned.** Reads are credited by time-on-page or scroll depth,
   with an explicit "Mark read" control for readers who do not want passive tracking. A day
   counts only when a story is actually read.
3. **Personalisation is a tilt, not a filter.** The desk (exam, stage, optional) re-weights
   the ranking; it never hides the wire. The public ranking stays neutral for anyone who has
   not set a desk.
4. **The return path is owned and quiet.** A 07:00 IST edition, a calendar reminder the reader
   downloads deliberately, and a home-screen manifest. No push prompt on first load, no
   email capture before value.

## What shipped

- **Desk setup** (`components/desk-bar.tsx`, `app/desk-actions.ts`, `lib/desk.ts`). Three
  answers stored in a first-party cookie, no account. Progressive: skippable for 30 days,
  then a single line to reopen it.
- **Today's five** (`components/daily-brief.tsx`, `lib/brief.ts`). Five stories, diversified
  by paper, topic and source, with a primary document leading when one is close to the top.
  The brief is frozen in local storage on first sight each day so a noon ingestion cannot
  take the finish line away.
- **Desk tilt** (`lib/rank.ts`). `deskTilt()` multiplies the HN-style score. Mains rewards
  copy depth, Prelims rewards exam score and exam alerts, an optional subject rewards fit.
  It is a multiplier on the existing ranking, not a separate algorithm.
- **Read tracking** (`lib/progress.ts`, `components/reading-loop.tsx`). IST-day keyed, stored
  on the device. Twelve seconds or half the page credits a read. Feed rows show a quiet
  "read" marker.
- **Streak** (`components/streak-card.tsx`). Seven-day strip, today's reads, brief progress.
  A missed day resets on the next read; no guilt copy, no lost-pet messaging.
- **Serial reading** (`components/brief-next.tsx`). Every story ends with the next unread
  story or a finish line, instead of an endless related list.
- **Completion payoff.** "Brief filed", streak, a live countdown to 07:00 IST, a downloadable
  calendar reminder, a copy-as-notes export, and share.
- **Share** (`components/share-button.tsx`). Native share sheet, copy-link fallback.
- **Install** (`app/manifest.ts`). Home-screen entry without an email address.
- **Funnel events** (`lib/telemetry.ts`). `desk_set`, `brief_open`, `story_read`,
  `brief_complete`, `share`, `reminder`, recorded through the existing first-party
  `/api/track` endpoint as `/_event/<name>` paths. No third party, no schema change.

## Round two: trust before reward

The first loop worked, but the page could still be read as unedited. Four fixes, all in
the read path, none of them a new mechanic:

- **De-duplication at read time** (`lib/dedupe.ts`). Ingest collapsed duplicates inside one
  batch only; two runs fifteen minutes apart could each keep the same event. The front page,
  the brief and the mobile feed now cluster again, keep the strongest copy (source tier,
  then score, then recency) and drop the rest. Ingest imports the same helpers, so the two
  paths cannot drift.
- **A relevance floor** (`FEED_MIN_SCORE = 35` in `lib/config.ts`). Browsing the wire is
  curated; searching is complete. A story under the floor is still reachable by search or a
  direct link, and a saved story never disappears. The brief relaxes to 25 only when a quiet
  day would otherwise have no five.
- **A payoff line on every card** (`payoffFor` in `lib/taxonomy-extras.ts`). One concrete
  line per topic — the paper and the exam move — under the summary, and reused by the brief
  and the mobile payload so no surface contradicts another. No statistics, no claimed PYQ.
- **A real login door** (`app/login/page.tsx`). The header's "Log in" pointed at `/submit`,
  a form for putting links on the wire. Login now has its own page, `next` is respected,
  and a signed-out visit to `/submit` is sent there instead of rendering a second form.

The next phases — PYQ linkage, guess-before-reveal, the coverage map and spaced revision —
are specified in [`prompts/retention-engine.md`](prompts/retention-engine.md).

## Round three: retrieval and memory

Round two made the wire trustworthy. Round three makes it worth returning to, by turning
reading into retrieval and giving the reader something that compounds.

- **PYQ linkage** (`data/pyq.json`, `lib/pyq.ts`). A small, hand-curated bank of previous-year
  Prelims questions. Matching is conservative: the topic must agree *and* two distinctive
  keywords must appear, or one long phrase. A story that matches shows a `PYQ 2019` badge on
  the feed and on its page; a story that does not match shows nothing. The bank is paraphrased
  and carries the year and paper so a reader can check it against the official paper.
- **Guess before you see** (`components/prelims-reveal.tsx`, `lib/quiz.ts`). Every story page
  now asks one question. With a PYQ match it is the real question; without one it asks which
  exam move the story enables, with the other themes as decoys. The answer is revealed only
  after a choice, stored on the device, and reported as `reveal` with `correct: 0|1`.
- **End-of-brief retrieval** (`components/brief-quiz.tsx`). Finishing the five now offers three
  questions drawn from the brief itself. The score is kept for the day (`recordQuiz`), so the
  finish line has a second half.
- **Coverage map** (`lib/coverage.ts`, `components/coverage-map.tsx`). Reads are tagged with
  their theme at read time, so the sidebar can name the widest gap: "Ethics · untouched",
  "Economy · 6d gap". This is the first feature that gets *more* valuable the longer someone
  stays, and it never leaves the device.
- **Spaced revision** (`lib/revision.ts`, `components/revision-card.tsx`). A save returns on day
  1, 3, 7 and 30. The card only appears when something is due, and a missed day never resets
  the schedule. Older saves open at the publisher, not a rebuilt archive: the 24-hour rule
  still applies to the wire.
- **Telegram digest** (`app/api/digest/route.ts`). One broadcast a day at 07:00 IST: five
  titles, five payoff lines, one question and a link back. It runs in dry mode by default and
  needs `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` to send. Per-reader opt-in waits for a
  subscription field and a `/stop` handler; shipping the broadcast first keeps consent honest.

The line we will not cross: no invented PYQ, no invented reader counts, and no archive. A
reader's saves and coverage are theirs, on their device, and the public wire still deletes
everything after 24 hours.

## What was deliberately not built

- **Infinite scroll.** It would trade the daily habit for a longer single session.
- **Push notification prompt on first load.** It burns the one permission ask before trust.
- **Fake urgency or social proof.** No invented reader counts, no countdown to a deadline
  that does not exist.
- **A public leaderboard.** Streaks are private by default; comparison would punish the
  reader who starts late.

## Instrumentation to read next

In `tb_visits`, filter `path` like `/_event/%`:

- `desk_set / first_view` — activation rate of personalisation.
- `brief_complete / first_view` — the share of sessions that reach the finish line.
- `story_read` per session — depth before the first return visit.
- `reminder` — how many readers ask to be brought back.

The honest north star is **briefs completed per returning reader per week**, not page views.
