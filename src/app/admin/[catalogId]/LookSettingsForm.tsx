"use client";

import { useState } from "react";
import { useActionState } from "react";
import { TEMPLATES } from "@/lib/catalog/templates";
import { AccentPicker } from "@/components/catalog/AccentPicker";
import type { CatalogBanner, CatalogTemplate, ImageFit } from "@/lib/supabase/types";
import { MAX_BANNERS } from "@/lib/catalog/merchandising";
import {
  dashBtnPrimary,
  dashCard,
  dashChipOff,
  dashHint,
  dashKicker,
  dashSection,
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
  banners: initialBanners,
  imageFit,
  placeholderImageUrl,
  templateSettings: initialSettings,
  fulfillmentModes,
  embedded = false,
}: {
  catalogId: string;
  catalogName: string;
  template: CatalogTemplate;
  accent: string;
  logo: string;
  banners: CatalogBanner[];
  imageFit: ImageFit;
  placeholderImageUrl: string;
  templateSettings: TemplateSettings;
  fulfillmentModes: OrderFulfillment[];
  embedded?: boolean;
}) {
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
  const [tplSettings, setTplSettings] = useState<TemplateSettings>(() =>
    parseTemplateSettings(initialSettings),
  );
  void fulfillmentModes;
  const shownLogo = clearLogo ? "" : (logoPreview ?? logo);
  const brandInitial = (catalogName.trim()[0] ?? "C").toUpperCase();

  return (
    <section id={embedded ? undefined : "look"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Look</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Theme, cover, and display. Metadata is under Discovery.
          </p>
        </div>
      )}

      <form action={formAction} className="flex flex-col">
        <div className="flex flex-col gap-6 px-4 pb-2 pt-3">
          <div className="flex flex-col gap-3">
            <p className={dashKicker}>Logo</p>
            <div className="flex flex-col gap-3.5">
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
                    className="ops-press min-h-11 w-fit rounded-[10px] border border-[#e2e7ee] bg-white px-3 text-[13px] text-[#b42318]"
                  >
                    {clearLogo ? "Keep logo" : "Remove logo"}
                  </button>
                ) : null}
              </div>
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
                      className="ops-press mt-1.5 min-h-11 w-full rounded-[9px] border border-[#e2e7ee] bg-white text-[13px]"
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
            <div className="flex flex-col gap-2">
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
            <p className={dashKicker}>Template</p>
            <div className="flex flex-col gap-2">
              {TEMPLATES.map((tpl) => (
                <label
                  key={tpl.key}
                  className="flex min-w-0 cursor-pointer gap-2.5 rounded-xl border border-[#e2e7ee] bg-white p-3 has-[:checked]:border-[#9dc0ef] has-[:checked]:bg-[#f7faff]"
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
          <input type="hidden" name="placeholderImageUrl" value={placeholderImageUrl} />
        </div>

        <div className="sticky bottom-0 z-[1] mt-4 flex flex-wrap items-center gap-3 border-t border-[#edf0f4] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="submit" disabled={pending} className={`${dashBtnPrimary} ops-press`}>
            {pending ? "Saving…" : "Save look"}
          </button>
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
          {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
        </div>
      </form>
    </section>
  );
}
