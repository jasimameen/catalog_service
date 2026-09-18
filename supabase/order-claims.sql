-- Run once in the Supabase SQL editor. Taken / not taken on orders.
-- Independent of workflow status. Safe to re-run.

alter table orders
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text;
