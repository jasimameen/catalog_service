-- Run once in the Supabase SQL editor. Adds Lemon Squeezy subscription
-- columns on accounts. Safe to re-run.
-- Fresh projects: also included at the bottom of schema.sql.

alter table accounts
  add column if not exists ls_customer_id text,
  add column if not exists ls_subscription_id text,
  add column if not exists ls_status text,
  add column if not exists ls_renews_at timestamptz;

alter table accounts drop constraint if exists accounts_ls_status_check;
alter table accounts add constraint accounts_ls_status_check
  check (ls_status is null or ls_status in ('trialing', 'active', 'past_due', 'cancelled'));
