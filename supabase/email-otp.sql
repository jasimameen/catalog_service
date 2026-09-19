-- Short-lived hashed email OTP codes for public sign-up / first sign-in.
-- Service role only. Never store the plaintext code. Safe to re-run.

create table if not exists email_otp_challenges (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  attempts integer not null default 0
);

alter table email_otp_challenges enable row level security;

revoke all on table email_otp_challenges from anon, authenticated;
grant all on table email_otp_challenges to service_role;

comment on table email_otp_challenges is
  'Hashed 6-digit email OTP codes. App SMTP sends the code; this row is the server-side check.';
