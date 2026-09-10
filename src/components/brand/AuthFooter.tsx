import { COMPANY_NAME, COMPANY_URL, CONTACT_EMAIL } from "@/lib/brand";

export function AuthFooter() {
  return (
    <p className="mt-10 text-center text-xs text-[#86868b]">
      <a href={COMPANY_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
        Powered by {COMPANY_NAME}
      </a>
      <span> · </span>
      <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
        Questions? {CONTACT_EMAIL}
      </a>
    </p>
  );
}
