"use client";

import { useMemo, useState, useTransition } from "react";
import { templateMeta } from "@/lib/catalog/templates";
import type { CatalogTemplateKey } from "@/lib/catalog/types";
import { normalizeSlug } from "@/lib/catalog/slug";
import { TopBar } from "@/components/builder/TopBar";
import { StepItems } from "@/components/builder/StepItems";
import { StepLook } from "@/components/builder/StepLook";
import { StepAddress } from "@/components/builder/StepAddress";
import { PublishedScreen } from "@/components/builder/PublishedScreen";
import { TemplatePreview } from "@/components/builder/TemplatePreview";
import { useSlugAvailability } from "@/components/builder/slug-hook";
import { approxImageBytes, MAX_IMAGE_BYTES } from "@/components/builder/image-size";
import type { DraftItem } from "@/components/builder/types";
import { publishCatalog } from "./actions";

interface BuilderAccount {
  id: string;
  name: string;
  currency: string;
}

interface BuilderClientProps {
  account: BuilderAccount;
  trialDaysLeft: number;
  ownerEmail: string;
  rootDomain: string;
}

let nextTempId = 0;

/**
 * The whole 3-step wizard. No draft is persisted to Supabase mid-flow —
 * "Draft saved" in the top bar is cosmetic, matching the task spec: the
 * entire draft (items, template, accent, name, subdomain) lives in this
 * component's React state until the user hits "Publish catalog" on Step 3,
 * which calls the publishCatalog Server Action (src/app/new/actions.ts).
 */
