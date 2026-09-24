"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SettingsSheet } from "@/components/admin/SettingsSheet";

export type SettingsPanelId =
  | "hours"
  | "contact"
  | "locations"
  | "floor"
  | "ordering"
  | "look"
  | "discovery"
  | "danger";

export type SettingsPanels = Record<Exclude<SettingsPanelId, "floor">, ReactNode> & {
  floor?: ReactNode | null;
};

const GROUPS: {
  title: string;
  rows: { id: SettingsPanelId; title: string; subtitle: string }[];
}[] = [
  {
    title: "Place",
    rows: [
      { id: "hours", title: "Hours", subtitle: "Open and close" },
      { id: "contact", title: "Contact", subtitle: "Phone, address, map" },
      { id: "locations", title: "Locations", subtitle: "Branches of this shop" },
      { id: "floor", title: "Floor plan", subtitle: "Draw rooms and tables" },
    ],
  },
  {
    title: "Ordering",
    rows: [{ id: "ordering", title: "Ordering form", subtitle: "Fulfillment, reservations, checkout" }],
  },
  {
    title: "Look",
    rows: [{ id: "look", title: "Look", subtitle: "Theme, cover, display" }],
  },
  {
    title: "Discovery",
    rows: [{ id: "discovery", title: "Metadata & share", subtitle: "SEO, tagline, preview" }],
  },
  {
    title: "Advanced",
    rows: [{ id: "danger", title: "Delete catalog", subtitle: "And another shop" }],
  },
];

const HASH_TO_PANEL: Record<string, SettingsPanelId> = {
  hours: "hours",
  contact: "contact",
  branches: "locations",
  locations: "locations",
  floor: "floor",
  ordering: "ordering",
  look: "look",
  discovery: "discovery",
  danger: "danger",
};

const PANEL_COPY: Record<SettingsPanelId, { title: string; subtitle: string }> = {
  hours: { title: "Hours", subtitle: "Open and close for each day" },
  contact: { title: "Contact", subtitle: "Main number and address" },
  locations: { title: "Locations", subtitle: "Branches of this shop only" },
  floor: {
    title: "Floor plan",
    subtitle: "Draw rooms and tables. Reservations work without this.",
  },
  ordering: { title: "Ordering", subtitle: "Fulfillment, reservations, and checkout" },
  look: { title: "Look", subtitle: "Theme, cover, and display" },
  discovery: { title: "Discovery", subtitle: "Metadata, SEO, and share preview" },
  danger: { title: "Advanced", subtitle: "Another shop or delete this catalog" },
};

export function SettingsHub({
  desktop,
  mobile,
}: {
  desktop: SettingsPanels;
  mobile: SettingsPanels;
}) {
  const [open, setOpen] = useState<SettingsPanelId | null>(null);
  const showFloor = Boolean(desktop.floor);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      if (desktop.matches) {
        setOpen(null);
        return;
      }
      const key = window.location.hash.replace("#", "");
      const panel = HASH_TO_PANEL[key];
      if (panel && (panel !== "floor" || showFloor)) setOpen(panel);
    };
    apply();
    window.addEventListener("hashchange", apply);
    desktop.addEventListener("change", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      desktop.removeEventListener("change", apply);
    };
  }, [showFloor]);

  return (
    <section
      id="settings"
      aria-labelledby="settings-hub-title"
      className="flex min-w-0 flex-col gap-3"
    >
      <div>
        <h2
          id="settings-hub-title"
          className="m-0 text-[20px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]"
        >
          Settings
        </h2>
        <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
          Place, ordering, look, discovery. Delete is under Advanced.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {GROUPS.map((group) => {
          const rows = group.rows.filter((row) => row.id !== "floor" || showFloor);
          if (rows.length === 0) return null;
          return (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
              {group.title}
            </p>
            <div className="settings-inset">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setOpen(row.id)}
                  className="settings-row ops-press"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium tracking-tight text-[var(--cat-ink)]">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[#86868b]">{row.subtitle}</span>
                  </span>
                  <span aria-hidden className="text-[18px] text-[#c3ccd9]">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      <div className="hidden flex-col gap-5 md:flex">
        <DesktopGroup title="Place">
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            {desktop.hours}
            {desktop.contact}
          </div>
          {desktop.locations}
          {desktop.floor}
        </DesktopGroup>
        <DesktopGroup title="Ordering">{desktop.ordering}</DesktopGroup>
        <DesktopGroup title="Look">{desktop.look}</DesktopGroup>
        <DesktopGroup title="Discovery">{desktop.discovery}</DesktopGroup>
        <DesktopGroup title="Advanced">{desktop.danger}</DesktopGroup>
      </div>

      <SettingsSheet
        open={open != null}
        title={open ? PANEL_COPY[open].title : "Settings"}
        subtitle={open ? PANEL_COPY[open].subtitle : undefined}
        onClose={() => setOpen(null)}
      >
        {open ? mobile[open] : null}
      </SettingsSheet>
    </section>
  );
}

function DesktopGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
        {title}
      </p>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}
