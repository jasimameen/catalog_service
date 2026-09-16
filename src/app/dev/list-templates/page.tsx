import type { CSSProperties } from "react";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import type { CatalogTemplateKey } from "@/lib/catalog/types";

const ALLOWED: CatalogTemplateKey[] = ["menu", "compact", "pricelist"];

export default async function ListTemplatePreview({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const template = ALLOWED.includes(t as CatalogTemplateKey) ? (t as CatalogTemplateKey) : "menu";
  const catalog = await resolveCatalogByHost("teaday");
  if (!catalog) return <p className="p-6 text-sm">Catalog not found.</p>;
  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;
  return (
    <div style={style}>
      <StorefrontApp catalog={{ ...catalog, template }} />
    </div>
  );
}
