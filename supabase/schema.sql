-- Instant Catalog — Supabase schema.
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Accounts: one per signed-up company. account_members joins auth.users to it
-- (schema supports multiple members; invite-by-email UI is not built yet).
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My company',
  currency text not null default 'QAR',
  order_email text,
  order_email_cc text,
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table if not exists account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index if not exists account_members_user_id_idx on account_members(user_id);

-- ---------------------------------------------------------------------------
-- Catalogs
-- ---------------------------------------------------------------------------
create table if not exists catalogs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null default 'Untitled catalog',
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  status text not null default 'draft' check (status in ('draft', 'live')),
  template text not null default 'grid' check (template in ('grid', 'lookbook', 'menu', 'pricelist')),
  accent text not null default '#0b5fce',
  currency text not null default 'QAR',
  order_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalogs_account_id_idx on catalogs(account_id);

-- ---------------------------------------------------------------------------
-- Catalog items
-- ---------------------------------------------------------------------------
create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references catalogs(id) on delete cascade,
  code text not null,
  category text not null default '',
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  pack text not null default '',
  image text not null default '',
  position integer not null default 0,
  visible boolean not null default true,
  barcode text,
  created_at timestamptz not null default now(),
  unique (catalog_id, code)
);

create index if not exists catalog_items_catalog_id_idx on catalog_items(catalog_id);

-- ---------------------------------------------------------------------------
-- Domains — one row per hostname a catalog answers to. The included subdomain
-- gets a row automatically (kind='subdomain', status='verified') when a
-- catalog is created; customers can add more (kind='custom').
-- ---------------------------------------------------------------------------
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references catalogs(id) on delete cascade,
  hostname text not null unique,
  kind text not null default 'custom' check (kind in ('subdomain', 'custom')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'error')),
  provider_ref text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists domains_catalog_id_idx on domains(catalog_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references catalogs(id) on delete cascade,
  reference text not null unique,
  shop_name text not null,
  phone text not null,
  location text not null,
  maps_link text,
  notes text,
  subtotal numeric(10, 2) not null default 0,
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_catalog_id_idx on orders(catalog_id);
create index if not exists orders_created_at_idx on orders(created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text not null,
  category text not null default '',
  name text not null,
  price numeric(10, 2) not null default 0,
  qty integer not null check (qty > 0),
  line_total numeric(10, 2) not null default 0
);

create index if not exists order_items_order_id_idx on order_items(order_id);

-- ---------------------------------------------------------------------------
-- Views (basic analytics: one row per storefront page view)
-- ---------------------------------------------------------------------------
create table if not exists catalog_views (
  id bigint generated always as identity primary key,
  catalog_id uuid not null references catalogs(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists catalog_views_catalog_id_created_idx on catalog_views(catalog_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger for catalogs
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists catalogs_set_updated_at on catalogs;
create trigger catalogs_set_updated_at
  before update on catalogs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All application tables are locked to "the requesting user is a member of
-- the owning account". Public storefront reads and order writes go through
-- the service-role client in server code instead of relaxing these policies.
-- ---------------------------------------------------------------------------
alter table accounts enable row level security;
alter table account_members enable row level security;
alter table catalogs enable row level security;
alter table catalog_items enable row level security;
alter table domains enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table catalog_views enable row level security;

create or replace function is_account_member(target_account_id uuid)
returns boolean as $$
  select exists (
    select 1 from account_members
    where account_id = target_account_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

drop policy if exists "members can read their account" on accounts;
create policy "members can read their account" on accounts
  for select using (is_account_member(id));

drop policy if exists "members can update their account" on accounts;
create policy "members can update their account" on accounts
  for update using (is_account_member(id));

drop policy if exists "members can read membership rows" on account_members;
create policy "members can read membership rows" on account_members
  for select using (is_account_member(account_id));

drop policy if exists "members can manage catalogs" on catalogs;
create policy "members can manage catalogs" on catalogs
  for all using (is_account_member(account_id)) with check (is_account_member(account_id));

drop policy if exists "members can manage items" on catalog_items;
create policy "members can manage items" on catalog_items
  for all using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  ) with check (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

drop policy if exists "members can manage domains" on domains;
create policy "members can manage domains" on domains
  for all using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  ) with check (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

drop policy if exists "members can read orders" on orders;
create policy "members can read orders" on orders
  for select using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

drop policy if exists "members can update orders" on orders;
create policy "members can update orders" on orders
  for update using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

drop policy if exists "members can read order items" on order_items;
create policy "members can read order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      join catalogs c on c.id = o.catalog_id
      where o.id = order_id and is_account_member(c.account_id)
    )
  );

drop policy if exists "members can read views" on catalog_views;
create policy "members can read views" on catalog_views
  for select using (
    exists (select 1 from catalogs c where c.id = catalog_id and is_account_member(c.account_id))
  );

-- No insert policies for orders/order_items/catalog_views: those are written
-- exclusively by server code using the service-role key, which bypasses RLS.
