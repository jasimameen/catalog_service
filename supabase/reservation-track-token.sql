-- Guest tracking links for reservations. Unguessable token, same shape as orders.
-- Safe to re-run.

alter table reservations
  add column if not exists track_token text;

create unique index if not exists reservations_track_token_uidx
  on reservations (track_token)
  where track_token is not null;
