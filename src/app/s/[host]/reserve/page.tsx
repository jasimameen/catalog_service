import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { darken } from "@/lib/catalog/color";
import { loadStorefrontCatalog } from "@/lib/catalog/load-storefront";
import { storefrontMetadata } from "@/lib/seo/catalog-meta";
import { ShopPausedNotice } from "@/components/storefront/ShopPausedNotice";
import { catalogStorefrontLive } from "@/lib/billing/account-access";
import { ReserveClient } from "./ReserveClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  return storefrontMetadata(await loadStorefrontCatalog(host), { titleExtra: "Reserve" });
}

export default async function ReservePage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const catalog = await loadStorefrontCatalog(host);
  if (!catalog) notFound();
  if (!(await catalogStorefrontLive(catalog.id))) {
    return <ShopPausedNotice name={catalog.name} accent={catalog.accent} />;
  }
  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;
  return (
    <div style={style}>
      <ReserveClient catalog={catalog} />
    </div>
  );
}
