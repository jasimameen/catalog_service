import type { Metadata } from "next";
import type { StorefrontCatalog } from "@/lib/catalog/types";

export type CatalogSeoSource = Pick<StorefrontCatalog, "name" | "tagline" | "about" | "logo" | "accent">;

export function catalogPlainDescription(catalog: CatalogSeoSource): string {
  const about = catalog.about.trim();
  if (about) return about.slice(0, 200);
  const tag = catalog.tagline.trim();
  if (tag) return tag.slice(0, 200);
  return `${catalog.name} live catalog.`;
}

export function storefrontMetadata(
  catalog: CatalogSeoSource | null,
  opts?: { titleExtra?: string },
): Metadata {
  if (!catalog) {
    return {
      title: { absolute: "Catalog not found" },
      robots: { index: false, follow: false },
    };
  }

  const title = opts?.titleExtra ? `${opts.titleExtra} — ${catalog.name}` : catalog.name;
  const description = catalogPlainDescription(catalog);
  const logo = catalog.logo.trim();

  return {
    title: { absolute: title },
    description,
    applicationName: catalog.name,
    robots: { index: false, follow: false },
    icons: logo
      ? {
          icon: [{ url: logo }],
          apple: [{ url: logo }],
        }
      : undefined,
    openGraph: {
      title,
      description,
      siteName: catalog.name,
      type: "website",
      images: logo ? [{ url: logo, alt: catalog.name }] : undefined,
    },
    twitter: {
      card: logo ? "summary" : "summary_large_image",
      title,
      description,
      images: logo ? [logo] : undefined,
    },
  };
}
