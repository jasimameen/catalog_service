-- Operator-granted free/comp plan + optional catalog cap.
-- Safe to re-run. Fresh projects: also included at the bottom of schema.sql.
--
-- Ops desk → Users → Grant: set `comp` so the public shop stays live without
-- Lemon Squeezy, and optionally `max_catalogs` (null = unlimited on that grant).
-- Trial default cap is 1 catalog (see FREE_TIER_MAX_CATALOGS). Paid is unlimited
-- unless you set max_catalogs. @hevyf.com / operator emails ignore both.

alter table accounts
  add column if not exists comp boolean not null default false,
  add column if not exists max_catalogs integer;

comment on column accounts.comp is 'Operator grant: shop stays live without a Lemon subscription.';
comment on column accounts.max_catalogs is 'Operator override. Null uses plan default (trial 1, paid unlimited).';
