-- Run once in the Supabase SQL editor. Order status history, public
-- tracking tokens, and storefront pause/alert copy. Safe to re-run.

create table if not exists order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_id_idx
  on order_status_events (order_id, created_at);

alter table order_status_events enable row level security;

drop policy if exists "members can read order status events" on order_status_events;
create policy "members can read order status events" on order_status_events
  for select using (
    exists (
      select 1 from orders o
      join catalogs c on c.id = o.catalog_id
      where o.id = order_id and is_account_member(c.account_id)
    )
  );

drop policy if exists "members can insert order status events" on order_status_events;
create policy "members can insert order status events" on order_status_events
  for insert with check (
    exists (
      select 1 from orders o
      join catalogs c on c.id = o.catalog_id
      where o.id = order_id and is_account_member(c.account_id)
    )
  );

grant select, insert on table order_status_events to authenticated, service_role;
grant all on table order_status_events to service_role;

alter table orders
  add column if not exists track_token text;

create unique index if not exists orders_track_token_uidx
  on orders (track_token)
  where track_token is not null;

alter table catalogs
  add column if not exists orders_paused_message text,
  add column if not exists storefront_alert text,
  add column if not exists show_storefront_alert boolean not null default false;
