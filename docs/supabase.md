# Supabase

The app uses Supabase for Postgres and Auth. Every table is server-only: RLS is enabled with no public
policies, and the browser never receives a database key.

## 1. Create and link a project

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

`npx supabase` needs no global install; `npx supabase@latest --version` confirms it works.

## 2. Apply the schema

`supabase/migrations/` is the **source of truth**. Apply it in filename order:

```bash
npm run db:push        # npx supabase db push
```

For local development with Docker:

```bash
npm run db:start       # optional: local Supabase stack
npm run db:reset       # replay migrations on a clean local database
```

The SQL-editor path still works: paste [`supabase/schema.sql`](../supabase/schema.sql) (a single-file snapshot
of the migrations) and then any migration newer than the snapshot, in order. If the two disagree, the
migrations win.

What the migrations create:

| Migration | Contents |
| --- | --- |
| `20261024000000_init` | `items`, `votes`, `comments`, RLS, `tb_vote`, `tb_add_comment`, `tb_prune`. |
| `20261024000001_fix_tb_vote` | Aliases the `points` update so the OUT parameter cannot shadow the column. |
| `20261024000002_accounts` | `tb_profiles`, `tb_visits`, `tb_login_events`, new-user trigger, `comments.author_id`. |
| `20261024000003_roles_admin` | `reader`/`editor`/`admin` roles, suspension status, `verified_at`, `tb_admin_events`. |
| `20261024000004_auth_hardening` | Profile backfill, email sync trigger, `updated_at`. |

## 3. Point auth at the deployment

```bash
npx supabase config push --project-ref <project-ref>
```

[`supabase/config.toml`](../supabase/config.toml) sets the production `site_url`, the redirect allow-list
(production, preview hostnames, `localhost:3000`) and `enable_confirmations = true`.

Supabase's free tier refuses email-template edits without custom SMTP, so a fresh project starts on the stock
confirmation mail. The app accepts both the stock PKCE link and the branded `token_hash` link.

## 4. Install the branded mail (once SMTP exists)

```bash
# SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SENDER_EMAIL in .env.local,
# plus SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
npm run auth:email -- --dry-run   # inspect what will change
npm run auth:email
```

This uploads [`confirmation.html`](../supabase/templates/confirmation.html) and
[`recovery.html`](../supabase/templates/recovery.html), sets both subjects, keeps `mailer_autoconfirm=false`
and extends the redirect allow-list. Resend, Postmark and SES all work.

## 5. Promote admins

```bash
npm run auth:admins
```

`ADMIN_EMAILS` and the deployment editor address already resolve to `admin` at request time. This command
makes the database row match so `/admin/users` and `/admin/audit` agree. An address in `ADMIN_EMAILS` is
authoritative: the register marks it `env` and refuses to demote or suspend it. Remove it from the variable
first.

## 6. Verify before deploying

```bash
npm run auth:doctor
```

Read-only. Checks the three keys, the profile/audit/login tables, that every `auth.users` row has a profile,
and that every `ADMIN_EMAILS` address is an admin row. Exits non-zero on a real problem, so it is safe to run
in CI.

## Accounts, roles and sessions

| Role | Can do |
| --- | --- |
| `reader` | Sign in, comment, vote, submit links, manage their own account. |
| `editor` | Everything above, plus the desk (`/admin`), the account register and moderation. |
| `admin` | Everything above, plus role changes, suspension and the audit log. |

- **Sign-up verifies the email first.** No session exists until `/auth/confirm` exchanges the link.
  `signInAction` refuses unconfirmed addresses even if a project has confirmations switched off.
- **Password reset is single-use.** `/auth/forgot-password` → `/auth/recovery` (or `/auth/confirm` for the
  branded template) → new password, with every other session revoked.
- **Email changes need proof twice.** `/account` asks for the current password, then Supabase confirms with
  the new address (and the old one when secure email change is on). The
  `tb_on_auth_user_email_changed` trigger keeps `tb_profiles.email` in step.
- **Deletion is self-service.** The reader types `DELETE` and their password; the service role removes the
  auth user, the profile cascades and sessions are revoked. The deployment editor and the last active admin
  are protected.
- **Sessions are refreshed in `proxy.ts`**, which skips the network call entirely for anonymous visitors.

## Scheduled pruning

[`supabase/cron.example.sql`](../supabase/cron.example.sql) installs a `pg_cron` + `pg_net` job that calls
`POST /api/ingest` every 15 minutes and can call `tb_prune()` as a safety net. This is the primary scheduler:
it does not depend on GitHub or on anyone visiting the site. See [deployment.md](deployment.md) for the full
schedule.

## Operating notes

- **Never** put the service-role key in a `NEXT_PUBLIC_*` variable or in client code.
- Rotate a leaked key in the Supabase dashboard, then update Vercel and GitHub secrets.
- `supabase/.temp/` and `.supabase-db-password` are gitignored on purpose. Do not commit them.
