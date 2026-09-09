"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

function isDomainStatus(value: unknown): value is DomainRow["status"] {
  return value === "pending" || value === "verified" || value === "error";
}

function CustomDomainRow({
  catalogId,
  domain,
  cnameTarget,
}: {
  catalogId: string;
  domain: DomainRow;
  cnameTarget: string;
}) {
  const router = useRouter();
  const [removing, startRemove] = useTransition();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<DomainRow["status"]>(domain.status);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = STATUS_COLORS[status];

  async function handleCheck() {
    setChecking(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: domain.id }),
      });
      const data = (await res.json()) as {
        status?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Could not check this domain. Try again.");
        return;
      }
      if (isDomainStatus(data.status)) setStatus(data.status);
      setMessage(data.message ?? "Check complete.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const feedbackColor =
    error || status === "error"
      ? "#b2432b"
      : status === "verified"
        ? "var(--cat-success-ink)"
        : "var(--cat-muted)";

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
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="m-0 mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">
        Point <span className="font-medium text-[var(--cat-ink)]">{domain.hostname}</span> at{" "}
        <span className="font-medium text-[var(--cat-ink)]">{cnameTarget}</span> with a CNAME
        record, then tap Check now.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={checking}
          onClick={() => void handleCheck()}
          className="rounded-[10px] border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check now"}
        </button>
        <button
          type="button"
          disabled={removing}
          onClick={() => startRemove(() => removeDomain(catalogId, domain.id))}
          className="rounded-[10px] border border-[#d2d2d7] bg-white px-4 py-2 text-[13px] font-medium text-[var(--cat-ink)] disabled:opacity-50"
        >
          {removing ? "Removing…" : "Remove domain"}
        </button>
      </div>
      {error || message ? (
        <p className="m-0 mt-3 text-[13px] leading-relaxed" style={{ color: feedbackColor }}>
          {error ?? message}
        </p>
      ) : null}
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
  cnameTarget,
  customDomains,
}: {
  catalogId: string;
  slug: string;
  rootHost: string;
  cnameTarget: string;
  customDomains: DomainRow[];
}) {
  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      <SubdomainCard catalogId={catalogId} slug={slug} rootHost={rootHost} />
      {customDomains.map((domain) => (
        <CustomDomainRow
          key={domain.id}
          catalogId={catalogId}
          domain={domain}
          cnameTarget={cnameTarget}
        />
      ))}
      <AddDomainCard catalogId={catalogId} />
    </div>
  );
}
