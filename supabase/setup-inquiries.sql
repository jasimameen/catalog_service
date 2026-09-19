-- Concierge / "we'll set it up for you" inquiries.
-- Safe to re-run. Public writes go through the service role (same as orders).
-- Storage: private bucket; only the service role can read files.

create table if not exists setup_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_type text not null default 'restaurant'
    check (business_type in ('restaurant', 'retail', 'other')),
  city text not null default '',
  country text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  instagram text not null default '',
  facebook text not null default '',
  website text not null default '',
  tiktok text not null default '',
  hours jsonb not null default '{}'::jsonb,
  notes text not null default '',
  files jsonb not null default '[]'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'live', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setup_inquiries_status_idx on setup_inquiries (status, created_at desc);
create index if not exists setup_inquiries_created_idx on setup_inquiries (created_at desc);

alter table setup_inquiries enable row level security;

-- No anon/authenticated policies: guests and merchants cannot list other
-- businesses' contact details. Server actions use the service-role client.

revoke all on table setup_inquiries from anon, authenticated, public;
grant all on table setup_inquiries to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'setup-inquiries',
  'setup-inquiries',
  false,
  6291456,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Do not add storage.objects policies for this bucket. Service role bypasses
-- RLS; guests upload only through the server action.
