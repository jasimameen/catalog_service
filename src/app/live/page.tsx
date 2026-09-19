import type { CSSProperties } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { darken } from "@/lib/catalog/color";
import { loadHarborDemoCatalog } from "@/lib/catalog/load-harbor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Harbor Kitchen — Instant Catalog demo",
  description:
    "A sample Brooklyn restaurant catalog. Live menu, dine-in QR, pickup, delivery, and reserve.",
  robots: { index: false, follow: false },
};

export default async function LiveDemoPage() {
  const { catalog } = await loadHarborDemoCatalog();
  const style = {
    "--cat-accent": catalog.accent,
    "--cat-accent-dark": darken(catalog.accent),
  } as CSSProperties;

  return (
    <div style={style}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cat-border)] bg-[var(--cat-surface)] px-4 py-2 text-[12px] text-[var(--cat-muted)]">
        <p>
          This is a demo
          <span className="text-[var(--cat-ink)]"> · Instant Catalog</span>
        </p>
        <Link href="/auth/sign-up" className="font-medium text-[var(--cat-accent)]">
          Start yours
        </Link>
      </div>
      <Suspense fallback={null}>
        <StorefrontApp catalog={catalog} />
      </Suspense>
    </div>
  );
}
