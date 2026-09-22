-- Allow the admin PWA to register FCM web tokens on the same table the
-- Instant Catalog Ops app uses. Safe to re-run.

alter table public.mobile_push_tokens drop constraint if exists mobile_push_tokens_platform_check;

alter table public.mobile_push_tokens
  add constraint mobile_push_tokens_platform_check
  check (platform = any (array['ios'::text, 'android'::text, 'web'::text]));
