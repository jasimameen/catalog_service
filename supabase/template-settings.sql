-- Run once in the Supabase SQL editor. Per-template layout + restaurant
-- settings (fees, hours copy, reserve, dine-in extras, sounds, floor).
-- floor: { name, tables[] for guests, floors[] studio tiles/items/tables }.
-- One keyed jsonb blob. Safe to re-run.

alter table catalogs
  add column if not exists template_settings jsonb not null default '{}'::jsonb;

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references catalogs(id) on delete cascade,
  table_id text,
  table_no text,
  table_ids jsonb not null default '[]'::jsonb,
  day date not null,
  slot text not null,
  guests int not null default 2,
  name text not null,
  phone text not null,
  note text,
  track_token text,
  created_at timestamptz not null default now()
);

create index if not exists reservations_catalog_day_idx
  on reservations (catalog_id, day);

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references catalogs(id) on delete cascade,
  table_no text,
  kind text not null,
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table service_requests
  add column if not exists resolved_at timestamptz;

alter table reservations enable row level security;
alter table service_requests enable row level security;

drop policy if exists "members can read reservations" on reservations;
create policy "members can read reservations" on reservations
  for select using (
    catalog_id in (
      select c.id from catalogs c
      join account_members m on m.account_id = c.account_id
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "members can update reservations" on reservations;
create policy "members can update reservations" on reservations
  for update using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  )
  with check (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

drop policy if exists "members can read service requests" on service_requests;
create policy "members can read service requests" on service_requests
  for select using (
    catalog_id in (
      select c.id from catalogs c
      join account_members m on m.account_id = c.account_id
      where m.user_id = auth.uid()
    )
  );

-- Guests write through the service-role API. Merchants read via RLS above.
grant select, insert, update, delete on table reservations to authenticated, service_role;
grant select, insert, update, delete on table service_requests to authenticated, service_role;
grant all on table reservations to service_role;
grant all on table service_requests to service_role;

alter table reservations
  add column if not exists track_token text;

create unique index if not exists reservations_track_token_uidx
  on reservations (track_token)
  where track_token is not null;
