# Deploy on Vercel

Import this Git repo into your existing or new Vercel project. Vercel auto-detects Next.js — leave Root Directory empty (repo root) and keep the default build (`next build`).

## Checklist

1. Finish [`SETUP.md`](SETUP.md) locally so schema + seed are already on the same Supabase project you will use in production.
2. In Vercel: **Add New Project** → **Import Git Repository** → this repo → Framework Preset **Next.js**.
3. Paste the env vars below (Production + Preview). Then deploy.
4. In the Vercel project **Domains** tab, add `catalog.hevyf.com` and `*.catalog.hevyf.com`. Point DNS at `cname.vercel-dns.com`.
5. Optional custom domains for merchants: after you paste `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`, Admin **Check now** adds the hostname via [`src/lib/domains/vercel.ts`](src/lib/domains/vercel.ts) and Vercel issues TLS. Details: [`CLOUDFLARE.md`](CLOUDFLARE.md).

Do not commit `.env.local`. Tokens stay in the Vercel dashboard.

## Env vars to paste

Required:

```
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=

SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SECRET_KEY=

NEXT_PUBLIC_ROOT_DOMAIN=catalog.hevyf.com
DOMAIN_PROVIDER=vercel
```

Use the same Project URL / Publishable key / Secret key as in `.env.example`. Set both the new names and the `NEXT_PUBLIC_` aliases.

Optional — order emails (checkout still saves without these):

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
ORDER_FROM_EMAIL=
```

Optional — auto-add merchant custom domains + TLS (after the first deploy you can copy Project ID from the dashboard):

```
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

`VERCEL_TEAM_ID` only if the project lives on a team.
