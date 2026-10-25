# Ranking and taxonomy

## Ranking

```
score = (points + 1) / (ageHours + 2)^1.8 × relevance × authority × freshness
```

| Term | What it means |
| --- | --- |
| `points` | Community upvotes **plus** a small syllabus-relevance baseline (`seedPoints`) so useful stories are visible before anyone votes. |
| `ageHours` | Time since publication. The `1.8` gravity term makes a story lose half its score roughly every 45 minutes after the first few hours. |
| `relevance` | `0.78 + examScore / 100 × 0.6`, from the taxonomy match. |
| `authority` | Official domains `1.26`, known quality publishers `1.05`, analysis `1.0`, aggregators `0.86`–`0.94`. |
| `freshness` | A `1.18` boost for the first three hours. |

Community votes are stored separately (`points`) from the relevance baseline (`seed_points`). A news refresh
never resets a vote. The front page also caps how many stories one publisher can hold, so a single newspaper
cannot own the top slots.

Implementation: `lib/rank.ts` (`rankScore`, `sortItems`, `filterItems`). `GRAVITY = 1.8`,
`TOP_WINDOW_DAYS = 1`.

### Sort keys

| `?sort=` | Ordering |
| --- | --- |
| `top` (default) | Gravity score, then publication time. |
| `new` | Publication time, then `examScore`. |
| `best` | `examScore`, then gravity. |
| `discussed` | `commentCount`, then gravity. |

## Syllabus mapping

The taxonomy lives in [`lib/taxonomy.ts`](../lib/taxonomy.ts). Each topic carries:

- a paper (`prelims`, `gs1`–`gs4`, `essay`),
- a relevance weight and rationale,
- three answer hooks,
- four cue phrases,
- a keyword list used for scoring.

The classifier scores title hits three times more than body hits, applies diminishing returns to the strongest
eight cues, and derives a 0–100 relevance score. The primary topic decides the paper; up to two secondary
topics are retained.

### The twelve themes

`polity`, `governance`, `economy`, `ir`, `environment`, `science`, `security`, `society`, `history`, `ethics`,
`reports`, `exam`.

### Papers

`prelims`, `gs1`, `gs2`, `gs3`, `gs4`, `essay`.

### Optional subjects

The six popular optionals are a **second lens**, not a separate feed silo:

| Optional | Typical tags |
| --- | --- |
| **PSIR** | foreign policy, diplomacy, sovereignty, federalism, UNSC, BRICS, G20, Quad, elections |
| **Geography** | monsoon, glacier, river basin, land use, cyclone, earthquake, groundwater, GIS |
| **Sociology** | caste, kinship, gender, religion, social change, urbanisation, inequality, social movements |
| **Public Administration** | bureaucracy, RTI, accountability, e-governance, decentralisation, service delivery, state capacity |
| **History** | ancient/medieval/modern India, freedom struggle, archaeology, heritage, art and culture |
| **Anthropology** | tribe, PVTG, ethnography, kinship, ritual, material culture, human evolution, indigenous knowledge |

A story can carry up to three optional tags. The primary optional drives the "optional fit" card on the story
page. Optional tags do **not** change the main ranking; they power `/?optional=psir`, the
[optionals desk](../app/optional/page.tsx), and the optional section of the syllabus map.

## Changing the taxonomy

1. Edit `lib/taxonomy.ts` (topics, papers, optionals, noise rules).
2. Run `npm run seed -- --file-only` and inspect how the demo wire reclassifies.
3. Keep `examScore` monotonic: a stronger cue set should not lower the score for an obvious story.
4. Update this page if the shape changes (new paper, new optional), and say why in the pull request.

Taxonomy edits are content decisions, not just code: explain the exam rationale, not only the regex.
