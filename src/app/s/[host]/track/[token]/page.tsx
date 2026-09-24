import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveCatalogByHost } from "@/lib/catalog/resolve";
import { darken } from "@/lib/catalog/color";
import { GuestTrackClient } from "@/components/storefront/GuestTrackClient";

export const dynamic = "force-dynamic";

function decodeHost(hostParam: string): string {
  try {
    return decodeURIComponent(hostParam);
  } catch {
    return hostParam;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) {
    return { title: { absolute: "Track" }, robots: { index: false, follow: false } };
  }
  try {
    const catalog = await resolveCatalogByHost(decodeHost(host));
    if (!catalog) return { title: { absolute: "Track" }, robots: { index: false, follow: false } };
    return {
      title: { absolute: `Track — ${catalog.name}` },
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: { absolute: "Track" }, robots: { index: false, follow: false } };
  }
}

export default async function TrackTicketPage({
  params,
}: {
  params: Promise<{ host: string; token: string }>;
}) {
  if (!isSupabaseConfigured() || !hasSupabaseSecretKey()) notFound();

  const { host: hostParam, token } = await params;
  const host = decodeHost(hostParam);
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length < 8) notFound();

  const catalog = await resolveCatalogByHost(host);
  if (!catalog) notFound();

  const supabase = getServiceClient();
  const [{ data: order }, { data: reservation }] = await Promise.all([
    supabase.from("orders").select("id").eq("catalog_id", catalog.id).eq("track_token", cleanToken).maybeSingle(),
    supabase.from("reservations").select("id").eq("catalog_id", catalog.id).eq("track_token", cleanToken).maybeSingle(),
  ]);
  if (!order && !reservation) notFound();

  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;

  return (
    <div style={style} className="min-h-dvh bg-[var(--cat-bg)] text-[var(--cat-ink)]">
      <GuestTrackClient
        host={host}
        token={cleanToken}
        shopName={catalog.name}
        shopPhone={catalog.phone}
        accent={catalog.accent}
        currency={catalog.currency}
      />
    </div>
  );
}
