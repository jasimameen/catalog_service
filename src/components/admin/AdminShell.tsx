"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CatalogLogo } from "@/components/brand/CatalogLogo";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { PRODUCT_NAME } from "@/lib/brand";

const STORAGE_KEY = "hv-admin-nav-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // private mode / quota
  }
}

function IconPanel({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.25 2.25v11.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d={expanded ? "M10.6 5.6 8.2 8l2.4 2.4" : "M8.4 5.6 10.8 8 8.4 10.4"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminShell({
  newCatalog,
  trial,
  showInquiries = false,
  showOps = false,
  children,
}: {
  newCatalog: ReactNode;
  trial: ReactNode;
  showInquiries?: boolean;
  showOps?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Match SSR (expanded) on first paint, then sync from localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(readCollapsed());
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      writeCollapsed(next);
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-white md:h-dvh md:flex-row md:overflow-hidden">
      <aside
        id="admin-app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        className={`group/shell sticky top-0 z-30 flex shrink-0 flex-col gap-2.5 overflow-hidden border-b border-[var(--cat-border)] bg-[#fbfbfd] pb-2.5 pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] pt-[max(0.625rem,env(safe-area-inset-top))] print:hidden md:h-dvh md:gap-[22px] md:self-start md:border-b-0 md:border-r md:pb-6 md:pt-[18px] ${
          collapsed
            ? "md:w-[72px] md:items-center md:pl-2 md:pr-2"
            : "md:w-[236px] md:pl-[max(1rem,env(safe-area-inset-left))] md:pr-4"
        } ${ready ? "md:transition-[width,padding] md:duration-200 md:ease-out motion-reduce:md:transition-none" : ""}`}
      >
        <div
          className={`flex items-center gap-2.5 ${collapsed ? "md:w-full md:flex-col md:gap-1.5" : ""}`}
        >
          <Link
            href="/admin"
            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-1 md:px-0 ${
              collapsed ? "md:flex-none md:justify-center md:px-0" : ""
            }`}
          >
            <CatalogLogo size={28} className="shrink-0" />
            <span className="truncate text-[15px] font-semibold tracking-tight text-[var(--cat-ink)] md:group-data-[collapsed=true]/shell:hidden">
              {PRODUCT_NAME}
            </span>
          </Link>
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="admin-app-sidebar"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggle}
            className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-[var(--cat-border)] bg-white text-[var(--cat-ink)] transition-colors duration-150 hover:bg-[#f0f2f6] md:inline-flex"
          >
            <IconPanel expanded={!collapsed} />
          </button>
          <div className="md:hidden">
            <SignOutButton variant="chrome" />
          </div>
        </div>

        {newCatalog}

        <div className="min-h-0 md:flex-1 md:overflow-y-auto">
          <AdminNav collapsed={collapsed} showInquiries={showInquiries} showOps={showOps} />
        </div>

        <div
          className={`mt-auto hidden min-w-0 flex-col gap-3 md:flex ${collapsed ? "w-full items-center" : ""}`}
        >
          {collapsed ? null : <div className="min-w-0">{trial}</div>}
          <SignOutButton variant="nav" compact={collapsed} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-clip md:min-h-0 md:overflow-y-auto">{children}</main>
    </div>
  );
}
