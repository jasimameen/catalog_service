-- Run once in the Supabase SQL editor. Makes admin order / service-request
-- inbox live. Safe to re-run.
--
-- Without this, postgres_changes never fires (publication empty) and
-- filtered UPDATE/DELETE payloads omit catalog_id (replica identity default).

alter table public.orders replica identity full;
alter table public.order_items replica identity full;
alter table public.service_requests replica identity full;
alter table public.reservations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    execute 'alter publication supabase_realtime add table public.order_items';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.service_requests';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then
    execute 'alter publication supabase_realtime add table public.reservations';
  end if;
end $$;

grant select, insert, update, delete on table public.reservations to authenticated, service_role;
grant select, insert, update, delete on table public.service_requests to authenticated, service_role;
grant all on table public.reservations to service_role;
grant all on table public.service_requests to service_role;
