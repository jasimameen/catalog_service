-- Generic public demo catalog (Harbor Kitchen, slug `harbor`).
-- Structural restaurant template only — not Tea Day. Safe to re-run.
-- Attaches to the working Instant Catalog merchant account if present.

do $$
declare
  demo_account uuid;
  demo_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa01';
  salad_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa11';
  catch_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa12';
  chowder_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa13';
  chicken_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa14';
  fries_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa15';
  greens_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa16';
  lemonade_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa17';
  espresso_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa18';
  bread_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa19';
  lunch_id uuid := 'b8e0c0a0-1111-4111-8222-00000000aa20';
  settings jsonb := '{
    "menu": {"sorts": true, "showPhotos": true, "dietFilters": true, "sectionStyle": "cards", "featuredTitle": "Featured today", "featuredNote": "Highlights from the list", "sortOptions": ["menu", "price", "name"], "dietOptions": [{"id": "veg", "label": "Vegetarian", "keywords": ["veg", "vegetarian", "salad"]}, {"id": "vegan", "label": "Vegan", "keywords": ["vegan"]}, {"id": "spicy", "label": "Spicy", "keywords": ["spicy", "chili", "chilli", "hot"]}]},
    "restaurant": {"dineInQr": true, "callWaiter": true, "requestBill": true, "kitchenRounds": true, "enableReserve": true, "skipDineInDetails": true, "requireInRestaurantCheck": true, "kitchenOpen": true, "enableClaim": true, "dayCount": 4, "guestMin": 1, "guestMax": 12, "minOrder": 0, "deliveryFee": 0, "servicePercent": 0, "defaultMode": "", "closedBanner": "Closed right now", "reopenCopy": "", "scheduleWhenClosed": true, "orderCta": "Place order", "kitchenCta": "Send to kitchen", "pickupReadyCopy": "Pickup ready in 20 minutes", "holdPolicy": "We hold the table for 20 minutes past your time. Free to cancel by phone.", "timeSlots": ["12:00", "12:30", "13:00", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"], "venueLat": 40.6891, "venueLng": -73.9956, "venueRadiusM": 200},
    "floor": {"name": "Ground floor", "tables": [
      {"id": "h1", "no": "1", "seats": 2, "bookable": true, "status": "open"},
      {"id": "h2", "no": "2", "seats": 4, "bookable": true, "status": "open"},
      {"id": "h3", "no": "3", "seats": 4, "bookable": true, "status": "open"},
      {"id": "h4", "no": "4", "seats": 4, "bookable": true, "status": "open"},
      {"id": "h5", "no": "5", "seats": 6, "bookable": true, "status": "open"},
      {"id": "h6", "no": "6", "seats": 2, "bookable": true, "status": "open"}
    ]}
  }'::jsonb;
  checkout jsonb := '[
    {"id": "name", "label": "Your name", "type": "text", "required": true},
    {"id": "phone", "label": "Phone", "type": "tel", "required": true},
    {"id": "table", "label": "Table number", "type": "text", "required": true, "show_when": ["dine_in"]},
    {"id": "address", "label": "Delivery address", "type": "textarea", "required": true, "show_when": ["delivery"]},
    {"id": "pickup_time", "label": "Pickup time", "type": "text", "required": false, "show_when": ["pickup"]},
    {"id": "payment", "label": "Pay with", "type": "select", "required": false, "options": ["Cash", "Card"]},
    {"id": "notes", "label": "Notes", "type": "textarea", "required": false}
  ]'::jsonb;
