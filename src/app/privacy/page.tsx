import type { Metadata } from "next";
import { CONTACT_EMAIL, COMPANY_NAME, PRODUCT_NAME_LONG } from "@/lib/brand";
import { LegalDoc } from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${PRODUCT_NAME_LONG} collects and why.`,
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy" updated="Short version · September 2026">
      <p>
        {COMPANY_NAME} runs {PRODUCT_NAME_LONG}. We collect what we need to run your shop and send
        you mail about it — not a profile for ads.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>Your sign-in email, company name, and password hash (via our auth provider).</li>
        <li>Catalog content you add: items, photos, hours, floor, settings.</li>
        <li>Orders and reservations guests place, including the details they type at checkout.</li>
        <li>Basic shop views (a count, not a guest profile).</li>
      </ul>

      <h2>Why</h2>
      <p>
        To show the live menu, notify you of orders, send account mail (sign-in codes, password
        reset), and bill the subscription. We use a payment provider for cards and an email provider
        to send messages. They only get what that job needs.
      </p>

      <h2>How long</h2>
      <p>
        Account and catalog data stay while the account is open. If you want it removed, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--cat-ink)] underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--cat-ink)] underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalDoc>
  );
}
