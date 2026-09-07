"use client";

import { useMemo, useState } from "react";
import { PRODUCTS, type Product } from "@/data/catalog-products";
import { GROUP_ORDER, groupForCategory } from "@/lib/catalog/categories";
import { ProductCard } from "./ProductCard";
import { CartButton } from "./CartButton";
import { ProductDetailModal } from "./ProductDetailModal";

export function CatalogClient({ onOpenCart }: { onOpenCart: () => void }) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [selected, setSelected] = useState<Product | null>(null);

  const groups = useMemo(() => {
    const present = new Set(PRODUCTS.map((p) => groupForCategory(p.category)));
    return ["All", ...GROUP_ORDER.filter((g) => present.has(g))];
  }, []);

  const bySection = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = PRODUCTS.filter((p) => {
      if (!q) return true;
      return (
        p.category.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });

    const sections = new Map<string, typeof PRODUCTS>();
    for (const product of matches) {
      const group = groupForCategory(product.category);
      if (activeGroup !== "All" && group !== activeGroup) continue;
      if (!sections.has(group)) sections.set(group, []);
      sections.get(group)!.push(product);
    }
    return GROUP_ORDER.filter((g) => sections.has(g)).map((g) => ({
      group: g,
      items: sections.get(g)!,
    }));
  }, [query, activeGroup]);

  const totalMatches = bySection.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[var(--kl-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-catalog-display text-xl font-bold text-[var(--kl-blue)]">
              KLEANER
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--kl-muted)]">
              Trade Catalogue
            </span>
          </div>
          <CartButton onClick={onOpenCart} />
        </div>
        <div className="mx-auto max-w-6xl space-y-3 px-4 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kl-muted)]">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or item code"
              className="w-full rounded-[9px] border border-[var(--kl-border)] bg-white py-2 pl-9 pr-3 text-sm focus:border-[var(--kl-blue)] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  activeGroup === group
                    ? "bg-[var(--kl-ink)] text-white"
                    : "border border-[var(--kl-border)] bg-white text-[var(--kl-muted)] hover:bg-slate-50"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {totalMatches === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--kl-muted)]">
            No products match your search.
          </p>
        ) : (
          <div className="space-y-8 pb-28">
            {bySection.map(({ group, items }) => (
              <section key={group}>
                <div className="mb-3 flex items-baseline gap-2 border-b border-[var(--kl-border)] pb-2">
                  <h2 className="font-catalog-display text-lg font-bold text-[var(--kl-ink)]">
                    {group}
                  </h2>
                  <span className="text-sm text-[var(--kl-muted)]">{items.length} items</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((product) => (
                    <ProductCard key={product.code} product={product} onSelect={setSelected} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ProductDetailModal product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