begin
  select id into demo_account
  from accounts
  where id = '4cea1495-92ff-43ae-90df-4b0eb92aa73b';

  if demo_account is null then
    select id into demo_account from accounts order by created_at limit 1;
  end if;

  if demo_account is null then
    raise notice 'harbor-demo: no account to attach to';
    return;
  end if;

  insert into catalogs (
    id, account_id, name, slug, status, template, accent, currency,
    tagline, about, hours, phone, address, whatsapp, instagram,
    accept_orders, show_hours, show_contact, show_social, show_map,
    geo_lat, geo_lng,
    checkout_form, fulfillment_modes, template_settings
  ) values (
    demo_id,
    demo_account,
    'Harbor Kitchen',
    'harbor',
    'live',
    'menu',
    '#0b5fce',
    'USD',
    'Cobble Hill · Brooklyn',
    'A sample Brooklyn restaurant for Instant Catalog. Dine-in QR, pickup, delivery, and table reserve. Instagram @harborkitchen · facebook.com/harborkitchen',
    E'Tuesday–Thursday\n11:00 AM – 10:00 PM\n\nFriday–Saturday\n11:00 AM – 11:00 PM\n\nSunday\n11:00 AM – 9:00 PM\n\nMonday\nClosed',
    '(718) 555-0184',
    '184 Atlantic Avenue, Brooklyn, NY 11201',
    '+17185550184',
    'harborkitchen',
    true, true, true, true, true,
    40.6891, -73.9956,
    checkout,
    '["dine_in","pickup","delivery"]'::jsonb,
    settings
  )
  on conflict (slug) do update set
    name = excluded.name,
    template = excluded.template,
    accent = excluded.accent,
    currency = excluded.currency,
    tagline = excluded.tagline,
    about = excluded.about,
    hours = excluded.hours,
    phone = excluded.phone,
    address = excluded.address,
    whatsapp = excluded.whatsapp,
    instagram = excluded.instagram,
    show_map = excluded.show_map,
    geo_lat = excluded.geo_lat,
    geo_lng = excluded.geo_lng,
    checkout_form = excluded.checkout_form,
    fulfillment_modes = excluded.fulfillment_modes,
    template_settings = excluded.template_settings,
    status = 'live';

  delete from catalog_items where catalog_id = demo_id;

  insert into catalog_items (id, catalog_id, code, category, name, description, price, pack, image, position, visible, featured, options, is_combo, combo_lines) values
    (catch_id, demo_id, 'CATCH', 'Mains', 'Grilled catch', 'Day-boat fish, lemon, olive oil, herbs.', 32, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', 0, true, true, '[]'::jsonb, false, '[]'::jsonb),
    (salad_id, demo_id, 'SALAD', 'Mains', 'Harbor salad', 'Greens, citrus, toasted seeds.', 16, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 1, true, true, '[]'::jsonb, false, '[]'::jsonb),
    (chowder_id, demo_id, 'CHOWDER', 'Mains', 'Harbor chowder', 'Cream, potato, smoked fish.', 14, '', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80', 2, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (chicken_id, demo_id, 'CHICKEN', 'Mains', 'Roast chicken', 'Half bird, pan juices, seasonal greens.', 26, '', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80', 3, true, false, '[{"name":"Size","type":"single","required":true,"values":[{"name":"Half","price_delta":0},{"name":"Whole","price_delta":0}]}]'::jsonb, false, '[]'::jsonb),
    (fries_id, demo_id, 'FRIES', 'Sides', 'Herb fries', 'Crisp, rosemary salt.', 8, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', 4, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (greens_id, demo_id, 'GREENS', 'Sides', 'Seasonal greens', 'Olive oil, lemon.', 9, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 5, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (lemonade_id, demo_id, 'LEMONADE', 'Drinks', 'House lemonade', 'Fresh lemon, mint.', 5, '', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80', 6, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (espresso_id, demo_id, 'ESPRESSO', 'Drinks', 'Espresso', 'Short, rotating origin.', 4, '', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80', 7, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (bread_id, demo_id, 'BREAD', 'Bakery', 'Olive focaccia', 'Baked this morning.', 7, '', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 8, true, false, '[]'::jsonb, false, '[]'::jsonb),
    (lunch_id, demo_id, 'LUNCH', 'Combos', 'Lunch plate', 'Salad and lemonade, one price.', 19, '', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80', 9, true, false, '[]'::jsonb, true, json_build_array(json_build_object('item_id', salad_id, 'qty', 1), json_build_object('item_id', lemonade_id, 'qty', 1))::jsonb);
end $$;
