import type { SetupInquiryFile, SetupInquiryRow } from "@/lib/supabase/types";

/** Fields that land on catalogs.logo / tagline / about when a concierge shop is built. */
export function catalogBrandingFromInquiry(inquiry: SetupInquiryRow): {
  name: string;
  tagline: string;
  about: string;
  logoFile: SetupInquiryFile | null;
} {
  const files = Array.isArray(inquiry.files) ? inquiry.files : [];
  const logoFile = files.find((file) => file.kind === "logo") ?? null;
  const place = [inquiry.city, inquiry.country].map((part) => part.trim()).filter(Boolean);
  const about = inquiry.notes.trim();
  return {
    name: inquiry.business_name.trim() || "Catalog",
    tagline: place.join(" · "),
    about,
    logoFile,
  };
}
