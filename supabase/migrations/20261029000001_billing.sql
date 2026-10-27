-- In-app payments (Razorpay) for the premium plans.
--
-- The client never decides a price. An order is written here with the amount
-- the server resolved, then Razorpay's checkout signs the result. Access is
-- granted only after the signature checks out (and, when the app closes mid
-- payment, from the webhook that finds the same order row).
--
-- Nothing in this table is readable by a client: RLS is on with no policies,
-- and every read/write goes through the service role.

create table if not exists public.tb_payments (
  id                  bigserial primary key,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  provider            text not null default 'razorpay' check (provider in ('razorpay')),
  provider_order_id   text not null unique,
  provider_payment_id text unique,
  plan                text not null check (plan in ('plus', 'mains')),
  period              text not null check (period in ('monthly', 'yearly')),
  amount              integer not null check (amount > 0),
  currency            text not null default 'INR',
  status              text not null default 'created'
                      check (status in ('created', 'paid', 'failed', 'refunded')),
  signature_ok        boolean,
  raw                 jsonb,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists tb_payments_user_idx
  on public.tb_payments (user_id, created_at desc);

create index if not exists tb_payments_provider_payment_idx
  on public.tb_payments (provider_payment_id)
  where provider_payment_id is not null;

-- Webhook replay guard. Razorpay retries a delivery until it is acknowledged.
-- The handler applies its effect first (every effect is idempotent) and then
-- records the event id, so a failure mid-way still gets retried rather than
-- being swallowed as a duplicate.
create table if not exists public.tb_billing_events (
  event_id   text primary key,
  kind       text not null,
  order_id   text,
  created_at timestamptz not null default now()
);

alter table public.tb_payments enable row level security;
alter table public.tb_billing_events enable row level security;

-- Prune the event log with the rest of the operational history. Payments stay:
-- they are the record of what a reader bought.
create or replace function public.tb_prune(cutoff timestamptz default now() - interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.items where published_at < cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.tb_visits where created_at < now() - interval '90 days';
  delete from public.tb_login_events where created_at < now() - interval '180 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.comment_reports where status <> 'open' and resolved_at < now() - interval '180 days';
  delete from public.tb_ai_usage where created_at < now() - interval '180 days';
  delete from public.tb_billing_events where created_at < now() - interval '180 days';

  return v_deleted;
end;
$$;

revoke all on function public.tb_prune(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune(timestamptz) to service_role;
