"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  /** Active match should also cover nested routes under this href. */
  exact?: boolean;
};

/**
 * Sidebar (becomes a horizontal top bar under md, via the parent's flex
 * classes) navigation. Reads the current path client-side to (a) know which
 * item is active and (b) know whether we're inside a catalog — the
 * Dashboard/Orders/Items/Share/Domains group only makes sense there, matching the
 * design's single-page "screen" nav collapsed into real routes.
 */
export function AdminNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["admin", ...]
  const second = segments[1];
  const inCatalog = Boolean(second) && second !== "settings";
  const catalogId = inCatalog ? second : null;

  const items: NavItem[] = [{ label: "Catalogs", href: "/admin", exact: true }];

  if (catalogId) {
    items.push(
      { label: "Dashboard", href: `/admin/${catalogId}`, exact: true },
      { label: "Orders", href: `/admin/${catalogId}/orders` },
      { label: "Items", href: `/admin/${catalogId}/items` },
      { label: "Share", href: `/admin/${catalogId}/share` },
      { label: "Domains", href: `/admin/${catalogId}/domains` },
    );
  }

  items.push({ label: "Settings", href: "/admin/settings" });

  return (
    <nav className="flex flex-1 gap-0.5 overflow-x-auto md:flex-none md:flex-col">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] ${
              active
                ? "bg-white font-semibold text-[var(--cat-ink)]"
                : "font-normal text-[#424245] hover:bg-white/60"
            }`}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
