"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { catalogNavLabel } from "@/app/admin/[catalogId]/actions";

type NavItem = {
  label: string;
  href: string;
  /** Active match should also cover nested routes under this href. */
  exact?: boolean;
  icon: () => ReactNode;
};

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.99" y="2.4" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.4" y="8.99" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.99" y="8.99" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.6 7.1 8 2.7l5.4 4.4V13a.9.9 0 0 1-.9.9H3.5A.9.9 0 0 1 2.6 13V7.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.2 13.9V9.1h3.6v4.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4.2 2.6h7.6v10.8H4.2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 5.5h4M6 8h4M6 10.5h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconItems() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.2 5.1 8 2.7l4.8 2.4v6.2L8 13.6l-4.8-2.3V5.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 8.1v5.4M3.2 5.1 8 8.1l4.8-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IconFloor() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.4v11.2M2.4 8h11.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="12.1" cy="3.7" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="3.9" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12.1" cy="12.3" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      <path d="m5.4 7.2 5-2.4M5.4 8.8l5 2.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconDomains() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.1 6.4h9.8M3.1 9.6h9.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 2.4c-1.7 1.8-2.5 3.7-2.5 5.6s.8 3.8 2.5 5.6c1.7-1.8 2.5-3.7 2.5-5.6S9.7 4.2 8 2.4Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.6 4.2h10.8v8.2H2.6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M2.6 4.2 8 8.4l5.4-4.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IconOps() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="3.1" width="11.2" height="9.8" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6.2h6M5 8.6h4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.4" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.4 13.2c.5-2.3 2.2-3.6 4.6-3.6s4.1 1.3 4.6 3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 2.5v1.4M8 12.1v1.4M2.5 8h1.4M12.1 8h1.4M4.1 4.1l1 1M10.9 10.9l1 1M11.9 4.1l-1 1M5.1 10.9l-1 1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Desktop: vertical sidebar list (labels, or icons when the rail is collapsed).
 * Mobile: horizontally scrolling pill bar from the design pack
 * (Admin Dashboard / Orders / Items).
 */
export function AdminNav({
  collapsed = false,
  showInquiries = false,
  showOps = false,
}: {
  collapsed?: boolean;
  showInquiries?: boolean;
  showOps?: boolean;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["admin", ...]
  const second = segments[1];
  const reserved =
    second === "settings" || second === "account" || second === "inquiries" || second === "ops";
  const inCatalog = Boolean(second) && !reserved;
  const catalogId = inCatalog ? second : null;
  const scrollerRef = useRef<HTMLElement>(null);
  const [shopLabel, setShopLabel] = useState("This shop");

  const rootItems: NavItem[] = [{ label: "Catalogs", href: "/admin", exact: true, icon: IconGrid }];

  const catalogItems: NavItem[] = catalogId
    ? [
        { label: "Dashboard", href: `/admin/${catalogId}`, exact: true, icon: IconHome },
        { label: "Orders", href: `/admin/${catalogId}/orders`, icon: IconOrders },
        { label: "Items", href: `/admin/${catalogId}/items`, icon: IconItems },
        { label: "Floor", href: `/admin/${catalogId}/floor`, icon: IconFloor },
        { label: "Settings", href: `/admin/${catalogId}#settings`, exact: true, icon: IconSettings },
        { label: "Share", href: `/admin/${catalogId}/share`, icon: IconShare },
        { label: "Domains", href: `/admin/${catalogId}/domains`, icon: IconDomains },
      ]
    : [];

  const accountItems: NavItem[] = [
    ...(showOps ? [{ label: "Ops", href: "/admin/ops", icon: IconOps } satisfies NavItem] : []),
    ...(showInquiries
      ? [{ label: "Inquiries", href: "/admin/inquiries", icon: IconInbox } satisfies NavItem]
      : []),
    { label: "Account", href: "/admin/account", icon: IconAccount },
    { label: "Settings", href: "/admin/settings", icon: IconSettings },
  ];

  useEffect(() => {
    if (!catalogId) {
      setShopLabel("This shop");
      return;
    }
    let cancelled = false;
    void catalogNavLabel(catalogId).then((name) => {
      if (!cancelled && name) setShopLabel(name);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId]);

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
      className={`-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 ${
        collapsed ? "md:items-center" : ""
      }`}
    >
      {rootItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
      ))}

      {catalogId ? (
        <>
          <p className="hidden md:block md:mt-3 md:mb-1 md:px-3 md:text-[11px] md:font-semibold md:uppercase md:tracking-[0.08em] md:text-[#8a93a2] md:group-data-[collapsed=true]/shell:sr-only">
            {shopLabel}
          </p>
          <span className="self-center px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b] md:hidden">
            {shopLabel}
          </span>
          <div className="flex shrink-0 gap-1.5 md:ml-3 md:flex-col md:gap-0.5 md:border-l md:border-[#e2e7ee] md:pl-2.5 md:group-data-[collapsed=true]/shell:ml-0 md:group-data-[collapsed=true]/shell:border-l-0 md:group-data-[collapsed=true]/shell:pl-0">
            {catalogItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                nested
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="hidden md:my-2 md:block md:h-px md:bg-[#e2e7ee] md:group-data-[collapsed=true]/shell:w-8" />

      {accountItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
      ))}
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  collapsed,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  nested?: boolean;
}) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      data-nav-active={active ? "true" : undefined}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`ops-press flex min-h-11 shrink-0 touch-manipulation items-center px-3.5 transition-colors duration-150 md:px-3 ${
        nested ? "text-[13px] md:text-[13px]" : "text-[13px] md:text-[14px]"
      } ${collapsed ? "md:w-11 md:justify-center md:px-0" : ""} ${
        active
          ? nested
            ? "rounded-full border border-[var(--cat-ink)] bg-[var(--cat-ink)] font-medium text-white md:rounded-[9px] md:border-transparent md:bg-[#e8eef8] md:text-[var(--cat-ink)]"
            : "rounded-full border border-[var(--cat-ink)] bg-[var(--cat-ink)] font-medium text-white md:rounded-[9px] md:border-transparent md:bg-[#eef1f6] md:text-[var(--cat-ink)]"
          : nested
            ? "rounded-full border border-[#edf0f4] bg-[#fbfbfd] font-normal text-[#86868b] hover:border-[#c3ccd9] md:rounded-[9px] md:border-transparent md:bg-transparent md:hover:bg-[#f0f2f6] md:hover:text-[var(--cat-ink)]"
            : "rounded-full border border-[#e2e7ee] bg-white font-normal text-[#5a6472] hover:border-[#c3ccd9] md:rounded-[9px] md:border-transparent md:bg-transparent md:hover:bg-[#f0f2f6] md:hover:text-[var(--cat-ink)]"
      }`}
    >
      <span className={collapsed ? "hidden md:inline-flex" : "hidden"} aria-hidden>
        <item.icon />
      </span>
      <span className={collapsed ? "md:sr-only" : undefined}>{item.label}</span>
    </Link>
  );
}
