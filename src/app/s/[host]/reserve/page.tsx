import type { CSSProperties } from "react";
import { cache } from "react";
import { notFound } from "next/navigation";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { ReserveClient } from "./ReserveClient";

export const dynamic = "force-dynamic";

function decodeHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
}

const loadCatalog = cache(async (hostParam: string) => {
  const host = decodeHost(hostParam);
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) return null;
  try {
    return await resolveCatalogByHost(host);
  } catch {
    return null;
  }
});

export default async function ReservePage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const catalog = await loadCatalog(host);
  if (!catalog) notFound();
  if (!catalog.settings.restaurant.enableReserve) notFound();
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
