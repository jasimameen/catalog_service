# Setup

Two things need connecting before this is live: **Supabase** (database + auth) and **Cloudflare**
(DNS for the wildcard subdomain + your own domain). Everything else — schema, auth flows,
storefront rendering, the admin app, the builder — is already built. This doc is the checklist
for the two things that are yours to connect.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (the free tier is enough to start).
2. **Settings → API** — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY` — keep this one secret,
     it's server-only and bypasses every RLS policy.
3. Copy `.env.example` to `.env.local` and fill in those three values, plus:
   - `NEXT_PUBLIC_ROOT_DOMAIN` — `catalog.hevyf.com` once your domain is pointed here (see
     `CLOUDFLARE.md`), or leave as `localhost:3000` for local dev.
   - `SMTP_*` / `ORDER_FROM_EMAIL` — for order notification emails (any SMTP provider works;
     this was already required before the SaaS rebuild, unchanged).
4. **SQL Editor** — paste and run [`supabase/schema.sql`](supabase/schema.sql). Safe to re-run.
5. **SQL Editor** — paste and run [`supabase/seed.sql`](supabase/seed.sql). This creates one demo
   account with the original 112-item Kleaner catalogue, fully live, so there's a real example
   the moment this is wired up.
6. **Authentication → Providers** — Email is on by default. Under **Authentication → Settings**,
   "Confirm email" is on by default too — for the fastest test loop while developing, turn it
   off (the app handles either setting correctly either way, see `PLAN.md`'s auth notes, but
   confirmation emails need Supabase's email sending configured or your own SMTP under
   **Authentication → SMTP Settings**, otherwise sign-up will silently not deliver the
   confirmation link).
7. Sign up for real through the app (`/auth/sign-up`) once env vars are set. To also give
   yourself access to the seeded demo "Kleaner" account instead of only your own new one, run
   in the SQL editor (find your user id under **Authentication → Users**):
   ```sql
   insert into account_members (account_id, user_id, role)
   values ('00000000-0000-0000-0000-000000000001', '<your-auth-user-id>', 'owner');
   ```

Run `npm install && npm run dev` locally to try it before deploying anywhere.

## 2. Cloudflare (and hosting)

See [`CLOUDFLARE.md`](CLOUDFLARE.md) — it covers the DNS records for the wildcard subdomain
(needed regardless of where you deploy) and the three ways custom domains get verified.

## Everything else (already done)

- Multi-tenant routing, the 4 storefront templates, the 3-step builder, the admin dashboard,
  order emails + Supabase storage, RLS security — all built. See `PLAN.md` for the full
  architecture and the "Known gaps" section for what's deliberately not built yet (billing,
  team invites).
