import type { Metadata } from "next";
import { CONTACT_EMAIL, COMPANY_NAME, PRODUCT_NAME_LONG } from "@/lib/brand";
import { LegalDoc } from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "Terms",
  description: `How ${PRODUCT_NAME_LONG} works — what we host, what you own, and how to reach us.`,
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms" updated="Short version · September 2026">
      <p>
        {PRODUCT_NAME_LONG} is a hosted menu, QR, and orders product from {COMPANY_NAME}. You get a
        live shop on a link. Guests can browse, order, reserve, or scan a table QR. You run it from
        the dashboard.
      </p>

      <h2>Your catalog</h2>
      <p>
        You own the names, prices, photos, and copy you put in a catalog. We host them so guests can
        see the shop and send orders. If you leave, that content is still yours — we just stop
        hosting the live link.
      </p>

      <h2>Use</h2>
      <ul>
        <li>Don’t sell anything illegal, or pretend to be another business.</li>
        <li>Don’t spam people through orders or the setup form.</li>
        <li>We can pause a shop that breaks this, or that we can’t keep running.</li>
      </ul>

      <h2>The service</h2>
      <p>
        We try to keep shops up. We don’t promise 100% uptime, and a trial or unpaid plan can pause
        the public shop until you subscribe. Orders already placed stay in the dashboard.
      </p>
      <p>
        Billing is a monthly subscription after a free trial. Cancel any time from the payment
        provider. Prices on the site are the current offer — we may change them for new sign-ups.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or a problem:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--cat-ink)] underline">
          {CONTACT_EMAIL}
        </a>
        . Signed-in users can also send a note from Account → Report an issue.
      </p>
    </LegalDoc>
  );
}
