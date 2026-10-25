## What changed

<!-- One paragraph. Link the issue with "Closes #123". -->

## Why

<!-- The problem this solves. For taxonomy or ranking changes, give the exam rationale. -->

## How it was tested

<!-- Commands run, routes checked, screenshots. "npm run check" is the baseline. -->

```bash
npm run check
```

## Risk

- [ ] Database migration (forward-only, tested with `npm run db:reset`)
- [ ] Environment variable or secret change
- [ ] Scheduled job / deployment change
- [ ] User-visible behaviour change
- [ ] No risk worth flagging

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and kept this PR to one concern.
- [ ] `npm run check` passes.
- [ ] I updated the relevant page in `docs/` (and `CHANGELOG.md` for user-visible changes).
- [ ] I did not commit `.env.local`, keys, tokens or personal data.
- [ ] The 24-hour window still holds: nothing is retained past 24 hours.
- [ ] New interactive UI has a keyboard path and an accessible name.
