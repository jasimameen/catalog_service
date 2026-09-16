"use client";

import { useState } from "react";
import { useActionState } from "react";
import { TEMPLATES, ACCENT_COLORS } from "@/lib/catalog/templates";
import { CHECKOUT_FIELD_KEYS, CHECKOUT_FIELD_LABELS } from "@/lib/catalog/checkout-fields";
import type { CatalogBanner, CatalogTemplate, CheckoutFields, ImageFit } from "@/lib/supabase/types";
import { MAX_BANNERS } from "@/lib/catalog/merchandising";
import { PlaceholderPicker } from "@/components/admin/PlaceholderPicker";
import { updateCatalogLook, type LookState } from "./actions";

const PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

const MODES = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "hidden", label: "Hidden" },
] as const;

const FIELD_UI_LABEL: Record<(typeof CHECKOUT_FIELD_KEYS)[number], string> = {
  shopName: "Shop name",
  phone: "Phone",
  address: "Delivery address",
  maps: "Maps link",
  notes: "Notes",
};

export function LookSettingsForm({
  catalogId,
  template,
  accent,
  checkoutFields,
  logo,
  tagline,
  about,
  banners: initialBanners,
  imageFit,
  phone,
  email,
  address,
  hours,
  whatsapp,
  instagram,
  locationsText,
  geoLat,
  geoLng,
  placeholderImageUrl,
  showHours,
  showContact,
  showSocial,
  showMap,
}: {
  catalogId: string;
  template: CatalogTemplate;
  accent: string;
  checkoutFields: CheckoutFields;
  logo: string;
  tagline: string;
  about: string;
  banners: CatalogBanner[];
  imageFit: ImageFit;
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  locationsText: string;
  geoLat: number | null;
  geoLng: number | null;
  placeholderImageUrl: string;
  showHours: boolean;
  showContact: boolean;
  showSocial: boolean;
  showMap: boolean;
}) {
  const [state, formAction, pending] = useActionState<LookState, FormData>(
    updateCatalogLook.bind(null, catalogId),
    null,
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [banners, setBanners] = useState<CatalogBanner[]>(initialBanners);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [placeholderUrl, setPlaceholderUrl] = useState(placeholderImageUrl);
  const accents = ACCENT_COLORS.includes(accent) ? ACCENT_COLORS : [...ACCENT_COLORS, accent];
  const shownLogo = logoPreview ?? logo;

  return (
    <div id="look" className="rounded-2xl border border-[var(--cat-border)] p-5">
      <h3 className="m-0 text-[15px] font-semibold text-[var(--cat-ink)]">Look</h3>
      <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">
        Brand, template, accent, and what the storefront order form collects.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Brand
          </p>
          <input type="hidden" name="logo" defaultValue={logo} />
          <div className="flex items-center gap-3">
            <input
              name="logoFile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setLogoPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                if (!file) {
                  setLogoError(null);
                  return;
                }
                if (file.size > MAX_LOGO_BYTES) {
                  setLogoError("Logo must be 4MB or smaller.");
                  e.target.value = "";
                  return;
                }
                if (file.type && !PHOTO_TYPES.has(file.type)) {
                  setLogoError("Use a JPEG, PNG, WebP, or GIF logo.");
                  e.target.value = "";
                  return;
                }
                setLogoError(null);
                setLogoPreview(URL.createObjectURL(file));
              }}
              className="min-w-0 flex-1 text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
            />
            {shownLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL or merchant logo
              <img
                src={shownLogo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg bg-[var(--cat-photo-bg)] object-contain"
              />
            ) : null}
          </div>
          {logo && !logoPreview ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-[var(--cat-muted)]">
              <input type="checkbox" name="clearLogo" value="1" />
              Remove logo
            </label>
          ) : null}
          {logoError ? <p className="m-0 mt-1 text-xs text-[#b2432b]">{logoError}</p> : null}
          <label htmlFor="tagline" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            Tagline
          </label>
          <input
            id="tagline"
            name="tagline"
            defaultValue={tagline}
            maxLength={160}
            placeholder="Trade catalogue · Doha"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <label htmlFor="about" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            About
          </label>
          <textarea
            id="about"
            name="about"
            defaultValue={about}
            maxLength={400}
            rows={2}
            placeholder="A short line about your shop"
            className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Hero banners
          </p>
          <p className="mb-3 text-xs text-[var(--cat-muted)]">
            Shown at the top of the storefront. First image is the hero. Up to {MAX_BANNERS}.
          </p>
          <input type="hidden" name="banners" value={JSON.stringify(banners)} />
          {banners.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {banners.map((banner, index) => (
                <div key={`${banner.image}-${index}`} className="relative h-16 w-24 overflow-hidden rounded-lg bg-[var(--cat-photo-bg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- merchant banner URL */}
                  <img src={banner.image} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBanners((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-medium text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {banners.length < MAX_BANNERS ? (
            <input
              name="bannerFiles"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                for (const file of files) {
                  if (file.size > MAX_LOGO_BYTES) {
                    setBannerError("Each banner must be 4MB or smaller.");
                    e.target.value = "";
                    return;
                  }
                  if (file.type && !PHOTO_TYPES.has(file.type)) {
                    setBannerError("Use JPEG, PNG, WebP, or GIF banners.");
                    e.target.value = "";
                    return;
                  }
                }
                setBannerError(null);
              }}
              className="min-w-0 w-full text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
            />
          ) : (
            <p className="text-xs text-[var(--cat-muted)]">Maximum banners added.</p>
          )}
          {bannerError ? <p className="m-0 mt-1 text-xs text-[#b2432b]">{bannerError}</p> : null}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Photo fit
          </p>
          <p className="mb-3 text-xs text-[var(--cat-muted)]">
            Default for item photos. Cover fills the frame (best for food). Contain shows the whole photo.
          </p>
          <div className="flex gap-2">
            {(["cover", "contain"] as const).map((fit) => (
              <label
                key={fit}
                className="cursor-pointer rounded-[10px] border border-[#e8e8ed] px-3 py-2 text-[13px] font-medium capitalize has-[:checked]:border-[var(--cat-accent)]"
              >
                <input
                  type="radio"
                  name="imageFit"
                  value={fit}
                  defaultChecked={imageFit === fit}
                  className="sr-only"
                />
                {fit}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Storefront
          </p>
          <p className="mb-3 text-xs text-[var(--cat-muted)]">
            Hours, contact, map, and social only appear when enabled. Take orders is under Ordering.
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(
              [
                { name: "showHours", label: "Show hours", checked: showHours },
                { name: "showContact", label: "Show contact", checked: showContact },
                { name: "showSocial", label: "Show social", checked: showSocial },
                { name: "showMap", label: "Show map", checked: showMap },
              ] as const
            ).map((toggle) => (
              <label
                key={toggle.name}
                className="flex min-h-11 items-center gap-2 rounded-[10px] border border-[#e8e8ed] px-3 text-[13px] text-[var(--cat-ink)]"
              >
                <input type="checkbox" name={toggle.name} value="1" defaultChecked={toggle.checked} />
                {toggle.label}
              </label>
            ))}
          </div>
          <label htmlFor="companyPhone" className="mb-1 block text-xs text-[#86868b]">
            Phone
          </label>
          <input
            id="companyPhone"
            name="companyPhone"
            defaultValue={phone}
            maxLength={40}
            placeholder="+974 3300 0000"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <label htmlFor="companyEmail" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            Email
          </label>
          <input
            id="companyEmail"
            name="companyEmail"
            type="email"
            defaultValue={email}
            maxLength={120}
            placeholder="hello@shop.com"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <label htmlFor="companyAddress" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            Address
          </label>
          <input
            id="companyAddress"
            name="companyAddress"
            defaultValue={address}
            maxLength={200}
            placeholder="Lusail, Doha"
            className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <label htmlFor="companyHours" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            Hours
          </label>
          <textarea
            id="companyHours"
            name="companyHours"
            defaultValue={hours}
            maxLength={800}
            rows={3}
            placeholder={"Mon–Fri 11:00 – 23:00\nSat–Sun 11:00 – 00:00"}
            className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <label htmlFor="companyLocations" className="mb-1 mt-3.5 block text-xs text-[#86868b]">
            Branches
          </label>
          <textarea
            id="companyLocations"
            name="companyLocations"
            defaultValue={locationsText}
            maxLength={2000}
            rows={4}
            placeholder={"Lusail, 4414 6262\nWukair, 4417 6262"}
            className="w-full resize-none rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
          />
          <p className="m-0 mt-1 text-[11px] text-[#86868b]">One branch per line: name, phone.</p>
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="companyWhatsapp" className="mb-1 block text-xs text-[#86868b]">
                WhatsApp
              </label>
              <input
                id="companyWhatsapp"
                name="companyWhatsapp"
                defaultValue={whatsapp}
                maxLength={40}
                placeholder="97433000000"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <div>
              <label htmlFor="companyInstagram" className="mb-1 block text-xs text-[#86868b]">
                Instagram
              </label>
              <input
                id="companyInstagram"
                name="companyInstagram"
                defaultValue={instagram}
                maxLength={80}
                placeholder="@teaday"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="companyLat" className="mb-1 block text-xs text-[#86868b]">
                Map latitude
              </label>
              <input
                id="companyLat"
                name="companyLat"
                defaultValue={geoLat ?? ""}
                placeholder="25.3548"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
            <div>
              <label htmlFor="companyLng" className="mb-1 block text-xs text-[#86868b]">
                Map longitude
              </label>
              <input
                id="companyLng"
                name="companyLng"
                defaultValue={geoLng ?? ""}
                placeholder="51.1839"
                className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
              />
            </div>
          </div>
          <p className="m-0 mt-1 text-[11px] text-[#86868b]">OpenStreetMap embed. Hidden if off or empty.</p>
          <div className="mt-4">
            <input type="hidden" name="placeholderImageUrl" value={placeholderUrl} />
            <p className="mb-1 text-xs text-[#86868b]">Default photo for items without an image</p>
            <PlaceholderPicker value={placeholderUrl} onSelect={setPlaceholderUrl} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Template
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TEMPLATES.map((tpl) => (
              <label
                key={tpl.key}
                className="cursor-pointer rounded-[12px] border border-[#e8e8ed] p-3 has-[:checked]:border-[var(--cat-accent)] has-[:checked]:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.4)]"
              >
                <input
                  type="radio"
                  name="template"
                  value={tpl.key}
                  defaultChecked={tpl.key === template}
                  className="sr-only"
                />
                <span className="block text-[13px] font-semibold text-[var(--cat-ink)]">{tpl.name}</span>
                <span className="mt-0.5 block text-xs text-[var(--cat-muted)]">{tpl.blurb}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Accent colour
          </p>
          <div className="flex gap-2.5">
            {accents.map((hex) => (
              <label key={hex} className="cursor-pointer">
                <input
                  type="radio"
                  name="accent"
                  value={hex}
                  defaultChecked={hex === accent}
                  className="peer sr-only"
                />
                <span
                  aria-label={hex}
                  className="block h-[34px] w-[34px] rounded-full border-2 border-transparent peer-checked:border-[#1d1d1f]"
                  style={{
                    background: hex,
                    boxShadow: "0 0 0 2px #fff inset",
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Order form
          </p>
          <p className="mb-3 text-xs text-[var(--cat-muted)]">
            Required fields must be filled. Hidden fields are not shown to the shop.
          </p>
          <div className="flex flex-col gap-2.5">
            {CHECKOUT_FIELD_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label htmlFor={`cf_${key}`} className="text-[13px] text-[var(--cat-ink)]">
                  {FIELD_UI_LABEL[key]}
                  <span className="sr-only"> ({CHECKOUT_FIELD_LABELS[key]})</span>
                </label>
                <select
                  id={`cf_${key}`}
                  name={`cf_${key}`}
                  defaultValue={checkoutFields[key]}
                  className="rounded-[10px] border border-[#d2d2d7] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--cat-accent)]"
                >
                  {MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="phonePrefix" className="mb-1 block text-xs text-[#86868b]">
              Phone prefix
            </label>
            <input
              id="phonePrefix"
              name="phonePrefix"
              defaultValue={checkoutFields.phonePrefix}
              placeholder="+974"
              maxLength={16}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
            <p className="m-0 mt-1 text-xs text-[#86868b]">Shown on the phone field. Added if they skip it.</p>
          </div>
          <div>
            <label htmlFor="orderPrefix" className="mb-1 block text-xs text-[#86868b]">
              Order reference prefix
            </label>
            <input
              id="orderPrefix"
              name="orderPrefix"
              defaultValue={checkoutFields.orderPrefix}
              placeholder="KLE"
              maxLength={16}
              className="w-full rounded-[10px] border border-[#d2d2d7] px-3 py-2 text-[13px] outline-none focus:border-[var(--cat-accent)]"
            />
            <p className="m-0 mt-1 text-xs text-[#86868b]">Becomes KLE-1842 instead of the slug letters.</p>
          </div>
        </div>

        {state?.error ? <p className="m-0 text-xs text-[#b2432b]">{state.error}</p> : null}
        {state?.saved ? <p className="m-0 text-xs text-[#1e9e4a]">Saved.</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[10px] bg-[var(--cat-ink)] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
