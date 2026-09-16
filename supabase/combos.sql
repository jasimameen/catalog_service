-- Run once in the Supabase SQL editor. Combo sets: one catalog item with a
-- set price and a list of included products. Safe to re-run.

alter table catalog_items
  add column if not exists is_combo boolean not null default false,
  add column if not exists combo_lines jsonb not null default '[]'::jsonb;

alter table order_items
  add column if not exists combo_json jsonb not null default '[]'::jsonb;

create index if not exists catalog_items_combo_idx
  on catalog_items (catalog_id)
  where is_combo = true;
