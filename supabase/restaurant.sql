-- Run once in the Supabase SQL editor. Restaurant ordering: item variants,
-- fulfillment, kitchen status, custom checkout form. Safe to re-run.
-- Existing trade catalogs stay unchanged (empty options / empty form / empty modes).

alter table catalog_items
  add column if not exists options jsonb not null default '[]'::jsonb;

alter table order_items
  add column if not exists options_json jsonb not null default '[]'::jsonb,
  add column if not exists notes text;

alter table orders
  add column if not exists fulfillment text,
  add column if not exists table_no text,
  add column if not exists geo_lat double precision,
  add column if not exists geo_lng double precision,
  add column if not exists form_values jsonb not null default '{}'::jsonb;

alter table orders drop constraint if exists orders_fulfillment_check;
alter table orders add constraint orders_fulfillment_check
  check (fulfillment is null or fulfillment in ('dine_in', 'pickup', 'delivery'));

-- Kitchen board statuses, plus confirmed/cancelled so existing rows stay valid.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('new', 'preparing', 'ready', 'done', 'confirmed', 'cancelled'));

alter table catalogs
  add column if not exists checkout_form jsonb not null default '[]'::jsonb,
  add column if not exists fulfillment_modes jsonb not null default '[]'::jsonb;
