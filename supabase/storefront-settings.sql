-- Run once in the Supabase SQL editor. Storefront toggles: take orders,
-- hours/contact/social/map visibility, contact email, branch list, shop
-- coordinates, catalog-level placeholder image. Safe to re-run.
-- Item availability stays on catalog_items.visible (already exists).

alter table catalogs
  add column if not exists accept_orders boolean not null default true,
  add column if not exists show_map boolean not null default false,
  add column if not exists show_hours boolean not null default true,
  add column if not exists show_contact boolean not null default true,
  add column if not exists show_social boolean not null default true,
  add column if not exists email text,
  add column if not exists locations jsonb not null default '[]'::jsonb,
  add column if not exists geo_lat double precision,
  add column if not exists geo_lng double precision,
  add column if not exists placeholder_image_url text;
