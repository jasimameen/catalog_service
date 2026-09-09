-- Run once in the Supabase SQL editor. Adds optional catalog branding
-- (logo URL, tagline, about) and widens the template check for Cards,
-- Compact, and Spotlight. Safe to re-run.

alter table catalogs
  add column if not exists logo text,
  add column if not exists tagline text,
  add column if not exists about text;

alter table catalogs drop constraint if exists catalogs_template_check;
alter table catalogs add constraint catalogs_template_check
  check (template in ('grid', 'lookbook', 'menu', 'pricelist', 'cards', 'compact', 'spotlight'));
