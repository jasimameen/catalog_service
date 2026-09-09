-- Run once in the Supabase SQL editor. Adds merchant-configurable checkout
-- fields (and prefixes) on catalogs. Safe to re-run.

alter table catalogs
  add column if not exists checkout_fields jsonb not null default '{
    "shopName": "required",
    "phone": "required",
    "address": "required",
    "maps": "optional",
    "notes": "optional",
    "phonePrefix": "",
    "orderPrefix": ""
  }'::jsonb;
