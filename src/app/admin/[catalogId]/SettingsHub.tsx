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

export type SettingsGroupId = "place" | "ordering" | "look" | "discovery" | "advanced";

export type SettingsPanels = Record<Exclude<SettingsPanelId, "floor">, ReactNode> & {
  floor?: ReactNode | null;
};

const TABS: { id: SettingsGroupId; label: string }[] = [
  { id: "place", label: "Place" },
  { id: "ordering", label: "Ordering" },
  { id: "look", label: "Look" },
  { id: "discovery", label: "Discovery" },
  { id: "advanced", label: "Advanced" },
];

const GROUPS: {
  id: SettingsGroupId;
  title: string;
  rows: { id: SettingsPanelId; title: string; subtitle: string }[];
}[] = [
  {
    id: "place",
    title: "Place",
    rows: [
      { id: "hours", title: "Hours", subtitle: "Open and close" },
      { id: "contact", title: "Contact", subtitle: "Phone, address, map" },
      { id: "locations", title: "Locations", subtitle: "Branches of this shop" },
      { id: "floor", title: "Floor plan", subtitle: "Draw rooms and tables" },
    ],
  },
  {
    id: "ordering",
    title: "Ordering",
    rows: [{ id: "ordering", title: "Ordering", subtitle: "Fulfillment, reservations, checkout" }],
  },
  {
    id: "look",
    title: "Look",
    rows: [{ id: "look", title: "Look", subtitle: "Theme, cover, display" }],
  },
  {
    id: "discovery",
    title: "Discovery",
    rows: [{ id: "discovery", title: "Metadata & share", subtitle: "SEO, tagline, preview" }],
  },
  {
    id: "advanced",
    title: "Advanced",
    rows: [{ id: "danger", title: "Advanced", subtitle: "New catalog or delete" }],
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

const PANEL_TO_GROUP: Record<SettingsPanelId, SettingsGroupId> = {
  hours: "place",
  contact: "place",
  locations: "place",
  floor: "place",
  ordering: "ordering",
  look: "look",
  discovery: "discovery",
  danger: "advanced",
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
  danger: { title: "Advanced", subtitle: "New catalog or delete this catalog" },
};

export function isCatalogSettingsHash(hash: string): boolean {
  const key = hash.replace("#", "");
  return key === "settings" || Boolean(HASH_TO_PANEL[key]);
}

function readHash(showFloor: boolean): {
  open: boolean;
  tab: SettingsGroupId;
  panel: SettingsPanelId | null;
} {
  const key = window.location.hash.replace("#", "");
  if (!key || key === "settings") {
    return { open: key === "settings", tab: "place", panel: null };
  }
  const panel = HASH_TO_PANEL[key];
  if (!panel || (panel === "floor" && !showFloor)) {
    return { open: false, tab: "place", panel: null };
  }
  return { open: true, tab: PANEL_TO_GROUP[panel], panel };
}

function setHash(next: string) {
  const current = window.location.hash.replace("#", "");
  if (current === next) return;
  const url = `${window.location.pathname}${window.location.search}${next ? `#${next}` : ""}`;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function SettingsHub({
  desktop,
  mobile,
}: {
  desktop: SettingsPanels;
  mobile: SettingsPanels;
}) {
  const [hubOpen, setHubOpen] = useState(false);
  const [tab, setTab] = useState<SettingsGroupId>("place");
  const [mobilePanel, setMobilePanel] = useState<SettingsPanelId | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const showFloor = Boolean(desktop.floor);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      const desktopView = mq.matches;
      setIsDesktop(desktopView);
      const next = readHash(showFloor);
      setHubOpen(next.open);
      setTab(next.tab);
      setMobilePanel(desktopView ? null : next.panel);
    };
    apply();
    window.addEventListener("hashchange", apply);
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      mq.removeEventListener("change", apply);
    };
  }, [showFloor]);

  function openHub(nextTab: SettingsGroupId = "place", panel: SettingsPanelId | null = null) {
    setHubOpen(true);
    setTab(nextTab);
    setMobilePanel(panel);
    setHash(panel ?? "settings");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      document.getElementById("settings")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function closeHub() {
    setHubOpen(false);
    setMobilePanel(null);
    setHash("");
  }

  function openMobilePanel(id: SettingsPanelId) {
    setMobilePanel(id);
    setTab(PANEL_TO_GROUP[id]);
    setHash(id);
  }

  function backToMobileHub() {
    setMobilePanel(null);
    setHash("settings");
  }

  const sheetOpen = hubOpen && !isDesktop && mobilePanel == null;
  const panelOpen = !isDesktop && mobilePanel != null;

  return (
    <section id="settings" aria-labelledby="settings-hub-title" className="flex min-w-0 flex-col gap-3">
      <div className={hubOpen ? "settings-inset md:hidden" : "settings-inset"}>
        <button type="button" onClick={() => openHub(tab)} className="settings-row ops-press">
          <span className="min-w-0 flex-1">
            <span
              id="settings-hub-title"
              className="block text-[16px] font-medium tracking-[-0.02em] text-[var(--cat-ink)]"
            >
              Settings
            </span>
            <span className="mt-0.5 block text-[13px] text-[#86868b]">
              Place, ordering, look, discovery
            </span>
          </span>
          <span aria-hidden className="text-[18px] text-[#c3ccd9]">
            ›
          </span>
        </button>
      </div>

      {hubOpen ? (
        <div className="hidden min-w-0 flex-col gap-4 md:flex">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="m-0 text-[22px] font-semibold tracking-[-0.028em] text-[var(--cat-ink)]">
                Settings
              </h2>
              <p className="m-0 mt-1 text-[13px] leading-snug text-[#5a6472]">
                One group at a time. Common path first.
              </p>
            </div>
            <button
              type="button"
              onClick={closeHub}
              className="ops-press inline-flex min-h-11 shrink-0 items-center rounded-full bg-[#f4f6f9] px-4 text-[14px] font-medium text-[var(--cat-ink)]"
            >
              Done
            </button>
          </div>

          <div role="tablist" aria-label="Settings groups" className="settings-seg">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className="settings-seg-btn ops-press"
                onClick={() => {
                  setTab(item.id);
                  setHash("settings");
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div key={tab} role="tabpanel" className="settings-tab-pane flex min-w-0 flex-col gap-4">
            {tab === "place" ? (
              <>
                {desktop.hours}
                {desktop.contact}
                {desktop.locations}
                {desktop.floor}
              </>
            ) : null}
            {tab === "ordering" ? desktop.ordering : null}
            {tab === "look" ? desktop.look : null}
            {tab === "discovery" ? desktop.discovery : null}
            {tab === "advanced" ? desktop.danger : null}
          </div>
        </div>
      ) : null}

      <SettingsSheet
        open={sheetOpen}
        title="Settings"
        subtitle="Place, ordering, look, discovery"
        onClose={closeHub}
      >
        <MobileGroupList showFloor={showFloor} onOpen={openMobilePanel} />
      </SettingsSheet>

      <SettingsSheet
        open={panelOpen}
        title={mobilePanel ? PANEL_COPY[mobilePanel].title : "Settings"}
        subtitle={mobilePanel ? PANEL_COPY[mobilePanel].subtitle : undefined}
        onBack={backToMobileHub}
        onClose={closeHub}
      >
        {mobilePanel ? mobile[mobilePanel] : null}
      </SettingsSheet>
    </section>
  );
}

function MobileGroupList({
  showFloor,
  onOpen,
}: {
  showFloor: boolean;
  onOpen: (id: SettingsPanelId) => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-2 pt-1">
      {GROUPS.map((group) => {
        const rows = group.rows.filter((row) => row.id !== "floor" || showFloor);
        if (rows.length === 0) return null;
        return (
          <div key={group.id}>
            <p className="mb-1.5 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a93a2]">
              {group.title}
            </p>
            <div className="settings-inset">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onOpen(row.id)}
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
  );
}
