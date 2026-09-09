-- Run once in the Supabase SQL editor. Creates the public catalog-images
-- bucket used by Admin → Add item photo upload. Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-images',
  'catalog-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read so storefront and admin thumbnails can use getPublicUrl().
drop policy if exists "Public read catalog-images" on storage.objects;
create policy "Public read catalog-images"
on storage.objects for select
using (bucket_id = 'catalog-images');

-- Authenticated members may upload into {catalogId}/… for catalogs they own.
drop policy if exists "Members upload catalog-images" on storage.objects;
create policy "Members upload catalog-images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'catalog-images'
  and exists (
    select 1 from public.catalogs c
    where c.id::text = (storage.foldername(name))[1]
      and public.is_account_member(c.account_id)
  )
);
