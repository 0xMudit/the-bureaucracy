# Mail

Sign-up is confirmation-only: an account cannot sign in until the address is verified, and the only way to
verify it is the email Supabase sends. **A broken sender is a launch blocker, not a cosmetic issue.**

Supabase's built-in sender is rate-limited and shares an IP pool, so it is suitable for a handful of tests and
nothing more. This page sets up a real sending domain and verifies it end to end.

## 1. Pick a provider and a sending domain

Any SMTP provider works. The examples below are the three cheapest for a small site.

| Provider | Host | Port | User | Password |
| --- | --- | --- | --- | --- |
| Resend | `smtp.resend.com` | 587 | `resend` | API key |
| Postmark | `smtp.postmarkapp.com` | 587 | server token | server token |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 | SMTP username | SMTP password |

Use an address on a domain you control — `desk@thebureaucracy.in`, not `thebureaucracy@gmail.com`. A
`*.vercel.app` hostname cannot be verified for mail. Verify the domain in the provider's dashboard; it will
print the DNS records for the next step.

## 2. Create the DNS records

Replace `example.org` with your domain and the values with the ones your provider prints. All four are
TXT records except MX.

| Purpose | Name | Type | Value |
| --- | --- | --- | --- |
| Sending authorisation | `@` | TXT | `v=spf1 include:_spf.resend.com ~all` |
| Domain key | `resend._domainkey` | TXT | `p=MIGfMA0GCSq...` (from the provider) |
| DMARC | `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:desk@example.org` |
| Replies (optional) | `@` | MX | provider's inbound host |

Rules that save an afternoon:

- **One SPF record per name.** Two `v=spf1` TXT records at `@` make SPF fail for everything. Merge includes
  into the existing record.
- **DMARC starts at `p=none`.** Watch the reports for a week, then move to `quarantine` and finally `reject`.
- **Keep DNS lookup count under 10.** Each `include:` can chain; `npm run auth:smtp` warns when you approach
  the limit.
- **DKIM is the one that matters most.** Gmail and Outlook will junk a domain with SPF but no DKIM.

## 3. Configure the app

Add to `.env.local` (and to Vercel for Production):

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_SENDER_EMAIL=desk@example.org
SMTP_SENDER_NAME=The Bureaucracy
SMTP_DKIM_SELECTOR=resend
```

## 4. Verify before touching Supabase

```bash
npm run auth:smtp
```

Checks SPF, DKIM, DMARC, MX, TCP reachability and the live Supabase auth config. It prints the exact record to
create when something is missing, exits non-zero on a blocker, and never prints a password.

DNS changes can take a few minutes. Re-run until every line says `PASS`.

## 5. Push the mail configuration

```bash
npm run auth:email -- --dry-run
npm run auth:email
```

This sets the SMTP credentials on the Supabase project, keeps `mailer_autoconfirm=false`, uploads the branded
confirmation and recovery templates from `supabase/templates/`, and extends the redirect allow-list.

Then confirm the rest of the auth config is in sync:

```bash
npx supabase config push
npm run auth:doctor
```

## 6. Test the real path

1. Sign up with an address you can open.
2. Open the confirmation mail and check "Show original": `spf=pass`, `dkim=pass`, `dmarc=pass`.
3. The button should land on `/auth/confirm` and sign you in.
4. Use **Forgot password** and confirm the reset mail arrives and the link is single-use.
5. Confirm an unconfirmed account is refused at login.

If mail lands in spam, the usual causes are a missing DKIM record, a `p=reject` DMARC policy published before
the domain was warmed, or a link in the template pointing at `localhost` because `NEXT_PUBLIC_SITE_URL` was
not set at build time.

## Rates and abuse

- Supabase applies its own hourly email limit. Raise it in **Authentication → Rate Limits** only after the
  domain verifies; the app already rate-limits sign-up and resend requests per address hash.
- `SMTP_SENDER_EMAIL` is also the reply-to. Use a mailbox someone reads, or state that it is unattended.
- Never put SMTP credentials in a `NEXT_PUBLIC_*` variable. They are server-side only, and `npm run auth:email`
  reads them from the local environment rather than from the deployed app.
