-- Run once in the Supabase SQL editor if you have not already.
-- Reservation lifecycle (Pending → Confirmed → Seated / Completed,
-- plus Cancelled and No-show) with who/when, mirroring order_status_events.
-- Existing rows stay valid: status defaults to pending; created_at is booked at.
-- Safe to re-run.

alter table reservations
  add column if not exists status text not null default 'pending',
  add column if not exists confirmed_at timestamptz,
  add column if not exists seated_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists no_show_at timestamptz;

update reservations
  set status = 'pending'
  where status is null or status = '';

alter table reservations drop constraint if exists reservations_status_check;
alter table reservations add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'));

create index if not exists reservations_catalog_slot_status_idx
  on reservations (catalog_id, day, slot, status);

create table if not exists reservation_status_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists reservation_status_events_reservation_id_idx
  on reservation_status_events (reservation_id, created_at);

alter table reservation_status_events enable row level security;

drop policy if exists "members can read reservation status events" on reservation_status_events;
create policy "members can read reservation status events" on reservation_status_events
  for select using (
    exists (
      select 1 from reservations r
      join catalogs c on c.id = r.catalog_id
      where r.id = reservation_id and is_account_member(c.account_id)
    )
  );

drop policy if exists "members can insert reservation status events" on reservation_status_events;
create policy "members can insert reservation status events" on reservation_status_events
  for insert with check (
    exists (
      select 1 from reservations r
      join catalogs c on c.id = r.catalog_id
      where r.id = reservation_id and is_account_member(c.account_id)
    )
  );

grant select, insert on table reservation_status_events to authenticated, service_role;
grant all on table reservation_status_events to service_role;

drop policy if exists "members can update reservations" on reservations;
create policy "members can update reservations" on reservations
  for update using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  )
  with check (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );
