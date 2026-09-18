-- Run once in the Supabase SQL editor if you have not already.
-- A booking can prefer several tables, or none (host seats the party).
-- table_ids: [{ id, no }, ...] — empty means no table preference.
-- table_no / table_id stay as the first/primary table for older rows.
-- Safe to re-run.

alter table reservations
  add column if not exists table_ids jsonb not null default '[]'::jsonb;

alter table reservations
  alter column table_no drop not null;
