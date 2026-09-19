import { CONTACT_EMAIL, CONTACT_WHATSAPP_DISPLAY, CONTACT_WHATSAPP_HREF } from "@/lib/brand";

export function CompanyContact({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      Talk to us ·{" "}
      <a
        href={CONTACT_WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[var(--cat-ink)] underline-offset-2 hover:underline"
      >
        WhatsApp {CONTACT_WHATSAPP_DISPLAY}
      </a>
      {" · "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[var(--cat-ink)] underline-offset-2 hover:underline">
        {CONTACT_EMAIL}
      </a>
    </p>
  );
}
