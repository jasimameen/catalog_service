-- Run once in the Supabase SQL editor if you have not already.
-- Lets a guest pre-order food with a table booking.
-- items: snapshot of dishes added on /s/{slug}/reserve
-- order_id: linked dine-in kitchen order (status New, table_no set)
-- Safe to re-run.

alter table reservations
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists reservations_catalog_created_idx
  on reservations (catalog_id, created_at desc);