export function BuilderClient({ account, trialDaysLeft, ownerEmail, rootDomain }: BuilderClientProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [template, setTemplate] = useState<CatalogTemplateKey>("grid");
  const [accent, setAccent] = useState("#0b5fce");
  const [catalogName, setCatalogName] = useState(`${account.name}'s catalog`);
  const [subdomain, setSubdomain] = useState(() => normalizeSlug(account.name).slice(0, 30));
  const [orderEmail, setOrderEmail] = useState(ownerEmail);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ catalogId: string; slug: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const availability = useSlugAvailability(subdomain, step === 3);

  const protocol = rootDomain.startsWith("localhost") ? "http" : "https";
  const liveUrl = `${protocol}://${normalizeSlug(subdomain) || subdomain}.${rootDomain}`;

  const oversizedPhotoCount = useMemo(
    () => items.filter((it) => it.image && approxImageBytes(it.image) > MAX_IMAGE_BYTES).length,
    [items]
  );

  function addItem(item: { name: string; price: number; image: string }) {
    setItems((prev) => [...prev, { tempId: `draft-${nextTempId++}`, ...item }]);
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  }

  function goNext() {
    setPublishError(null);
    if (step === 1) {
      if (items.length === 0) {
        setPublishError("Add at least one item before continuing.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    handlePublish();
  }

  function goBack() {
    setPublishError(null);
    if (step > 1) setStep((s) => (s === 3 ? 2 : 1));
  }

  function handlePublish() {
    setPublishError(null);

    // Photos over the size cap are dropped here rather than at the server —
    // the user sees exactly which items keep their photo before it's final.
    const preparedItems = items.map((it) => ({
      name: it.name,
      price: it.price,
      image: it.image && approxImageBytes(it.image) <= MAX_IMAGE_BYTES ? it.image : "",
    }));

    startTransition(async () => {
      const result = await publishCatalog({
        name: catalogName,
        template,
        accent,
        slug: subdomain,
        orderEmail,
        items: preparedItems,
      });

      if (result.ok) {
        setPublished({ catalogId: result.catalogId, slug: result.slug });
      } else {
        setPublishError(result.error);
        if (result.field === "slug") setStep(3);
      }
    });
  }

  if (published) {
    const finalUrl = `${protocol}://${published.slug}.${rootDomain}`;
    return (
      <div className="flex min-h-screen flex-col bg-[#fbfbfd] text-[#1d1d1f]">
        <TopBar step={3} />
        <PublishedScreen liveUrl={finalUrl} catalogId={published.catalogId} />
      </div>
    );
  }

  const stepMeta: Record<1 | 2 | 3, { nextLabel: string; helper: string }> = {
    1: { nextLabel: "Continue", helper: `${items.length} items added` },
    2: { nextLabel: "Continue", helper: "You can change this later" },
    3: { nextLabel: isPending ? "Publishing…" : "Publish catalog", helper: "Live in a few seconds" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfd] text-[#1d1d1f]">
      <TopBar step={step} />

      <div className="mx-auto flex-1 md:grid md:w-full md:grid-cols-2">
        <div
          className={`px-4 pb-14 pt-8 sm:px-6 sm:pt-10 md:max-w-[640px] md:px-8 ${
            mobileView === "preview" ? "hidden md:block" : ""
          }`}
        >
          {/* Mobile-only Edit/Preview toggle — the design's phone mock replaces
              this with a separate screen; a tab pair covers the same need
              (see mobile) without building fake phone-bezel chrome. */}
          <div className="mb-5 flex gap-2 md:hidden">
            <ViewTab label="Edit" active={mobileView === "edit"} onClick={() => setMobileView("edit")} />
            <ViewTab
              label="Preview"
              active={mobileView === "preview"}
              onClick={() => setMobileView("preview")}
            />
          </div>

          {step === 1 && (
            <StepItems items={items} currency={account.currency} onAdd={addItem} onRemove={removeItem} />
          )}
          {step === 2 && (
            <StepLook
              template={template}
              accent={accent}
              catalogName={catalogName}
              onTemplate={setTemplate}
              onAccent={setAccent}
              onCatalogName={setCatalogName}
            />
          )}
          {step === 3 && (
            <StepAddress
              subdomain={subdomain}
              rootDomain={rootDomain}
              availability={availability}
              onSubdomain={(value) => setSubdomain(normalizeSlug(value))}
              orderEmail={orderEmail}
              onOrderEmail={setOrderEmail}
              itemCount={items.length}
              templateName={templateMeta(template).name}
              trialDaysLeft={trialDaysLeft}
              errorMessage={publishError}
            />
          )}

          {step === 3 && oversizedPhotoCount > 0 ? (
            <p className="mt-4 text-[13px] text-[#86868b]">
              {oversizedPhotoCount} {oversizedPhotoCount === 1 ? "photo is" : "photos are"} too
              large to save and won&apos;t be included — the {oversizedPhotoCount === 1 ? "item" : "items"} will
              still publish without {oversizedPhotoCount === 1 ? "it" : "them"}.
            </p>
          ) : null}

          {step === 1 && publishError ? (
            <p className="mt-4 rounded-lg bg-[#fdecea] px-3.5 py-2.5 text-[13px] text-[#b2432b]">
              {publishError}
            </p>
          ) : null}

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-[15px] font-medium sm:w-auto"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={isPending}
              className="w-full rounded-full bg-[#0b5fce] px-7 py-3 text-[15px] font-medium text-white disabled:opacity-60 sm:w-auto"
            >
              {stepMeta[step].nextLabel}
            </button>
            <span className="text-[13px] text-[#86868b]">{stepMeta[step].helper}</span>
          </div>
        </div>

        <div
          className={`flex items-start justify-center border-t border-[#e8e8ed] bg-[#f5f5f7] px-4 pb-14 pt-7 sm:px-6 md:border-l md:border-t-0 ${
            mobileView === "edit" ? "hidden md:flex" : "flex"
          }`}
        >
          <TemplatePreview
            template={template}
            accent={accent}
            catalogName={catalogName}
            currency={account.currency}
            items={items}
            liveUrl={liveUrl}
          />
        </div>
      </div>
    </div>
  );
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
      style={{
        background: active ? "#1d1d1f" : "#ffffff",
        color: active ? "#ffffff" : "#1d1d1f",
        border: `1px solid ${active ? "#1d1d1f" : "#d2d2d7"}`,
      }}
    >
      {label}
    </button>
  );
}
