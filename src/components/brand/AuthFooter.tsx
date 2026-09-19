import { CompanyContact } from "@/components/brand/CompanyContact";
import { COMPANY_NAME, COMPANY_URL } from "@/lib/brand";

export function AuthFooter() {
  return (
    <div className="mt-10 text-center text-xs text-[var(--cat-muted)]">
      <p>
        <a href={COMPANY_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Powered by {COMPANY_NAME}
        </a>
      </p>
      <CompanyContact className="mt-2" />
    </div>
  );
}
