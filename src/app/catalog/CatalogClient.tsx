"use client";

import { useMemo, useState } from "react";
import { PRODUCTS } from "@/data/catalog-products";
import { GROUP_ORDER, groupForCategory } from "@/lib/catalog/categories";
import { ProductCard } from "./ProductCard";

export function CatalogClient() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("All");

  const groups = useMemo(() => {
    const present = new Set(PRODUCTS.map((p) => groupForCategory(p.category)));
    return ["All", ...GROUP_ORDER.filter((g) => present.has(g))];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const inGroup = activeGroup === "All" || groupForCategory(p.category) === activeGroup;
      if (!inGroup) return false;
      if (!q) return true;
      return (
        p.category.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [query, activeGroup]);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-4 space-y-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeGroup === group
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">
          No products match your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
