"use client";

export type SlugAvailability = "idle" | "checking" | "available" | "taken" | "invalid";

interface StepAddressProps {
  subdomain: string;
  rootDomain: string;
  availability: SlugAvailability;
  onSubdomain: (value: string) => void;
  orderEmail: string;
  onOrderEmail: (value: string) => void;
  itemCount: number;
  templateName: string;
  trialDaysLeft: number;
  errorMessage: string | null;
}

/** Step 3 — "Where should it live?" Subdomain + availability, order email, summary. */
export function StepAddress({
  subdomain,
  rootDomain,
  availability,
  onSubdomain,
  orderEmail,
  onOrderEmail,
  itemCount,
  templateName,
  trialDaysLeft,
  errorMessage,
}: StepAddressProps) {
  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[38px]">
        Where should it live?
      </h1>
      <p className="mt-3 max-w-[520px] text-[15px] leading-[1.5] text-[#6e6e73] sm:text-[16px]">
        Your address is ready now. A custom domain can be added later from the Domains screen.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={subdomain}
          onChange={(e) => onSubdomain(e.target.value)}
          className="w-full rounded-xl border border-[#d2d2d7] px-3.5 py-3 text-[17px] font-semibold tracking-[-0.01em] outline-none sm:w-[200px]"
        />
        <span className="text-[17px] text-[#6e6e73]">.{rootDomain}</span>
      </div>
      <AvailabilityNote availability={availability} />

      <div className="mt-8 rounded-2xl bg-[#f5f5f7] p-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
          Orders go to
        </p>
        <div className="mt-3.5 flex flex-col gap-3">
          <input
            value={orderEmail}
            onChange={(e) => onOrderEmail(e.target.value)}
            type="email"
            placeholder="orders@yourcompany.com"
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 py-2.5 text-[15px] outline-none"
          />
          <p className="text-[13px] leading-[1.5] text-[#6e6e73]">
            Every order is also kept in your dashboard inbox and can be exported as CSV.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {[
          { label: "Items", value: String(itemCount) },
          { label: "Template", value: templateName },
          { label: "Plan", value: `Trial · ${trialDaysLeft} days left` },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between border-b border-[#f0f0f4] pb-2 text-sm"
          >
            <span className="text-[#6e6e73]">{row.label}</span>
            <span className="font-medium text-[#1d1d1f]">{row.value}</span>
          </div>
        ))}
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg bg-[#fdecea] px-3.5 py-2.5 text-[13px] text-[#b2432b]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function AvailabilityNote({ availability }: { availability: SlugAvailability }) {
  if (availability === "checking") {
    return <p className="mt-2.5 text-[13px] text-[#86868b]">Checking…</p>;
  }
  if (availability === "available") {
    return <p className="mt-2.5 text-[13px] text-[#1e9e4a]">Available</p>;
  }
  if (availability === "taken") {
    return <p className="mt-2.5 text-[13px] text-[#b2432b]">That address is taken</p>;
  }
  if (availability === "invalid") {
    return (
      <p className="mt-2.5 text-[13px] text-[#b2432b]">
        Use lowercase letters, numbers and dashes only
      </p>
    );
  }
  return null;
}
