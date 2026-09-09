"use client";

import { useActionState, useMemo, useTransition } from "react";
import type { DomainRow } from "@/lib/supabase/types";
import { addCustomDomain, removeDomain, updateSlug, type CustomDomainState, type SlugState } from "./actions";

const STATUS_LABEL: Record<DomainRow["status"], string> = {
  pending: "Waiting for DNS",
  verified: "Verified",
  error: "Error",
};

const STATUS_COLORS: Record<DomainRow["status"], { fg: string; bg: string }> = {
  pending: { fg: "#b25000", bg: "#fdf0e3" },
  verified: { fg: "#1e9e4a", bg: "#dff5e6" },
  error: { fg: "#b2432b", bg: "#fbe4e0" },
};

function SubdomainCard({ catalogId, slug, rootHost }: { catalogId: string; slug: string; rootHost: string }) {
  const boundAction = useMemo(() => updateSlug.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<SlugState, FormData>(boundAction, null);

  return (
    <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
        Included subdomain
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="slug"
          defaultValue={slug}
          className="w-[180px] rounded-[10px] border border-[#d2d2d7] px-3 py-2.5 text-[15px] font-semibold tracking-tight outline-none focus:border-[var(--cat-accent)]"
        />
        <span className="text-[15px] text-[var(--cat-muted)]">.{rootHost}</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-[#d2d2d7] bg-white px-3 py-2 text-xs font-medium text-[var(--cat-ink)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <span className="ml-auto rounded-full bg-[var(--cat-success-bg)] px-3 py-1.5 text-xs text-[var(--cat-success-ink)]">
          Live · HTTPS
        </span>
      </form>
      {state?.error ? <p className="m-0 mt-2 text-xs text-[#b2432b]">{state.error}</p> : null}
      <p className="m-0 mt-3 text-[13px] text-[var(--cat-muted)]">
        Renaming this address takes effect immediately — links using the old address will stop
        working.
      </p>
    </div>
  );
}

function CustomDomainRow({ catalogId, domain }: { catalogId: string; domain: DomainRow }) {
  const [pending, startTransition] = useTransition();
  const colors = STATUS_COLORS[domain.status];

  return (
    <div className="rounded-2xl border border-[var(--cat-border)] p-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="m-0 text-[18px] font-semibold tracking-tight text-[var(--cat-ink)]">
          {domain.hostname}
        </p>
        <span
          className="rounded-full px-3 py-1.5 text-xs"
          style={{ color: colors.fg, background: colors.bg }}
        >
          {STATUS_LABEL[domain.status]}
        </span>
      </div>
      <p className="m-0 mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">
        Point this domain at your storefront with a CNAME record, then check back here — DNS
        verification isn&rsquo;t automated yet in this build.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => removeDomain(catalogId, domain.id))}
          className="rounded-[10px] border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50"
        >
          {pending ? "Removing…" : "Remove domain"}
        </button>
      </div>
    </div>
  );
}

function AddDomainCard({ catalogId }: { catalogId: string }) {
  const boundAction = useMemo(() => addCustomDomain.bind(null, catalogId), [catalogId]);
  const [state, formAction, pending] = useActionState<CustomDomainState, FormData>(boundAction, null);

  return (
    <div className="rounded-2xl border border-dashed border-[#d2d2d7] p-[22px]">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
        Custom domain
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap gap-2">
        <input
          name="hostname"
          placeholder="catalog.example.com"
          className="min-w-[220px] flex-1 rounded-[10px] border border-[#d2d2d7] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--cat-accent)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-[var(--cat-ink)] px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add domain"}
        </button>
      </form>
      {state?.error ? <p className="m-0 mt-2 text-xs text-[#b2432b]">{state.error}</p> : null}
    </div>
  );
}

export function DomainsClient({
  catalogId,
  slug,
  rootHost,
  customDomains,
}: {
  catalogId: string;
  slug: string;
  rootHost: string;
  customDomains: DomainRow[];
}) {
  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      <SubdomainCard catalogId={catalogId} slug={slug} rootHost={rootHost} />
      {customDomains.map((domain) => (
        <CustomDomainRow key={domain.id} catalogId={catalogId} domain={domain} />
      ))}
      <AddDomainCard catalogId={catalogId} />
    </div>
  );
}
