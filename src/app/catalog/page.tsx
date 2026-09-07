import { CatalogClient } from "./CatalogClient";
import { CartPanel } from "./CartPanel";

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">
          Kleaner
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Cleaning Supplies Catalogue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tap a product to add it to your cart, then place your order — we&apos;ll be in touch to confirm.
        </p>
      </header>
      <CatalogClient />
      <CartPanel />
    </main>
  );
}
