"use client";

import { useActionState } from "react";
import {
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
  dashTextarea,
} from "@/components/admin/dashboard/styles";
import { updateCatalogDiscovery, type DiscoveryState } from "./actions";

export function DiscoveryCard({
  catalogId,
  catalogName,
  tagline,
  about,
  logo,
  embedded = false,
}: {
  catalogId: string;
  catalogName: string;
  tagline: string;
  about: string;
  logo: string;
  embedded?: boolean;
}) {
  const [state, formAction, pending] = useActionState<DiscoveryState, FormData>(
    updateCatalogDiscovery.bind(null, catalogId),
    null,
  );
  const previewTitle = catalogName;
  const previewBody = (about.trim() || tagline.trim() || `${catalogName} live catalog.`).slice(0, 200);

  return (
    <section id={embedded ? undefined : "discovery"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Discovery</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Search, share preview, and the line guests read first.
          </p>
        </div>
      )}

      <form action={formAction} className="flex min-w-0 flex-col">
        <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
          <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
            This is the home for metadata. Title is the catalog name. Logo in Look is the share image.
          </p>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Tagline</span>
            <input
              name="tagline"
              defaultValue={tagline}
              maxLength={160}
              placeholder="Trade catalogue · Doha"
              className={dashInput}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>About / description</span>
            <textarea
              name="about"
              defaultValue={about}
              maxLength={400}
              rows={3}
              placeholder="A short line about your shop"
              className={dashTextarea}
            />
            <span className={dashHint}>Used for search and the share preview. First 200 characters.</span>
          </label>

          <div className="overflow-hidden rounded-[14px] border border-[#edf0f4] bg-[#fbfbfd]">
            <p className="m-0 px-3 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
              Share preview
            </p>
            <div className="flex items-start gap-3 px-3 py-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- merchant logo URL
                <img src={logo} alt="" className="h-12 w-12 shrink-0 rounded-[10px] object-cover" />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[#101720] text-[16px] font-semibold text-white">
                  {(catalogName.trim()[0] ?? "C").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="m-0 truncate text-[14px] font-semibold tracking-tight text-[var(--cat-ink)]">
                  {previewTitle}
                </p>
                <p className="m-0 mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#5a6472]">{previewBody}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-[1] flex flex-wrap items-center gap-3 border-t border-[#edf0f4] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="submit" disabled={pending} className={`${dashBtnPrimary} ops-press`}>
            {pending ? "Saving…" : "Save discovery"}
          </button>
          {state?.error ? <p className="m-0 text-[13px] text-[#b42318]">{state.error}</p> : null}
          {state?.saved ? <p className="m-0 text-[13px] text-[#1e9e4a]">Saved.</p> : null}
        </div>
      </form>
    </section>
  );
}
