import type { ReactNode } from "react";
import { TEMPLATES_DESCRIPTION, TEMPLATES_TITLE, marketingMetadata } from "@/lib/seo/marketing";

export const metadata = marketingMetadata({
  title: TEMPLATES_TITLE,
  description: TEMPLATES_DESCRIPTION,
  path: "/templates",
});

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return children;
}
