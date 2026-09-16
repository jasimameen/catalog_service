import { COMPANY_NAME, COMPANY_URL } from "@/lib/brand";
import {
  instagramHandle,
  instagramHref,
  mailtoHref,
  telHref,
  whatsappHref,
} from "@/lib/catalog/merchandising";
import { osmEmbedSrc } from "@/lib/catalog/locations";
import type { StorefrontCatalog } from "@/lib/catalog/types";

export function StorefrontFooter({ catalog }: { catalog: StorefrontCatalog }) {
  const phone = catalog.showContact ? catalog.phone.trim() : "";
  const email = catalog.showContact ? catalog.email.trim() : "";
  const address = catalog.showContact ? catalog.address.trim() : "";
  const hours = catalog.showHours ? catalog.hours.trim() : "";
  const locations = catalog.locations;
  const wa = catalog.showSocial ? whatsappHref(catalog.whatsapp) : null;
  const ig = catalog.showSocial ? instagramHref(catalog.instagram) : null;
  const waLabel = catalog.whatsapp.trim();
  const igLabel = instagramHandle(catalog.instagram);
  const tel = telHref(phone);
  const mail = mailtoHref(email);
  const showMap =
    catalog.showMap && catalog.geoLat != null && catalog.geoLng != null;
  const hasContact = Boolean(phone || email || address);
  const hasHours = Boolean(hours);
  const hasLocations = locations.length > 0;
  const hasSocial = Boolean(wa || ig);
  const hasInfo = hasContact || hasHours || hasLocations || hasSocial || showMap;

  return (
    <footer className="border-t border-[var(--cat-border)] bg-[#fbfbfd] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {hasInfo ? (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hasContact ? (
              <div>
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  Contact
                </p>
                <p className="mt-2 text-[14px] font-semibold text-[var(--cat-ink)]">{catalog.name}</p>
                {address ? <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{address}</p> : null}
                {phone ? (
                  tel ? (
                    <a href={tel} className="mt-1 block text-[13px] text-[var(--cat-accent)] hover:underline">
                      {phone}
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] text-[var(--cat-muted)]">{phone}</p>
                  )
                ) : null}
                {email ? (
                  mail ? (
                    <a href={mail} className="mt-1 block text-[13px] text-[var(--cat-accent)] hover:underline">
                      {email}
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] text-[var(--cat-muted)]">{email}</p>
                  )
                ) : null}
              </div>
            ) : null}

            {hasHours ? (
              <div>
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  Hours
                </p>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[var(--cat-ink)]">
                  {hours}
                </p>
              </div>
            ) : null}

            {hasLocations || showMap ? (
              <div>
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  Locations
                </p>
                {hasLocations ? (
                  <ul className="mt-2 list-none space-y-2 p-0">
                    {locations.map((row) => (
                      <li key={`${row.name}-${row.phone}`} className="text-[13px] leading-snug">
                        <span className="font-medium text-[var(--cat-ink)]">{row.name}</span>
                        {row.phone ? (
                          <span className="mt-0.5 block text-[var(--cat-muted)]">{row.phone}</span>
                        ) : null}
                        {row.address ? (
                          <span className="mt-0.5 block text-[var(--cat-muted)]">{row.address}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {showMap && catalog.geoLat != null && catalog.geoLng != null ? (
                  <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--cat-border)]">
                    <iframe
                      title="Shop location"
                      src={osmEmbedSrc(catalog.geoLat, catalog.geoLng)}
                      className="h-40 w-full border-0"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasSocial ? (
              <div>
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                  Social
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--cat-ink)] hover:underline"
                    >
                      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-[11px] font-bold text-white">
                        WA
                      </span>
                      {waLabel || "WhatsApp"}
                    </a>
                  ) : null}
                  {ig ? (
                    <a
                      href={ig}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--cat-ink)] hover:underline"
                    >
                      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">
                        IG
                      </span>
                      {igLabel || "Instagram"}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-[11px] tracking-wide text-[var(--cat-muted)] print:hidden">
          <a
            href={COMPANY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Powered by {COMPANY_NAME}
          </a>
          {catalog.usedPlaceholderImages ? (
            <span className="mt-1 block text-[10px]">Some photos via Unsplash</span>
          ) : null}
        </p>
      </div>
    </footer>
  );
}
