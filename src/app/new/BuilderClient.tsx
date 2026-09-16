"use client";

import { useState, useTransition } from "react";
import { templateMeta } from "@/lib/catalog/templates";
import type { CatalogTemplateKey } from "@/lib/catalog/types";
import { normalizeSlug, slugFromName } from "@/lib/catalog/slug";
import { TopBar } from "@/components/builder/TopBar";
import { StepLook } from "@/components/builder/StepLook";
import { StepAddress } from "@/components/builder/StepAddress";
import { PublishedScreen } from "@/components/builder/PublishedScreen";
import { TemplatePreview } from "@/components/builder/TemplatePreview";
import { useSlugAvailability } from "@/components/builder/slug-hook";
import { publishCatalog } from "./actions";

interface BuilderAccount {
  id: string;
  name: string;
  currency: string;
}

interface BuilderClientProps {
  account: BuilderAccount;
  trialDaysLeft: number;
  planLabel?: string;
  ownerEmail: string;
  rootDomain: string;
}

/**
 * 2-step create wizard (Look → Address), then publish. Items are optional
 * and happen after the catalog exists, via spreadsheet upload.
 */
export function BuilderClient({ account, trialDaysLeft, planLabel, ownerEmail, rootDomain }: BuilderClientProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [template, setTemplate] = useState<CatalogTemplateKey>("grid");
  const [accent, setAccent] = useState("#0b5fce");
  const [catalogName, setCatalogName] = useState(account.name);
  const [subdomain, setSubdomain] = useState(() => slugFromName(account.name) || "catalog");
  const [slugDirty, setSlugDirty] = useState(false);
  const [orderEmail, setOrderEmail] = useState(ownerEmail);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ catalogId: string; slug: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { availability, suggestions } = useSlugAvailability(subdomain, catalogName, true);

  const protocol = rootDomain.startsWith("localhost") ? "http" : "https";
  const slugPreview = normalizeSlug(subdomain);
  const liveUrl = slugPreview ? `${protocol}://${slugPreview}.${rootDomain}` : "";

  function handleCatalogName(next: string) {
    const wasEmpty = catalogName.trim() === "";
    setCatalogName(next);
    setPublishError(null);
    if (!slugDirty || wasEmpty) {
      if (wasEmpty) setSlugDirty(false);
      setSubdomain(slugFromName(next));
    }
  }

  function handleSubdomain(value: string) {
    const next = normalizeSlug(value);
    setPublishError(null);
    if (next === "") {
      setSlugDirty(false);
      setSubdomain(slugFromName(catalogName));
      return;
    }
    setSlugDirty(true);
    setSubdomain(next);
  }

  function applySuggestion(slug: string) {
    setSlugDirty(true);
    setSubdomain(slug);
    setPublishError(null);
  }

  function goNext() {
    setPublishError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (availability === "taken" || availability === "invalid") {
      setPublishError(
        availability === "taken"
          ? "This address is taken — pick a suggestion or try another."
          : "Pick an address using lowercase letters, numbers and dashes."
      );
      return;
    }
    handlePublish();
  }

  function goBack() {
    setPublishError(null);
    if (step === 2) setStep(1);
  }

  function handlePublish() {
    setPublishError(null);

    startTransition(async () => {
      const result = await publishCatalog({
        name: catalogName,
        template,
        accent,
        slug: subdomain,
        orderEmail,
        items: [],
      });

      if (result.ok) {
        setPublished({ catalogId: result.catalogId, slug: result.slug });
      } else {
        setPublishError(result.error);
        if (result.field === "slug") setStep(2);
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

  const stepMeta: Record<1 | 2, { nextLabel: string; helper: string }> = {
    1: { nextLabel: "Continue", helper: "You can change this later" },
    2: { nextLabel: isPending ? "Publishing…" : "Publish catalog", helper: "Items are optional — upload next" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfd] text-[#1d1d1f]">
      <TopBar step={step} />

      <div className="mx-auto min-h-0 flex-1 md:grid md:w-full md:grid-cols-2 md:items-stretch">
        <div
          className={`px-4 pb-14 pt-8 sm:px-6 sm:pt-10 md:max-w-[640px] md:px-8 ${
            mobileView === "preview" ? "hidden md:block" : ""
          }`}
        >
          <div className="mb-5 flex gap-2 md:hidden">
            <ViewTab label="Edit" active={mobileView === "edit"} onClick={() => setMobileView("edit")} />
            <ViewTab
              label="Preview"
              active={mobileView === "preview"}
              onClick={() => setMobileView("preview")}
            />
          </div>

          {step === 1 && (
            <StepLook
              template={template}
              accent={accent}
              catalogName={catalogName}
              liveUrl={liveUrl}
              onTemplate={setTemplate}
              onAccent={setAccent}
              onCatalogName={handleCatalogName}
            />
          )}
          {step === 2 && (
            <StepAddress
              subdomain={subdomain}
              rootDomain={rootDomain}
              liveUrl={liveUrl}
              availability={availability}
              suggestions={suggestions}
              onSubdomain={handleSubdomain}
              onSlugFocus={() => setSlugDirty(true)}
              onSuggestion={applySuggestion}
              orderEmail={orderEmail}
              onOrderEmail={setOrderEmail}
              templateName={templateMeta(template).name}
              trialDaysLeft={trialDaysLeft}
              planLabel={planLabel}
              errorMessage={publishError}
            />
          )}

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
              disabled={
                isPending ||
                (step === 2 && (availability === "taken" || availability === "invalid"))
              }
              className="w-full rounded-full bg-[#0b5fce] px-7 py-3 text-[15px] font-medium text-white disabled:opacity-60 sm:w-auto"
            >
              {stepMeta[step].nextLabel}
            </button>
            <span className="text-[13px] text-[#86868b]">{stepMeta[step].helper}</span>
          </div>
        </div>

        <div
          className={`flex min-h-[min(72vh,780px)] flex-col border-t border-[#e8e8ed] bg-[#f5f5f7] p-4 sm:p-5 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:min-h-0 md:border-l md:border-t-0 ${
            mobileView === "edit" ? "hidden md:flex" : "flex"
          }`}
        >
          <TemplatePreview
            template={template}
            accent={accent}
            catalogName={catalogName}
            currency={account.currency}
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
