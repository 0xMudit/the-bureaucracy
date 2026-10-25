# Roadmap

The 24-hour window, the ranking and the syllabus mapping are the product. Everything below extends them
without turning the site into an archive. Each item is tracked as a GitHub issue with acceptance criteria and
an effort estimate; this page is the summary.

> Looking for something to pick up? Start with
> [`good first issue`](https://github.com/0xMudit/the-bureaucracy/labels/good%20first%20issue) or
> [`help wanted`](https://github.com/0xMudit/the-bureaucracy/labels/help%20wanted).

## Now — sharpen the core

| Issue | Feature | Why it matters |
| --- | --- | --- |
| [#1](https://github.com/0xMudit/the-bureaucracy/issues/1) | **Server-side full-text search** | Search is currently an in-memory substring filter over the whole wire. Postgres `tsvector` + `websearch_to_tsquery` gives ranked results, stemming and phrase queries without loading every row. |
| [#2](https://github.com/0xMudit/the-bureaucracy/issues/2) | **Source health dashboard** | Feeds rot silently. Track per-source fetch latency, error rate and last success; quarantine a feed after repeated failure and surface it at `/admin/sources`. |
| [#3](https://github.com/0xMudit/the-bureaucracy/issues/3) | **Test suite** | `classify`, `rank`, `dedupe` and the auth guards have no automated tests. Vitest for units, Playwright for the sign-up → confirm → comment flow. |
| [#4](https://github.com/0xMudit/the-bureaucracy/issues/4) | **Comment moderation toolkit** | Accounts made comments durable; moderation did not keep up. Report, soft-delete, per-user rate limits and a suspension path, all audited. |

## Next — the study loop

| Issue | Feature | Why it matters |
| --- | --- | --- |
| [#5](https://github.com/0xMudit/the-bureaucracy/issues/5) | **Prelims quiz from the last 24 hours** | Ten MCQs generated from the day's wire, with explanations linked back to the story. Turns reading into retrieval practice. |
| [#6](https://github.com/0xMudit/the-bureaucracy/issues/6) | **Mains answer practice mode** | For any story, a 150/250-word prompt, a structure skeleton and a self-evaluation rubric. The exam rewards writing, not scrolling. |
| [#7](https://github.com/0xMudit/the-bureaucracy/issues/7) | **"My Wire" personalised ranking** | Opt-in weighting from your votes, saves and optional lenses, stored on the profile. The public front page stays neutral. |
| [#8](https://github.com/0xMudit/the-bureaucracy/issues/8) | **Daily digest email** | One opt-in mail at 07:00 IST with the top ten stories and one practice prompt. Must respect the 24-hour rule: no archive links in the mail. |

## Later — reach and durability

| Issue | Feature | Why it matters |
| --- | --- | --- |
| [#9](https://github.com/0xMudit/the-bureaucracy/issues/9) | **Public read-only API v1 + OpenAPI** | Researchers, Discord bots and study tools should not have to scrape HTML. Rate-limited, documented, versioned. |
| [#10](https://github.com/0xMudit/the-bureaucracy/issues/10) | **PWA with offline saved list** | Installable app; saved stories readable on a train with no signal. Cache only what the reader explicitly saved. |
| [#11](https://github.com/0xMudit/the-bureaucracy/issues/11) | **Web push notifications** | Alerts for `high` priority stories in your papers/optionals, capped per day. Opt-in and easy to silence. |
| [#12](https://github.com/0xMudit/the-bureaucracy/issues/12) | **Accessibility audit + Hindi interface** | WCAG 2.2 AA pass (focus order, contrast, screen-reader labels) and a Hindi UI locale. Most aspirants read both languages. |

## Explicitly out of scope

- **A permanent archive.** It would destroy the product. If you need permanence, save the original article.
- **Paywalled or scraped full text.** Excerpts come from RSS and page metadata; publishers keep their rights.
- **Third-party analytics and ad networks.** Tracking is first-party and stores no IP addresses.
- **Auto-publishing AI summaries as fact.** Any generated text must be labelled, cited and reviewable.

## How to propose something

Open a [feature request](https://github.com/0xMudit/the-bureaucracy/issues/new?template=feature_request.yml).
Say which exam problem it solves, what it costs to run, and how it behaves when the wire is empty or a source is
down. Small, well-scoped proposals land faster than platform rewrites.
