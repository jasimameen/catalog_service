-- New accounts get 30 days free. Existing trial_ends_at values stay as-is.
-- Lemon Squeezy variant trial days are a dashboard setting — set that to 30 too.

alter table accounts
  alter column trial_ends_at set default (now() + interval '30 days');
