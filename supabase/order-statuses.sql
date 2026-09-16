-- Run once in the Supabase SQL editor. Merchant-configurable order statuses
-- per catalog, plus room for custom status ids on orders.
-- Safe to re-run.

alter table catalogs
  add column if not exists order_statuses jsonb not null default '[
    {"id":"new","label":"New","sort":0,"is_done":false},
    {"id":"preparing","label":"Preparing","sort":1,"is_done":false},
    {"id":"ready","label":"Ready for collection","sort":2,"is_done":false},
    {"id":"out_for_delivery","label":"Gone for delivery","sort":3,"is_done":false},
    {"id":"done","label":"Done","sort":4,"is_done":true}
  ]'::jsonb,
  add column if not exists default_order_status text not null default 'new';

-- Custom status ids (e.g. out_for_delivery) are stored as text.
alter table orders drop constraint if exists orders_status_check;
