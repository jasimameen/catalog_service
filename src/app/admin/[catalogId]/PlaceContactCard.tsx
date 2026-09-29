"use client";

import { useActionState, useMemo, useState } from "react";
import {
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import { SettingsSwitch } from "@/components/admin/SettingsSwitch";
import { googleMapsEmbedSrc, parseCoord } from "@/lib/catalog/locations";
import { updateCatalogPlace, type PlaceState } from "./actions";

const MENU_FLAGS = [
  { name: "showContact", label: "Show contact", hint: "Phone, email, address" },
  { name: "showSocial", label: "Show social", hint: "WhatsApp and Instagram" },
  { name: "showMap", label: "Show map", hint: "Google Map on the menu" },
] as const;

export function PlaceContactCard({
  catalogId,
  phone,
  email,
  address,
  whatsapp,
  instagram,
  geoLat,
  geoLng,
  showContact,
  showSocial,
  showMap,
  embedded = false,
}: {
  catalogId: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  instagram: string;
  geoLat: number | null;
  geoLng: number | null;
  showContact: boolean;
  showSocial: boolean;
  showMap: boolean;
  embedded?: boolean;
}) {
  const [state, formAction, pending] = useActionState<PlaceState, FormData>(
    updateCatalogPlace.bind(null, catalogId),
    null,
  );
  const [addr, setAddr] = useState(address);
  const [lat, setLat] = useState(geoLat != null ? String(geoLat) : "");
  const [lng, setLng] = useState(geoLng != null ? String(geoLng) : "");
  const flagDefaults = { showContact, showSocial, showMap };

  const mapSrc = useMemo(
    () => googleMapsEmbedSrc({ address: addr, lat: parseCoord(lat), lng: parseCoord(lng) }),
    [addr, lat, lng],
  );

  return (
    <section id={embedded ? undefined : "contact"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]">
            Contact
          </p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Main number and address for this shop.
          </p>
        </div>
      )}

      <form action={formAction} className="flex min-w-0 flex-col">
        <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
            Shown on the menu
          </p>
          <div className="settings-inset">
            {MENU_FLAGS.map((toggle) => (
              <label key={toggle.name} className="settings-row cursor-pointer">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium tracking-tight text-[var(--cat-ink)]">
                    {toggle.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-[#86868b]">{toggle.hint}</span>
                </span>
                <SettingsSwitch name={toggle.name} defaultChecked={flagDefaults[toggle.name]} />
              </label>
            ))}
          </div>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Phone</span>
            <input
              name="companyPhone"
              defaultValue={phone}
              maxLength={40}
              placeholder="+974 3300 0000"
              className={dashInput}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Email</span>
            <input
              name="companyEmail"
              type="email"
              defaultValue={email}
              maxLength={120}
              placeholder="hello@shop.com"
              className={dashInput}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Address</span>
            <input
              name="companyAddress"
              value={addr}
              onChange={(event) => setAddr(event.target.value)}
              maxLength={200}
              placeholder="Lusail, Doha"
              className={dashInput}
            />
          </label>

          {mapSrc ? (
            <div className="overflow-hidden rounded-[12px] border border-[#edf0f4] bg-[#f4f6f9]">
              <iframe
                title="Shop location preview"
                src={mapSrc}
                className="h-40 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <p className={`m-0 ${dashHint}`}>Add an address or coordinates to preview the map.</p>
          )}

          <div className="grid min-w-0 grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={dashLabel}>Latitude</span>
              <input
                name="companyLat"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                placeholder="25.3548"
                inputMode="decimal"
                className={dashInput}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={dashLabel}>Longitude</span>
              <input
                name="companyLng"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                placeholder="51.1839"
                inputMode="decimal"
                className={dashInput}
              />
            </label>
          </div>
          <p className={`m-0 ${dashHint}`}>
            Google Maps preview. Hidden on the menu if Show map is off.
          </p>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>WhatsApp</span>
            <input
              name="companyWhatsapp"
              defaultValue={whatsapp}
              maxLength={40}
              placeholder="97433000000"
              className={dashInput}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Instagram</span>
            <input
              name="companyInstagram"
              defaultValue={instagram}
              maxLength={80}
              placeholder="@teaday"
              className={dashInput}
            />
          </label>
        </div>

        <div className="sticky bottom-0 z-[1] flex flex-wrap items-center gap-3 border-t border-[#edf0f4] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="submit" disabled={pending} className={`${dashBtnPrimary} ops-press`}>
            {pending ? "Saving…" : "Save contact"}
          </button>
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
          {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
        </div>
      </form>
    </section>
  );
}
