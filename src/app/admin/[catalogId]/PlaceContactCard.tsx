"use client";

import { useActionState } from "react";
import {
  dashBtnPrimary,
  dashCard,
  dashChipOff,
  dashHint,
  dashInput,
  dashKicker,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import { updateCatalogPlace, type PlaceState } from "./actions";

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

  return (
    <section id={embedded ? undefined : "contact"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Contact</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Main number and address for this shop.
          </p>
        </div>
      )}

      <form action={formAction} className="flex min-w-0 flex-col">
        <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
          <p className={dashKicker}>Shown on the menu</p>
          <div className="flex flex-col gap-2">
            {(
              [
                { name: "showContact", label: "Show contact", checked: showContact },
                { name: "showSocial", label: "Show social", checked: showSocial },
                { name: "showMap", label: "Show map", checked: showMap },
              ] as const
            ).map((toggle) => (
              <label
                key={toggle.name}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] border px-3.5 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd] ${dashChipOff}`}
              >
                <input
                  type="checkbox"
                  name={toggle.name}
                  value="1"
                  defaultChecked={toggle.checked}
                  className="h-4 w-4 accent-[#0b5fce]"
                />
                {toggle.label}
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
              defaultValue={address}
              maxLength={200}
              placeholder="Lusail, Doha"
              className={dashInput}
            />
          </label>
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
          <div className="flex min-w-0 flex-col gap-3">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={dashLabel}>Map latitude</span>
              <input
                name="companyLat"
                defaultValue={geoLat ?? ""}
                placeholder="25.3548"
                inputMode="decimal"
                className={dashInput}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={dashLabel}>Map longitude</span>
              <input
                name="companyLng"
                defaultValue={geoLng ?? ""}
                placeholder="51.1839"
                inputMode="decimal"
                className={dashInput}
              />
            </label>
          </div>
          <p className={`m-0 ${dashHint}`}>OpenStreetMap embed. Hidden if off or empty.</p>
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
