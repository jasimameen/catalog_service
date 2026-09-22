"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  dashBtnGhost,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import { deleteCatalog } from "./actions";

export function DangerCard({
  catalogId,
  catalogName,
  canAddShop,
  subscribeHref,
  embedded = false,
}: {
  catalogId: string;
  catalogName: string;
  canAddShop: boolean;
  subscribeHref: string;
  embedded?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === catalogName.trim().toLowerCase();

  function onDelete() {
    if (!matches) {
      setError(`Type ${catalogName} to confirm.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteCatalog(catalogId, typed);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section id={embedded ? undefined : "danger"} className={embedded ? "min-w-0" : dashCard}>
      {embedded ? null : (
        <div className="px-4 pb-1 pt-4">
          <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Advanced</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
            Another shop, or delete this one.
          </p>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-4 px-4 py-3">
        <div className="rounded-[12px] bg-[#f4f6f9] px-3 py-3">
          <p className="m-0 text-[14px] font-medium text-[var(--cat-ink)]">Another shop</p>
          <p className={`m-0 mt-1 ${dashHint}`}>
            A second shop with its own menu and link is a new catalog — not a location of this one.
            Locations of this shop live under Place.
          </p>
          {canAddShop ? (
            <Link
              href="/new"
              className={`${dashBtnGhost} ops-press mt-3 inline-flex w-full no-underline sm:w-auto`}
            >
              New catalog
            </Link>
          ) : (
            <Link
              href={subscribeHref}
              className="ops-press mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-[#0b5fce] no-underline"
            >
              Subscribe to add another shop
            </Link>
          )}
        </div>

        <div className="rounded-[12px] border border-[#f3d2c6] bg-[#fff6f2] px-3 py-3">
          <p className="m-0 text-[14px] font-semibold text-[#8a3b24]">Delete catalog</p>
          <p className="m-0 mt-1 text-[13px] leading-snug text-[#8a3b24]">
            Permanently removes {catalogName}, its menu, orders, reservations, and domains. This
            cannot be undone.
          </p>
          <label className="mt-3 flex min-w-0 flex-col gap-1.5">
            <span className={dashLabel}>Type {catalogName} to confirm</span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value.slice(0, 120))}
              autoComplete="off"
              className={dashInput}
            />
          </label>
          <button
            type="button"
            disabled={pending || !matches}
            onClick={onDelete}
            className="ops-press mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[11px] bg-[#b42318] px-4 text-[14px] font-medium text-white disabled:opacity-50 sm:w-auto"
          >
            {pending ? "Deleting…" : "Delete catalog"}
          </button>
          {error ? <p className="m-0 mt-2 text-[13px] text-[#b42318]">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
