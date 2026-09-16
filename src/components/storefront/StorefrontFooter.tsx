import { PRODUCT_NAME, PRODUCT_URL } from "@/lib/brand";
import { instagramHref, telHref, whatsappHref } from "@/lib/catalog/merchandising";
import type { StorefrontCatalog } from "@/lib/catalog/types";

export function StorefrontFooter({ catalog }: { catalog: StorefrontCatalog }) {
  const phone = catalog.phone.trim();
  const address = catalog.address.trim();
  const hours = catalog.hours.trim();
  const wa = whatsappHref(catalog.whatsapp);
  const ig = instagramHref(catalog.instagram);
  const tel = telHref(phone);
  const hasInfo = Boolean(phone || address || hours || wa || ig);

  return (
    <footer className="border-t border-[var(--cat-border)] bg-[#fbfbfd] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        {hasInfo ? (
          <div className="mb-6 space-y-2 text-[13px] leading-relaxed text-[var(--cat-ink)]">
            <p className="font-semibold">{catalog.name}</p>
            {address ? <p className="text-[var(--cat-muted)]">{address}</p> : null}
            {hours ? <p className="whitespace-pre-line text-[var(--cat-muted)]">{hours}</p> : null}
            {phone ? (
              tel ? (
                <p>
                  <a href={tel} className="text-[var(--cat-accent)] underline-offset-2 hover:underline">
                    {phone}
                  </a>
                </p>
              ) : (
                <p className="text-[var(--cat-muted)]">{phone}</p>
              )
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25D366] px-3.5 py-1.5 text-[12px] font-semibold text-white"
                >
                  WhatsApp
                </a>
              ) : null}
              {ig ? (
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[var(--cat-border)] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[var(--cat-ink)]"
                >
                  Instagram
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
        <p className="text-[11px] tracking-wide text-[var(--cat-muted)] print:hidden">
          <a
            href={PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Powered by {PRODUCT_NAME}
          </a>
        </p>
      </div>
    </footer>
  );
}
