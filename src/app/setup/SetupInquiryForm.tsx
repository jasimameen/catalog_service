"use client";

import { useEffect, useState } from "react";
import { CompanyContact } from "@/components/brand/CompanyContact";
import {
  COUNTRIES,
  detectClientCountry,
  isKnownCountry,
} from "@/lib/inquiries/countries";
import { submitSetupInquiry } from "./actions";

const field =
  "min-h-11 w-full rounded-[12px] border border-[var(--cat-border)] bg-[var(--cat-surface)] px-3.5 text-[15px] text-[var(--cat-ink)] outline-none focus:border-[var(--cat-accent)]";
const label = "mb-1.5 block text-[13px] font-medium text-[var(--cat-ink)]";
const hint = "mt-1 text-[12px] leading-snug text-[var(--cat-muted)]";

type BusinessType = "restaurant" | "retail" | "other";
type ReserveNeed = "" | "yes" | "no" | "not_sure";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function SetupInquiryForm({ suggestedCountry = "" }: { suggestedCountry?: string }) {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [country, setCountry] = useState(suggestedCountry);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [needReservations, setNeedReservations] = useState<ReserveNeed>("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (country) return;
    const next = suggestedCountry || detectClientCountry();
    if (next) setCountry(next);
  }, [suggestedCountry, country]);

  function validate(): string {
    if (!businessName.trim()) return "Tell us the business name.";
    if (!country.trim()) return "Choose a country.";
    if (!email.trim() && !phone.trim() && !whatsapp.trim()) {
      return "Add email, phone, or WhatsApp — at least one.";
    }
    if (email.trim() && !isEmail(email.trim())) return "Add a working email.";
    if (!isOptionalUrl(website.trim())) return "Website should start with https://";
    if (!isOptionalUrl(mapsUrl.trim())) return "Maps link should start with https://";
    return "";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const message = validate();
    if (message) {
      setStatus("error");
      setError(message);
      return;
    }
    setStatus("sending");
    setError("");
    const formData = new FormData(event.currentTarget);
    formData.set("business_name", businessName.trim());
    formData.set("business_type", businessType);
    formData.set("country", country.trim());
    formData.set("email", email.trim());
    formData.set("phone", phone.trim());
    formData.set("whatsapp", whatsapp.trim());
    formData.set("website", website.trim());
    formData.set("maps_url", mapsUrl.trim());
    formData.set("need_reservations", businessType === "restaurant" ? needReservations : "");
    formData.set("notes", notes.trim());
    const result = await submitSetupInquiry(formData);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-6 sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-accent)]">
          Inquiry received
        </p>
        <h2 className="font-catalog-display mt-2 text-[28px] font-semibold tracking-tight">
          We have it.
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--cat-muted)]">
          We’ll set up your dashboard and write back.
        </p>
        <CompanyContact className="mt-4 text-[14px] text-[var(--cat-muted)]" />
      </div>
    );
  }

  const countryOptions = COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" />

      <section className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-5 sm:p-7">
        <h2 className="font-catalog-display text-[22px] font-semibold tracking-tight">The place</h2>
        <div className="mt-5 flex flex-col gap-4">
          <label>
            <span className={label}>Business name</span>
            <input
              name="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Harbor Kitchen"
              className={field}
            />
          </label>
          <fieldset>
            <legend className={label}>Type</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["restaurant", "Restaurant"],
                  ["retail", "Retail"],
                  ["other", "Other"],
                ] as const
              ).map(([value, title]) => (
                <label
                  key={value}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--cat-border)] bg-[var(--cat-bg)] px-4 text-[13px] has-[:checked]:border-[var(--cat-accent)] has-[:checked]:bg-[#eef4fd]"
                >
                  <input
                    type="radio"
                    name="business_type"
                    value={value}
                    checked={businessType === value}
                    onChange={() => setBusinessType(value)}
                  />
                  {title}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            <span className={label}>Country</span>
            <select
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={field}
            >
              <option value="">Select a country</option>
              {suggestedCountry && !isKnownCountry(suggestedCountry) ? (
                <option value={suggestedCountry}>{suggestedCountry}</option>
              ) : null}
              {country && !isKnownCountry(country) && country !== suggestedCountry ? (
                <option value={country}>{country}</option>
              ) : null}
              {countryOptions.map((row) => (
                <option key={row.code} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-5 sm:p-7">
        <h2 className="font-catalog-display text-[22px] font-semibold tracking-tight">How we reach you</h2>
        <p className={hint}>Email, phone, or WhatsApp — at least one.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Phone</span>
            <input
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 …"
              className={field}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>WhatsApp</span>
            <input
              name="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+1 …"
              className={field}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-5 sm:p-7">
        <h2 className="font-catalog-display text-[22px] font-semibold tracking-tight">Links and files</h2>
        <div className="mt-5 flex flex-col gap-4">
          <label>
            <span className={label}>Website</span>
            <input
              name="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Google Maps link</span>
            <input
              name="maps_url"
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/…"
              className={field}
            />
            <span className={hint}>Optional. Helps us pin the shop.</span>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className={label}>Menu (PDF or photos)</span>
              <input
                name="menu"
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="block w-full text-[13px] text-[var(--cat-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--cat-bg)] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
              />
            </label>
            <label>
              <span className={label}>Logo</span>
              <input
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-[13px] text-[var(--cat-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--cat-bg)] file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-[var(--cat-ink)]"
              />
            </label>
          </div>
          <p className={hint}>PDF or JPG / PNG / WebP. Up to 8 files, 6 MB each.</p>
        </div>
      </section>

      {businessType === "restaurant" ? (
        <section className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-5 sm:p-7">
          <h2 className="font-catalog-display text-[22px] font-semibold tracking-tight">Reservations</h2>
          <fieldset className="mt-4">
            <legend className={label}>Need table reservations?</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["not_sure", "Not sure"],
                ] as const
              ).map(([value, title]) => (
                <label
                  key={value}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--cat-border)] bg-[var(--cat-bg)] px-4 text-[13px] has-[:checked]:border-[var(--cat-accent)] has-[:checked]:bg-[#eef4fd]"
                >
                  <input
                    type="radio"
                    name="need_reservations"
                    value={value}
                    checked={needReservations === value}
                    onChange={() => setNeedReservations(value)}
                  />
                  {title}
                </label>
              ))}
            </div>
            <p className={hint}>Optional. We turn reserve on when we build. You can hide it later in settings.</p>
          </fieldset>
        </section>
      ) : null}

      <section className="rounded-[20px] border border-[var(--cat-border)] bg-[var(--cat-surface)] p-5 sm:p-7">
        <label>
          <span className={label}>Notes</span>
          <textarea
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know — one line is enough."
            className={`${field} min-h-[4.5rem] py-2.5`}
          />
        </label>
      </section>

      {error ? <p className="text-[14px] text-[#b2432b]">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 rounded-full bg-[var(--cat-accent)] px-6 text-[15px] font-medium text-[var(--cat-surface)] disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send — we’ll set it up"}
      </button>
    </form>
  );
}
