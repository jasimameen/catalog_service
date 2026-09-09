# Setup

Copy `.env.example` to `.env.local`. Then do this once:

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
3. **SQL Editor** → run [`supabase/seed.sql`](supabase/seed.sql).
4. **Settings → API** — paste into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; keep secret)
5. Set `NEXT_PUBLIC_ROOT_DOMAIN` to `localhost:3000` locally, or `catalog.hevyf.com` in production.
6. Optional — order email on checkout: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `ORDER_FROM_EMAIL`.

Custom domains: [`CLOUDFLARE.md`](CLOUDFLARE.md). Hosting: [`DEPLOY.md`](DEPLOY.md).

```bash
npm install && npm run dev
```
