import { mailtoHref, telHref } from "@/lib/catalog/merchandising";
import type { StorefrontCatalog } from "@/lib/catalog/types";

export function HeaderContact({ catalog }: { catalog: StorefrontCatalog }) {
  const hours = catalog.showHours ? catalog.hours.trim() : "";
  const phone = catalog.showContact ? catalog.phone.trim() : "";
  const email = catalog.showContact ? catalog.email.trim() : "";
  if (!hours && !phone && !email) return null;

  const tel = telHref(phone);
  const mail = mailtoHref(email);
  const hoursLine = hours.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? hours;

  return (
    <div className="hidden min-w-0 max-w-[220px] text-right text-[11px] leading-snug text-[var(--cat-muted)] @md:block">
      {hoursLine ? <p className="m-0 truncate font-medium text-[var(--cat-ink)]">{hoursLine}</p> : null}
      {phone ? (
        tel ? (
          <a href={tel} className="block truncate text-[var(--cat-accent)] hover:underline">
            {phone}
          </a>
        ) : (
          <p className="m-0 truncate">{phone}</p>
        )
      ) : null}
      {email ? (
        mail ? (
          <a href={mail} className="block truncate hover:underline">
            {email}
          </a>
        ) : (
          <p className="m-0 truncate">{email}</p>
        )
      ) : null}
    </div>
  );
}
