"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type NavItem = {
  label: string;
  href: string;
  /** Active match should also cover nested routes under this href. */
  exact?: boolean;
};

/**
 * Desktop: vertical sidebar list.
 * Mobile: horizontally scrolling pill bar from the design pack
 * (Admin Dashboard / Orders / Items).
 */
export function AdminNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["admin", ...]
  const second = segments[1];
  const inCatalog = Boolean(second) && second !== "settings";
  const catalogId = inCatalog ? second : null;
  const scrollerRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector<HTMLElement>("[data-nav-active='true']");
    if (!scroller || !active) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = active.offsetLeft - scroller.clientWidth / 2 + active.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: reduced ? "instant" : "smooth" });
  }, [pathname]);

  return (
    <nav
      ref={scrollerRef}
      aria-label="Admin"
      className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-nav-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 touch-manipulation items-center px-3.5 text-[13px] transition-colors duration-150 md:px-3 md:text-[14px] ${
              active
                ? "rounded-full border border-[var(--cat-ink)] bg-[var(--cat-ink)] font-medium text-white md:rounded-[9px] md:border-transparent md:bg-[#eef1f6] md:text-[var(--cat-ink)]"
                : "rounded-full border border-[#e2e7ee] bg-white font-normal text-[#5a6472] hover:border-[#c3ccd9] md:rounded-[9px] md:border-transparent md:bg-transparent md:hover:bg-[#f0f2f6] md:hover:text-[var(--cat-ink)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
