-- Run once in the Supabase SQL editor. Storefront merchandising:
-- featured items, hero banners, company footer, image fit.
-- Safe to re-run. Does not change restaurant checkout / variants / orders.

alter table catalog_items
  add column if not exists featured boolean not null default false,
  add column if not exists image_fit text;

alter table catalogs
  add column if not exists banners jsonb not null default '[]'::jsonb,
  add column if not exists image_fit text not null default 'cover',
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists hours text,
  add column if not exists whatsapp text,
  add column if not exists instagram text;

alter table catalogs drop constraint if exists catalogs_image_fit_check;
alter table catalogs add constraint catalogs_image_fit_check
  check (image_fit in ('cover', 'contain'));

alter table catalog_items drop constraint if exists catalog_items_image_fit_check;
alter table catalog_items add constraint catalog_items_image_fit_check
  check (image_fit is null or image_fit in ('cover', 'contain'));

create index if not exists catalog_items_featured_idx
  on catalog_items (catalog_id)
  where featured = true;
