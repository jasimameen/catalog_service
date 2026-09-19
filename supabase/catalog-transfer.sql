-- Platform operator catalog transfer.
-- Ownership switch is catalogs.account_id. Items, orders, reservations,
-- domains, views, floor/settings stay on catalog_id — do not duplicate rows.
-- Safe to re-run.

alter table catalogs
  add column if not exists transferred_at timestamptz;

comment on column catalogs.transferred_at is
  'Set when a platform operator moves this catalog to another account. Child rows stay on catalog_id.';
