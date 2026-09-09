-- Run once in the Supabase SQL editor. Fixes secret-key 42501 and
-- creates the account for the user that already signed up.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

insert into accounts (name, order_email)
select 'Lsk', 'jasim@hevyf.com'
where not exists (
  select 1
  from account_members
  where user_id = '55b31c27-8b41-49c4-9317-ce32affc4a19'
);

insert into account_members (account_id, user_id, role)
select a.id, '55b31c27-8b41-49c4-9317-ce32affc4a19', 'owner'
from accounts a
where a.order_email = 'jasim@hevyf.com'
  and not exists (
    select 1
    from account_members m
    where m.user_id = '55b31c27-8b41-49c4-9317-ce32affc4a19'
  );
