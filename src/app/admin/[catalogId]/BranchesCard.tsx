"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  dashBtnGhost,
  dashBtnPrimary,
  dashCard,
  dashHint,
  dashInput,
  dashLabel,
} from "@/components/admin/dashboard/styles";
import { createBranchCatalog } from "./actions";

export type BranchShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export function BranchesCard({
  catalogId,
  catalogName,
  shops,
  canAdd,
  subscribeHref,
}: {
  catalogId: string;
  catalogName: string;
  shops: BranchShop[];
  canAdd: boolean;
  subscribeHref: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep(0);
    setName("");
    setError(null);
  }

  function create(copyHours: boolean) {
    const branchName = name.trim();
    if (!branchName) {
      setError("Give the branch a name.");
      setStep(1);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createBranchCatalog(catalogId, { name: branchName, copyHours });
      if (result.error || !result.catalogId) {
        setError(result.error ?? "Could not add that branch.");
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <section id="branches" className={dashCard}>
      <div className="px-4 pb-1 pt-4">
        <p className="m-0 text-[16px] font-semibold tracking-tight text-[var(--cat-ink)]">Branch</p>
        <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
          Each branch is its own shop — own menu, orders, and link.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2 px-4 py-3">
        {shops.map((shop) => {
          const current = shop.id === catalogId;
          return (
            <div
              key={shop.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-[12px] border border-[#edf0f4] bg-[#fbfbfd] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-[14px] font-medium text-[var(--cat-ink)]">{shop.name}</p>
                <p className="m-0 mt-0.5 truncate text-[12px] text-[#86868b]">
                  {current ? "This shop" : shop.status === "live" ? "Live" : "Draft"}
                  {shop.slug ? ` · ${shop.slug}` : ""}
                </p>
              </div>
              {current ? null : (
                <Link
                  href={`/admin/${shop.id}`}
                  className="ops-press inline-flex min-h-10 shrink-0 items-center text-[13px] font-medium text-[#0b5fce] no-underline"
                >
                  Open
                </Link>
              )}
            </div>
          );
        })}

        {step === 0 ? (
          canAdd ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className={`${dashBtnGhost} ops-press w-full`}
            >
              Add branch
            </button>
          ) : (
            <div className="rounded-[12px] bg-[#f4f6f9] px-3 py-3">
              <p className={`m-0 ${dashHint}`}>
                Subscribe to add another shop. This one stays live.
              </p>
              <Link
                href={subscribeHref}
                className="ops-press mt-2 inline-flex min-h-10 items-center text-[13px] font-medium text-[#0b5fce] no-underline"
              >
                Billing
              </Link>
            </div>
          )
        ) : null}

        {step === 1 ? (
          <div className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-[#edf0f4] px-3 py-3">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={dashLabel}>Branch name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 120))}
                maxLength={120}
                autoFocus
                placeholder="Harbor Downtown"
                className={dashInput}
              />
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => {
                  if (!name.trim()) {
                    setError("Give the branch a name.");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className={`${dashBtnPrimary} ops-press w-full sm:w-auto`}
              >
                Continue
              </button>
              <button type="button" onClick={reset} className={`${dashBtnGhost} ops-press w-full sm:w-auto`}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-[#edf0f4] px-3 py-3">
            <p className="m-0 text-[14px] font-medium text-[var(--cat-ink)]">{name.trim()}</p>
            <p className="m-0 text-[13px] leading-snug text-[#5a6472]">
              Copy hours from {catalogName}, or skip and set them later.
            </p>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={pending}
                onClick={() => create(true)}
                className={`${dashBtnPrimary} ops-press w-full sm:w-auto`}
              >
                {pending ? "Creating…" : "Copy hours"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => create(false)}
                className={`${dashBtnGhost} ops-press w-full sm:w-auto`}
              >
                Skip
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setStep(1)}
                className="ops-press min-h-11 text-[13px] text-[#5a6472]"
              >
                Back
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="m-0 text-[13px] text-[#b42318]">{error}</p> : null}
        <p className={`m-0 ${dashHint}`}>
          Same path as New catalog on the shops list — name first, then only this.
        </p>
      </div>
    </section>
  );
}
