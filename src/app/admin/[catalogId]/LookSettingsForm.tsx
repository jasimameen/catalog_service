"use client";

import { useState } from "react";
import { useActionState } from "react";
import { TEMPLATES } from "@/lib/catalog/templates";
import { AccentPicker } from "@/components/catalog/AccentPicker";
import type { CatalogBanner, CatalogTemplate, ImageFit } from "@/lib/supabase/types";
import { MAX_BANNERS } from "@/lib/catalog/merchandising";
import { useDashboardSection } from "@/components/admin/dashboard/useDashboardSection";
import {
  dashBtnPrimary,
  dashCard,
  dashChipOff,
  dashHint,
  dashInput,
  dashKicker,
  dashLabel,
  dashSection,
  dashTextarea,
} from "@/components/admin/dashboard/styles";
import { updateCatalogLook, type LookState } from "./actions";
import type { TemplateSettings } from "@/lib/catalog/template-settings";
import { parseTemplateSettings } from "@/lib/catalog/template-settings";
import { TemplateSettingsFields } from "@/components/admin/TemplateSettingsFields";
import type { OrderFulfillment } from "@/lib/supabase/types";

const PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

export function LookSettingsForm({
  catalogId,
  catalogName,
  template,
  accent,
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
  templateSettings: initialSettings,
  fulfillmentModes,
}: {
  catalogId: string;
  catalogName: string;
  template: CatalogTemplate;
  accent: string;
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
  templateSettings: TemplateSettings;
  fulfillmentModes: OrderFulfillment[];
}) {
  const [open, setOpen] = useDashboardSection("look");
  const [state, formAction, pending] = useActionState<LookState, FormData>(
    updateCatalogLook.bind(null, catalogId),
    null,
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [banners, setBanners] = useState<CatalogBanner[]>(initialBanners);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [picked, setPicked] = useState<CatalogTemplate>(template);
  const [pickedAccent, setPickedAccent] = useState(accent);
  const [tplSettings, setTplSettings] = useState<TemplateSettings>(
    () => parseTemplateSettings(initialSettings),
  );
  void fulfillmentModes;
  const shownLogo = clearLogo ? "" : (logoPreview ?? logo);
  const brandInitial = (catalogName.trim()[0] ?? "C").toUpperCase();

  return (
    <section id="look" className={dashCard}>
      <button
        type="button"
        className="flex min-h-11 w-full items-start justify-between gap-3 px-4 py-4 text-left md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">
            Look
          </span>
          <span className="mt-1 block text-[13px] leading-snug text-[#5a6472]">
            Brand, template, accent, and storefront details.
          </span>
        </span>
        <span className="mt-0.5 shrink-0 text-[13px] text-[#0b5fce]">{open ? "Hide" : "Show"}</span>
      </button>
      <div className="hidden border-b border-[#edf0f4] px-4 py-4 md:block">
        <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Look</p>
        <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
          Brand, template, accent, and storefront details.
        </p>
        <p className="m-0 mt-1.5 text-xs leading-snug text-[#8a93a2]">
          Hours, contact, map, and social only appear when enabled. Take orders is under Ordering.
        </p>
      </div>

      <div className={open ? "block" : "hidden md:block"}>
        <form action={formAction} className="flex flex-col">
          <div className="flex flex-col gap-6 px-4 pb-2">
            <div className="flex flex-col gap-3">
              <p className={dashKicker}>Brand</p>
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col gap-2">
                  {shownLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL or merchant logo
                    <img
                      src={shownLogo}
                      alt=""
                      className="h-[84px] w-[84px] rounded-[14px] bg-[#101720] object-contain"
                    />
                  ) : (
                    <div className="grid h-[84px] w-[84px] place-items-center rounded-[14px] bg-[#101720] text-[30px] font-semibold text-white">
                      {brandInitial}
                    </div>
                  )}
                  <input type="hidden" name="logo" defaultValue={logo} />
                  {clearLogo ? <input type="hidden" name="clearLogo" value="1" /> : null}
                  {logo && !logoPreview ? (
                    <button
                      type="button"
                      onClick={() => setClearLogo((v) => !v)}
                      className="min-h-9 rounded-[10px] border border-[#e2e7ee] bg-white px-2.5 text-[12px] text-[#b42318]"
                    >
                      {clearLogo ? "Keep logo" : "Remove logo"}
                    </button>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <input
                    name="logoFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setLogoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return null;
                      });
                      setClearLogo(false);
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
                    className="min-w-0 text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-[10px] file:border-0 file:bg-[#f0f2f6] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
                  />
                  {logoError ? <p className="m-0 text-xs text-[#b42318]">{logoError}</p> : null}
                  <label className="flex flex-col gap-1.5">
                    <span className={dashLabel}>Tagline</span>
                    <input
                      id="tagline"
                      name="tagline"
                      defaultValue={tagline}
                      maxLength={160}
                      placeholder="Trade catalogue · Doha"
                      className={dashInput}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={dashLabel}>About</span>
                    <textarea
                      id="about"
                      name="about"
                      defaultValue={about}
                      maxLength={400}
                      rows={2}
                      placeholder="A short line about your shop"
                      className={dashTextarea}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Hero banners</p>
              <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
                Shown at the top of the storefront. First image is the hero. Up to {MAX_BANNERS}.
              </p>
              <input type="hidden" name="banners" value={JSON.stringify(banners)} />
              {banners.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {banners.map((banner, index) => (
                    <div key={`${banner.image}-${index}`} className="w-[132px]">
                      <div className="h-[76px] overflow-hidden rounded-[11px] border border-[#e2e7ee] bg-[var(--cat-photo-bg)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- merchant banner URL */}
                        <img src={banner.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBanners((prev) => prev.filter((_, i) => i !== index))}
                        className="mt-1.5 min-h-[34px] w-full rounded-[9px] border border-[#e2e7ee] bg-white text-[12px]"
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
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
                  className="min-w-0 w-full text-[13px] text-[var(--cat-ink)] file:mr-2 file:rounded-[10px] file:border-0 file:bg-[#f0f2f6] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
                />
              ) : (
                <p className={dashHint}>Maximum banners added.</p>
              )}
              {bannerError ? <p className="m-0 text-xs text-[#b42318]">{bannerError}</p> : null}
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Photo fit</p>
              <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
                Default for item photos. Cover fills the frame (best for food). Contain shows the
                whole photo.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["cover", "contain"] as const).map((fit) => (
                  <label
                    key={fit}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] capitalize ${dashChipOff} has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd]`}
                  >
                    <input
                      type="radio"
                      name="imageFit"
                      value={fit}
                      defaultChecked={imageFit === fit}
                      className="accent-[#0b5fce]"
                    />
                    {fit}
                  </label>
                ))}
              </div>
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Storefront</p>
              <div className="flex flex-wrap gap-2">
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
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] border border-[#e2e7ee] bg-[#fbfbfd] px-3.5 text-[13px] has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#eef4fd]"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:basis-[180px]">
                  <span className={dashLabel}>Phone</span>
                  <input
                    id="companyPhone"
                    name="companyPhone"
                    defaultValue={phone}
                    maxLength={40}
                    placeholder="+974 3300 0000"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:basis-[180px]">
                  <span className={dashLabel}>Email</span>
                  <input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    defaultValue={email}
                    maxLength={120}
                    placeholder="hello@shop.com"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:basis-[180px]">
                  <span className={dashLabel}>Address</span>
                  <input
                    id="companyAddress"
                    name="companyAddress"
                    defaultValue={address}
                    maxLength={200}
                    placeholder="Lusail, Doha"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:basis-[180px]">
                  <span className={dashLabel}>WhatsApp</span>
                  <input
                    id="companyWhatsapp"
                    name="companyWhatsapp"
                    defaultValue={whatsapp}
                    maxLength={40}
                    placeholder="97433000000"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[180px] sm:basis-[180px]">
                  <span className={dashLabel}>Instagram</span>
                  <input
                    id="companyInstagram"
                    name="companyInstagram"
                    defaultValue={instagram}
                    maxLength={80}
                    placeholder="@teaday"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[130px] sm:basis-[130px]">
                  <span className={dashLabel}>Map latitude</span>
                  <input
                    id="companyLat"
                    name="companyLat"
                    defaultValue={geoLat ?? ""}
                    placeholder="25.3548"
                    inputMode="decimal"
                    className={dashInput}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[130px] sm:basis-[130px]">
                  <span className={dashLabel}>Map longitude</span>
                  <input
                    id="companyLng"
                    name="companyLng"
                    defaultValue={geoLng ?? ""}
                    placeholder="51.1839"
                    inputMode="decimal"
                    className={dashInput}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Hours</span>
                <textarea
                  id="companyHours"
                  name="companyHours"
                  defaultValue={hours}
                  maxLength={800}
                  rows={3}
                  placeholder={"Mon–Fri 11:00 – 23:00\nSat–Sun 11:00 – 00:00"}
                  className={dashTextarea}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashLabel}>Branches</span>
                <textarea
                  id="companyLocations"
                  name="companyLocations"
                  defaultValue={locationsText}
                  maxLength={2000}
                  rows={3}
                  placeholder={"Lusail, 4414 6262\nWukair, 4417 6262"}
                  className={dashTextarea}
                />
                <span className={dashHint}>One branch per line: name, phone.</span>
              </label>
              <p className={`m-0 ${dashHint}`}>OpenStreetMap embed. Hidden if off or empty.</p>
              <input type="hidden" name="placeholderImageUrl" value={placeholderImageUrl} />
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Template</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {TEMPLATES.map((tpl) => (
                  <label
                    key={tpl.key}
                    className="flex min-w-0 cursor-pointer gap-2.5 rounded-xl border border-[#e2e7ee] bg-white p-3 has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#f7faff] sm:min-w-[210px] sm:flex-1 sm:basis-[230px]"
                  >
                    <input
                      type="radio"
                      name="template"
                      value={tpl.key}
                      checked={tpl.key === picked}
                      onChange={() => setPicked(tpl.key)}
                      className="mt-1 accent-[#0b5fce]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-[var(--cat-ink)]">
                        {tpl.name}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-[#5a6472]">
                        {tpl.blurb}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <input type="hidden" name="template_settings" value={JSON.stringify(tplSettings)} />
              <div className="mt-3">
                <TemplateSettingsFields template={picked} settings={tplSettings} onChange={setTplSettings} />
              </div>
            </div>

            <div className={dashSection}>
              <p className={dashKicker}>Accent colour</p>
              <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
                Pick a theme swatch or any custom colour. Buttons, selected states, and the floor default follow this.
              </p>
              <AccentPicker name="accent" value={pickedAccent} onChange={setPickedAccent} />
            </div>
          </div>

          <div className="sticky bottom-0 z-[1] mt-4 flex flex-wrap items-center gap-3 border-t border-[#edf0f4] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="submit" disabled={pending} className={dashBtnPrimary}>
              {pending ? "Saving…" : "Save"}
            </button>
            {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
            {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
