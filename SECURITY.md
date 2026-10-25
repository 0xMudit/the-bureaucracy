# Security policy

## Supported versions

The project ships from `main`; there are no long-lived release branches. Security fixes land on `main` and are
deployed from there.

| Version | Supported |
| --- | --- |
| `main` / latest deployment | ✅ |
| Older commits and forks | ❌ |

## Reporting a vulnerability

**Do not open a public issue, pull request or discussion for a security problem.**

Use GitHub's private vulnerability reporting:
<https://github.com/0xMudit/the-bureaucracy/security/advisories/new>

If that is unavailable, email **0xmudit@gmail.com** with the subject `SECURITY: the-bureaucracy`.

Please include:

- what the issue is and where (route, file, or request),
- steps to reproduce, or a proof of concept,
- the impact you believe it has,
- any suggested fix.

### What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement | within 3 working days |
| Initial assessment | within 7 days |
| Fix or mitigation plan | within 30 days for confirmed issues |

You will be credited in the advisory unless you ask otherwise. Please give us a reasonable window to fix the
issue before disclosing it publicly.

## Scope

In scope:

- Authentication and session handling (`proxy.ts`, `lib/auth.ts`, `app/auth/**`).
- Authorisation and role checks (`lib/rbac.ts`, `app/admin/**`, server actions).
- SQL and RPC functions in `supabase/migrations/`.
- The ingestion endpoint and its shared secret (`app/api/ingest`).
- Injection, XSS, SSRF, CSRF and rate-limit bypasses.
- Secret exposure in the client bundle or repository history.

Out of scope:

- Findings that require a compromised device, browser extension or email account.
- Volumetric denial of service, spam and social engineering.
- Missing hardening headers with no demonstrated impact.
- Vulnerabilities in third-party feeds or in the publishers we link to.
- Reports generated solely by an automated scanner without a reproduction.

## Security model (summary)

- The browser receives only the Supabase **anon** key. The service-role key, `CRON_SECRET` and
  `SUPABASE_ACCESS_TOKEN` are server-only.
- RLS is enabled on every table with **no public policies**; all data access goes through the server using the
  service role.
- Roles are read from `tb_profiles` on each request, never trusted from the JWT. Suspension takes effect
  immediately and revokes refresh tokens.
- Admin actions are written to an append-only audit table.
- `/api/ingest` requires a bearer secret in production; `/api/pulse` and `/api/track` are rate-limited.
- Tracking is first-party and stores no IP addresses.

## Handling secrets

If a key is exposed:

1. Rotate it in the Supabase dashboard (or regenerate `CRON_SECRET`).
2. Update the Vercel environment variables and the GitHub repository secret.
3. Redeploy, and confirm `npm run auth:doctor` passes.
4. If it reached git history, treat the key as compromised even after a force-push; rotation is the fix.
