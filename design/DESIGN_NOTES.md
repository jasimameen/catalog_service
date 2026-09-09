# Design spec, extracted from the .dc.html canvases

Raw source files are in `design/raw/` (Claude Design canvas artboards — not real code, just the
visual/behavioral spec). This file is the condensed version an engineer (or another AI) can work
from without opening the HTML.

Brand: `#0b5fce` blue, `#1d1d1f` ink, `#6e6e73` muted text, `#e8e8ed` borders, `#f5f5f7`
surface, Archivo (display) + IBM Plex Sans (body) — already the Kleaner catalogue's fonts.
Apple-marketing-site visual register throughout (blur headers, pill buttons, huge type).

## Landing (`catalog.hevyf.com` root)

Sticky blurred nav: logo, Templates/How it works/Pricing anchor links, Sign in, "Start free"
pill button (→ Admin, i.e. sign-in-or-up).

Hero: "Your catalog, live in five minutes." Subhead about add items / pick template / share
link / orders to inbox. Two CTAs: "Create your catalog" (→ builder), "See templates" (→ anchor).
Below: a big browser-chrome mock of a live storefront (traffic-light dots, url pill showing
`kleaner.catalog.hevyf.com`, a real product grid).

"Three steps" section: Add items / Pick a template / Share the link, each a card, first one
links to the mobile builder.

"Four templates" section: 4 cards with abstract block-layout previews + name + blurb, link to
full Templates gallery page.

"Orders arrive three ways" section: split layout — copy about email/dashboard/CSV + "prices are
recalculated on the server" (already true in the current order route, keep it true) — next to a
realistic order card mock (shop name, phone, address, 3 line items, total).

"On your own domain" section: two cards — included subdomain (live instantly) vs optional custom
domain (add a CNAME, we verify + issue cert).

Pricing: single dark card, $19/mo, 14 days free, bullet list (unlimited catalogs/items, all 4
templates, subdomain+custom domain included, orders by email/inbox/CSV, analytics, unlimited
team members — team members is aspirational per Known gaps in PLAN.md), "Start your free trial"
button, "No card to start. Cancel in one click."

Footer: tagline + Templates/Pricing/Dashboard links.

`monthlyPrice` (default 19) and `trialDays` (default 14) are the only two "knobs" in the design
— keep them as named constants so they're trivial to change later.

## Catalog Templates gallery (`/templates`, public)

Tab bar (Trade Grid / Lookbook / Menu / Price List) switching a big browser-chrome preview
showing the SAME 12 real Kleaner items rendered in each layout, plus a one-paragraph "best for…"
blurb per tab. "Use a template" CTA → builder.

### Template: Trade Grid
Dense photo grid (`repeat(auto-fill, minmax(190px,1fr))`), category header with count, per-card:
photo (584:480 contain), name, code, "QAR" unit label, price, bordered "Add to order" button.
This is exactly the current Kleaner `CatalogClient`/`ProductCard` — reuse it, generalize props.

### Template: Lookbook
White background, big padding (56/48px), eyebrow "{Name} · Season list", huge serif-ish headline,
2-col grid of large 4:3 photos with name/description/price/pill CTA underneath. Few items (4-6).

### Template: Menu
Cream background (`#fffdf8`), centered all-caps title + meta line, sectioned lists (section
title in muted caps, rows are `name ... dotted leader ... price`, no photos). Footer note about
tap-to-order and an order-cutoff time.

### Template: Price List
White, print-oriented. Header with title + "Valid <month> · prices exclude delivery" + page
count. Table: Code / Item / Pack / Price columns, thin row dividers, footer "order by phone or
tap any row" + "Download PDF" (PDF export is a nice-to-have, not required for v1).

## Catalog Builder (`/new`, desktop `Catalog Builder.dc.html` + mobile
`Catalog Builder (mobile).dc.html` — same 3 steps, different chrome)

Top bar: back to catalogs, 3 numbered step pills (Items / Look / Address), "Draft saved" label.

**Step 1 — Items**: inline add-row (photo square that opens file picker / camera, name input,
price input, "Add" button) + list of already-added items (thumb, name, code, price, remove ×).
Copy mentions "paste a spreadsheet and every row becomes an item" and barcode-scan-to-fill —
both are nice-to-haves, not required for v1 (flag as follow-up if not built in time).

**Step 2 — Look**: template picker (4 cards, name+blurb, selected = colored border+shadow),
accent color swatches (4 presets: blue `#0b5fce`, ink `#1d1d1f`, green `#0f7b53`, rust `#b2432b`),
catalog name input. Desktop shows a live preview panel on the right that re-renders using the
selected template's shape (grid/lookbook/menu/pricelist) with the real draft items.

**Step 3 — Address**: subdomain input + `.catalog.hevyf.com` suffix + live "Available" check,
order-notification email input, summary rows (item count / template / plan). "Publish catalog"
button.

**Published state**: big checkmark, "Your catalog is live.", the live URL in a copy-able pill,
"Open catalog" / "Go to dashboard" buttons.

Mobile version: phone-frame chrome, same 3 steps + a 4th "Share" screen with a share-sheet
mock (WhatsApp/Messages/Email/Instagram/Print QR) and a photo-attach action sheet
(Take photo/Choose from gallery/Paste image or link/Scan barcode). The share-sheet and native
camera integration are look-and-feel only in a web app — implement "Copy link" +
`navigator.share()` where available as the real behavior.

## Admin (`/admin`)

Left sidebar (becomes a horizontal top bar under 900px): logo, "New catalog" button, nav
(Catalogs / Dashboard / Orders / Items / Domains / Settings — Dashboard/Orders/Items/Domains
only make sense once a catalog is selected), trial-status card pinned to the bottom (hidden on
the narrow/horizontal layout). Header: page title + subtitle, company name + initials avatar.

**Catalogs** (account home): grid of catalog cards — 3×2 thumbnail collage, status dot
(live=green/draft=gray), name, url, "{items} items · {orders} orders · {views} views" or
"not published", Dashboard + Copy link buttons. Trailing dashed "+ New catalog" tile.

**Dashboard** (per catalog): "Live at {url}" bar with Copy link / QR code / View catalog. 4 stat
tiles (views this month, orders, order value, items) each with a delta/note line. Two-column:
recent orders list (click → Orders screen with that order open) + "most ordered items" bar list.

**Orders** (per catalog): master-detail. Left: count + "Export CSV" + scrollable order rows
(shop, reference · when · summary, total). Right: selected order detail — shop/phone/address,
line items (photo/name/code/unit×qty/total), grand total, "Mark confirmed" + "Call shop" buttons.

**Items** (per catalog): search box, "Paste from spreadsheet" + "Add item" buttons, table
(photo/name+description/code/price/visible-toggle).

**Domains** (per catalog): included-subdomain card (editable slug, "Live · HTTPS" badge, note
that renaming keeps the old address working 30 days — nice-to-have grace period, not required
for v1) + custom-domain card (status pill, CNAME+TXT record table, "Check now" / "Remove domain"
buttons).

**Settings** (account-level): trial/billing card (see Known gaps — UI only), order-notification
emails (to/cc + daily CSV digest toggle — CSV digest is a nice-to-have cron job, not v1), company
name + currency fields.

## Kleaner Catalogue (current)

This *is* the current app (`src/app/CatalogClient.tsx` etc.) — the design canvas just
re-described it 1:1 as the reference for what "Trade Grid" template output looks like when it's
a real, live, 112-item catalogue with a working cart and checkout. No new spec here; it's the
target fidelity bar for the generalized `GridTemplate` component.
