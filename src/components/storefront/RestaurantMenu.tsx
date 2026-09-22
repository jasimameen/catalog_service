"use client";

import { useMemo, useState } from "react";
import type { StorefrontCatalog, StorefrontItem } from "@/lib/catalog/types";
import { useCart } from "@/lib/catalog/cart-context";
import { formatMoney } from "@/lib/catalog/currency";
import { checkoutAllowsItemNotes, fulfillmentLabel, FULFILLMENTS } from "@/lib/catalog/checkout-form";
import { submitCatalogOrder } from "@/lib/catalog/place-order";
import { isDineInTableSession, orderCtaLabel } from "@/lib/catalog/template-settings";
import { TableTicketList, useTableTicket } from "./TableTicket";
import { needsOptionPick, optionsCue } from "@/lib/catalog/item-options";
import { imageFitClass, isItemAvailable, telHref, mailtoHref, whatsappHref } from "@/lib/catalog/merchandising";
import { websiteHref } from "@/lib/catalog/locations";
import { ComboBadge } from "./ComboBadge";
import { ComboIncludes } from "./ComboIncludes";
import { ProductDetailModal } from "./ProductDetailModal";
import { StorefrontMarquee } from "./StorefrontMarquee";
import { useStorefrontSessionRequired } from "./StorefrontSession";
import type { SortOptionId } from "@/lib/catalog/template-settings";

const LINE = "var(--cat-border)";
const INK = "var(--cat-ink)";
const MUTED = "var(--cat-muted)";
const PHOTO = "var(--cat-photo-bg)";

export function RestaurantMenu({
  catalog,
  onOpenCart,
}: {
  catalog: StorefrontCatalog;
  onOpenCart: () => void;
}) {
  const session = useStorefrontSessionRequired();
  const { quantities, increment, decrement, itemCount, subtotal, acceptOrders, lines, clear } = useCart();
  const settings = catalog.settings;
  const rest = settings.restaurant;
  const menu = settings.menu;
  const kitchenNote = checkoutAllowsItemNotes(catalog.checkoutForm, catalog.checkoutFields);
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOptionId>(menu.sortOptions[0] ?? "menu");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [waiterMsg, setWaiterMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const modes = session.visibleModes;
  const tables = settings.floor.tables.filter((t) => t.status === "open");
  const atTable = session.fulfillment === "dine_in" && Boolean(session.tableNo);
  const tableSession = isDineInTableSession({
    dineInQr: rest.dineInQr,
    tableNo: session.tableNo,
    fulfillment: session.fulfillment,
  });
  const needsTable = rest.dineInQr && session.fulfillment === "dine_in" && !session.tableNo;
  const kitchenCta = orderCtaLabel(settings, session.fulfillment);
  const { ticket, refresh: refreshTicket } = useTableTicket(catalog.id, tableSession ? session.tableNo : "");

  async function sendToKitchen() {
    if (!acceptOrders || itemCount === 0 || sending) return;
    setSending(true);
    const placed = await submitCatalogOrder({
      catalogId: catalog.id,
      fulfillment: "dine_in",
      tableNo: session.tableNo,
      shopName: `Table ${session.tableNo}`,
      formValues: { table: session.tableNo, table_no: session.tableNo },
      items: lines
        .filter((line) => line.qty > 0)
        .map((line) => ({
          code: line.code,
          qty: line.qty,
          options: line.options,
          notes: line.note,
        })),
    });
    setSending(false);
    if (!placed.ok) {
      setWaiterMsg(placed.error);
      window.setTimeout(() => setWaiterMsg(""), 3500);
      return;
    }
    clear();
    setWaiterMsg("Sent to kitchen");
    window.setTimeout(() => setWaiterMsg(""), 2500);
    void refreshTicket();
  }

  const cats = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of catalog.items) {
      const name = item.category.trim() || "Menu";
      if (seen.has(name)) continue;
      seen.add(name);
      order.push(name);
    }
    return order;
  }, [catalog.items]);

  const featured = catalog.items.filter((item) => item.featured);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = catalog.items.filter((item) => {
      if (category && (item.category.trim() || "Menu") !== category) return false;
      if (q) {
        const hay = `${item.name} ${item.code} ${item.category} ${item.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (diet.length > 0) {
        const hay = `${item.name} ${item.description} ${item.category}`.toLowerCase();
        const ok = diet.some((id) => {
          const def = menu.dietOptions.find((d) => d.id === id);
          return def ? def.keywords.some((k) => hay.includes(k)) : false;
        });
        if (!ok) return false;
      }
      return true;
    });
    if (sort === "price") rows = [...rows].sort((a, b) => a.price - b.price);
    if (sort === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [catalog.items, category, diet, menu.dietOptions, query, sort]);

  const sections = useMemo(() => {
    const order: string[] = [];
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of filtered) {
      const group = item.isCombo ? "Combos" : item.category.trim() || "Menu";
      if (!grouped.has(group)) {
        grouped.set(group, []);
        order.push(group);
      }
      grouped.get(group)!.push(item);
    }
    const comboIdx = order.indexOf("Combos");
    if (comboIdx > 0) {
      order.splice(comboIdx, 1);
      order.unshift("Combos");
    }
    return order.map((title) => ({ title, items: grouped.get(title)! }));
  }, [filtered]);

  const hoursLines = catalog.hours
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function pingService(kind: "waiter" | "bill") {
    if (catalog.id.startsWith("builder")) {
      setWaiterMsg(kind === "waiter" ? "Waiter called" : "Bill requested");
      window.setTimeout(() => setWaiterMsg(""), 2500);
      return;
    }
    try {
      const res = await fetch("/api/catalog/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: catalog.id, tableNo: session.tableNo, kind }),
      });
      if (!res.ok) {
        setWaiterMsg("Could not send that. Try again.");
      } else {
        setWaiterMsg(kind === "waiter" ? "Waiter called" : "Bill requested");
      }
    } catch {
      setWaiterMsg("Could not send that. Try again.");
    }
    window.setTimeout(() => setWaiterMsg(""), 2500);
  }

  const reserveHref = catalog.id.startsWith("builder") ? undefined : `/s/${catalog.slug}/reserve`;

  return (
    <div className="min-h-screen bg-[var(--cat-bg)] text-[var(--cat-ink)]">
      {!rest.kitchenOpen ? (
        <StorefrontMarquee
          tone="ink"
          text={[
            rest.closedBanner,
            rest.reopenCopy,
            rest.scheduleWhenClosed ? "Order now and we will schedule it for opening." : "",
          ]
            .filter(Boolean)
            .join("  ·  ")}
        />
      ) : null}
      {waiterMsg ? <StorefrontMarquee text={waiterMsg} tone="accent" /> : null}

      <header className="sticky top-0 z-40 border-b border-[var(--cat-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-catalog-display truncate text-[22px] font-semibold leading-none sm:text-[28px]">
              {catalog.name}
            </div>
            {catalog.tagline ? (
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--cat-muted)]">{catalog.tagline}</div>
            ) : null}
          </div>
          {tableSession ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--cat-ink)] px-3 text-[13px] font-bold text-white">
                Table {session.tableNo}
              </div>
              {session.canChangePresence ? (
                <button
                  type="button"
                  onClick={session.resetPresence}
                  className="min-h-11 rounded-[10px] px-2.5 text-[12px] font-bold text-[var(--cat-muted)] underline-offset-2 hover:underline"
                >
                  Change
                </button>
              ) : null}
            </div>
          ) : session.presence === "here" ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--cat-ink)] px-3 text-[13px] font-bold text-white">
                Dine in
              </div>
              {session.canChangePresence ? (
                <button
                  type="button"
                  onClick={session.resetPresence}
                  className="min-h-11 rounded-[10px] px-2.5 text-[12px] font-bold text-[var(--cat-muted)] underline-offset-2 hover:underline"
                >
                  Change
                </button>
              ) : null}
            </div>
          ) : modes.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex rounded-[10px] border border-[var(--cat-border)] bg-[var(--cat-photo-bg)] p-[3px]">
                {FULFILLMENTS.filter((m) => modes.includes(m.value)).map((mode) => {
                  const on = session.fulfillment === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => session.setFulfillment(mode.value)}
                      className="min-h-10 rounded-lg px-3 text-[12px] font-bold sm:px-4 sm:text-[13px]"
                      style={{
                        background: on ? catalog.accent : "transparent",
                        color: on ? "#fff" : MUTED,
                      }}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {session.canChangePresence ? (
                <button
                  type="button"
                  onClick={session.resetPresence}
                  className="min-h-11 rounded-[10px] px-2.5 text-[12px] font-bold text-[var(--cat-muted)] underline-offset-2 hover:underline"
                >
                  Change
                </button>
              ) : null}
            </div>
          ) : null}
          {rest.enableReserve && reserveHref ? (
            <a
              href={reserveHref}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--cat-border)] bg-white px-3 text-[12px] font-bold text-[var(--cat-ink)] sm:px-3.5 sm:text-[13px]"
            >
              Reserve
            </a>
          ) : null}
          {tableSession ? (
            <button
              type="button"
              disabled={!acceptOrders || itemCount === 0 || sending}
              onClick={() => void sendToKitchen()}
              className="hidden min-h-11 items-center gap-2 rounded-[10px] px-4 text-[14px] font-bold text-white disabled:bg-[var(--cat-photo-bg)] disabled:text-[var(--cat-muted)] sm:inline-flex"
              style={{ background: itemCount > 0 ? catalog.accent : undefined }}
            >
              {sending ? "Sending…" : kitchenCta}
              {itemCount > 0 ? (
                <span className="inline-flex min-w-[22px] justify-center rounded-full bg-white px-1.5 text-[12px]" style={{ color: catalog.accent }}>
                  {itemCount}
                </span>
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCart}
              className="hidden min-h-11 items-center gap-2 rounded-[10px] px-4 text-[14px] font-bold text-white sm:inline-flex"
              style={{ background: catalog.accent }}
            >
              Order
              <span className="inline-flex min-w-[22px] justify-center rounded-full bg-white px-1.5 text-[12px]" style={{ color: catalog.accent }}>
                {itemCount}
              </span>
            </button>
          )}
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3.5 pb-2.5">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu"
              className="h-11 w-full rounded-[11px] border border-[var(--cat-border)] bg-white px-4 text-[14.5px] text-[var(--cat-ink)] outline-none"
            />
          </div>
          {(menu.dietFilters || menu.sorts) ? (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="h-11 rounded-[11px] border border-[var(--cat-border)] bg-white px-3.5 text-[13px] font-bold md:hidden"
            >
              Filter
            </button>
          ) : null}
          {menu.dietFilters ? (
            <div className="hidden flex-wrap gap-2 md:flex">
              {menu.dietOptions.map((d) => {
                const on = diet.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiet((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                    className="h-10 rounded-full border px-3.5 text-[13px] font-bold"
                    style={{
                      background: on ? catalog.accent : "#fff",
                      borderColor: on ? catalog.accent : LINE,
                      color: on ? "#fff" : MUTED,
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {menu.sorts ? (
            <div className="hidden flex-wrap gap-2 md:flex">
              {menu.sortOptions.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className="h-10 rounded-full border px-3.5 text-[13px] font-bold capitalize"
                  style={{
                    background: sort === id ? catalog.accent : "#fff",
                    borderColor: sort === id ? catalog.accent : LINE,
                    color: sort === id ? "#fff" : MUTED,
                  }}
                >
                  {id === "menu" ? "Menu" : id === "price" ? "Price" : "Name"}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {cats.length > 1 ? (
          <div className="border-t border-[var(--cat-border)]">
            <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-3.5 py-2.5">
              <Chip label="All" on={!category} onClick={() => setCategory("")} />
              {cats.map((c) => (
                <Chip key={c} label={c} on={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main className={`@container mx-auto max-w-6xl px-3.5 pt-5 ${tableSession ? "pb-36" : "pb-28"}`}>
        {session.nearbyNote ? (
          <div className="mb-4 rounded-[12px] border border-[var(--cat-border)] bg-white px-4 py-3 text-[13.5px] text-[var(--cat-ink)]">
            {session.nearbyNote}
          </div>
        ) : null}
        {atTable ? (
          <div className="mb-5 rounded-[14px] bg-[var(--cat-ink)] px-4 py-4 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-catalog-display text-[22px] font-semibold">
                  Table {session.tableNo}
                </div>
                <div className="mt-1 text-[12.5px] text-white/70">
                  {settings.floor.name}
                  {ticket && ticket.itemCount > 0 ? ` · ${ticket.itemCount} sent` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rest.callWaiter ? (
                  <button type="button" onClick={() => void pingService("waiter")} className="h-11 rounded-[9px] border border-white/25 px-3.5 text-[13px] font-bold">
                    Call waiter
                  </button>
                ) : null}
                {rest.requestBill ? (
                  <button type="button" onClick={() => void pingService("bill")} className="h-11 rounded-[9px] border border-white/25 px-3.5 text-[13px] font-bold">
                    Request bill
                  </button>
                ) : null}
                <button type="button" onClick={() => setTableOpen(true)} className="h-11 rounded-[9px] px-3.5 text-[13px] font-bold text-white" style={{ background: catalog.accent }}>
                  Change table
                </button>
              </div>
            </div>
            <div className="mt-3 border-t border-white/15 pt-3">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">This table</div>
              <TableTicketList ticket={ticket} />
            </div>
          </div>
        ) : null}

        {needsTable ? (
          <div className="mb-5 rounded-[14px] border border-[var(--cat-border)] bg-white p-5">
            <div className="font-catalog-display text-[24px] font-semibold">
              Which table are you at?
            </div>
            <p className="mt-1.5 text-[13.5px] text-[var(--cat-muted)]">
              Scan the QR on your table or pick it here. Your order goes to this table.
            </p>
            <button
              type="button"
              onClick={() => setTableOpen(true)}
              className="mt-3 h-12 rounded-[10px] px-4 text-[13.5px] font-bold text-white"
              style={{ background: catalog.accent }}
            >
              Pick my table
            </button>
          </div>
        ) : null}

        {featured.length > 0 && !query && diet.length === 0 && !category ? (
          <section className="mb-8">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="font-catalog-display text-[23px] font-semibold">
                {menu.featuredTitle}
              </h2>
              {menu.featuredNote ? <span className="text-[12px] text-[var(--cat-muted)]">{menu.featuredNote}</span> : null}
            </div>
            <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1">
              {featured.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="w-[104px] shrink-0 overflow-hidden rounded-[9px] border border-[var(--cat-border)] bg-white text-left"
                >
                  {menu.showPhotos ? (
                    <div className="relative h-[88px] overflow-hidden bg-[var(--cat-photo-bg)]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className={`h-full w-full ${imageFitClass(item.imageFit)}`} />
                      ) : (
                        <span className="font-catalog-display grid h-full place-items-center text-[22px] font-semibold text-[var(--cat-muted)]">
                          {item.name[0]}
                        </span>
                      )}
                    </div>
                  ) : null}
                  <div className="px-1.5 py-1">
                    <div className="line-clamp-2 text-[11px] font-semibold leading-snug">{item.name}</div>
                    <div className="mt-0.5 text-[11px] font-semibold">{formatMoney(item.price, catalog.currency)}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {catalog.items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="font-catalog-display text-[28px] font-semibold">
              Menu is being prepared
            </div>
            <p className="mt-2 text-[14px] text-[var(--cat-muted)]">Check back shortly — items will appear here.</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center">
            <div className="font-catalog-display text-[28px] font-semibold">
              Nothing matches that
            </div>
            <button type="button" onClick={() => { setQuery(""); setDiet([]); setCategory(""); }} className="mt-4 h-11 rounded-[10px] border border-[var(--cat-accent)] px-4 text-[14px] font-bold">
              Show the full menu
            </button>
          </div>
        ) : (
          sections.map((sec) => (
            <section key={sec.title} className="mb-8">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-catalog-display text-[23px] font-semibold">
                  {sec.title}
                </h2>
                <span className="flex-1 border-t border-[var(--cat-border)]" />
                <span className="text-[12px] text-[var(--cat-muted)]">{sec.items.length}</span>
              </div>
              <div className={menu.sectionStyle === "cards" ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid grid-cols-1 gap-1.5 sm:grid-cols-2"}>
                {sec.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    catalog={catalog}
                    qty={quantities[item.code] ?? 0}
                    rows={menu.sectionStyle === "rows"}
                    showPhotos={menu.showPhotos}
                    acceptOrders={acceptOrders}
                    onOpen={() => openItem(item)}
                    onInc={() => increment(item.code)}
                    onDec={() => decrement(item.code)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <section className="rounded-[18px] border border-[var(--cat-border)] bg-white px-5 py-7 text-[var(--cat-ink)]">
          <div className="grid grid-cols-1 gap-6 @md:grid-cols-2 @3xl:grid-cols-4">
            {catalog.showContact && (catalog.address || catalog.phone || catalog.locations.length > 0) ? (
              <div>
                <div className="font-catalog-display mb-2 text-[22px] font-semibold">Visit us</div>
                {catalog.address ? <p className="m-0 text-[14px] leading-relaxed text-[var(--cat-muted)]">{catalog.address}</p> : null}
                {catalog.locations.length > 0 ? (
                  <ul className="mt-3 list-none space-y-3 p-0">
                    {catalog.locations.map((row) => {
                      const site = websiteHref(row.website);
                      const mail = mailtoHref(row.email);
                      const tel = telHref(row.phone);
                      return (
                        <li key={`${row.name}-${row.phone}-${row.address}`} className="text-[14px] leading-snug">
                          <span className="font-semibold text-[var(--cat-ink)]">{row.name}</span>
                          {row.address ? <span className="mt-0.5 block text-[var(--cat-muted)]">{row.address}</span> : null}
                          {row.phone ? (
                            tel ? (
                              <a href={tel} className="mt-0.5 block text-[var(--cat-accent)]">{row.phone}</a>
                            ) : (
                              <span className="mt-0.5 block text-[var(--cat-muted)]">{row.phone}</span>
                            )
                          ) : null}
                          {row.email ? (
                            mail ? (
                              <a href={mail} className="mt-0.5 block text-[var(--cat-accent)]">{row.email}</a>
                            ) : (
                              <span className="mt-0.5 block text-[var(--cat-muted)]">{row.email}</span>
                            )
                          ) : null}
                          {row.website ? (
                            site ? (
                              <a href={site} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[var(--cat-accent)]">
                                {row.website}
                              </a>
                            ) : (
                              <span className="mt-0.5 block text-[var(--cat-muted)]">{row.website}</span>
                            )
                          ) : null}
                          {row.notes ? <span className="mt-0.5 block text-[var(--cat-muted)]">{row.notes}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {catalog.showContact ? (
              <div>
                <div className="font-catalog-display mb-2 text-[22px] font-semibold">Talk to us</div>
                <div className="flex flex-col gap-2 text-[14px] text-[var(--cat-muted)]">
                  {catalog.phone && telHref(catalog.phone) ? <a href={telHref(catalog.phone)!} className="text-[var(--cat-accent)]">{catalog.phone}</a> : null}
                  {catalog.whatsapp && whatsappHref(catalog.whatsapp) ? <a href={whatsappHref(catalog.whatsapp)!} className="text-[var(--cat-accent)]">WhatsApp</a> : null}
                  {catalog.email && mailtoHref(catalog.email) ? <a href={mailtoHref(catalog.email)!} className="text-[var(--cat-accent)]">{catalog.email}</a> : null}
                </div>
              </div>
            ) : null}
            {catalog.showHours && hoursLines.length > 0 ? (
              <div>
                <div className="font-catalog-display mb-2 text-[22px] font-semibold">Hours</div>
                {hoursLines.map((line) => (
                  <div key={line} className="border-b border-[var(--cat-border)] py-1.5 text-[14px] text-[var(--cat-muted)]">{line}</div>
                ))}
              </div>
            ) : null}
            <div>
              <div className="font-catalog-display mb-2 text-[22px] font-semibold">Ordering</div>
              <div className="flex flex-col gap-2 text-[14px] text-[var(--cat-muted)]">
                {catalog.fulfillmentModes.includes("delivery") ? (
                  <span>Delivery · {rest.deliveryFee > 0 ? formatMoney(rest.deliveryFee, catalog.currency) : "no extra fee"}</span>
                ) : null}
                {rest.minOrder > 0 ? <span>Minimum order · {formatMoney(rest.minOrder, catalog.currency)}</span> : null}
                {catalog.fulfillmentModes.includes("pickup") && rest.pickupReadyCopy ? <span>{rest.pickupReadyCopy}</span> : null}
                {rest.enableReserve && reserveHref ? (
                  <a href={reserveHref} className="font-bold text-[var(--cat-accent)]">Reserve a table →</a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      {tableSession ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--cat-border)] bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <button
            type="button"
            onClick={() => setTicketOpen(true)}
            className="mb-2 flex w-full items-center justify-between text-left"
          >
            <span className="text-[12px] font-bold text-[var(--cat-muted)]">Table {session.tableNo} ticket</span>
            <span className="text-[12px] text-[var(--cat-muted)]">
              {ticket && ticket.itemCount > 0 ? `${ticket.itemCount} sent · view` : "Nothing sent yet"}
            </span>
          </button>
          <button
            type="button"
            disabled={!acceptOrders || itemCount === 0 || sending}
            onClick={() => void sendToKitchen()}
            className="flex h-[54px] w-full items-center gap-3 rounded-[13px] px-4 font-bold text-white disabled:bg-[var(--cat-photo-bg)] disabled:text-[var(--cat-muted)]"
            style={{ background: itemCount > 0 ? catalog.accent : undefined }}
          >
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 text-[13px]">{itemCount}</span>
            <span>{sending ? "Sending…" : kitchenCta}</span>
            <span className="ml-auto">{itemCount > 0 ? formatMoney(subtotal, catalog.currency) : "Add dishes"}</span>
          </button>
        </div>
      ) : itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[var(--cat-bg)] to-transparent p-3.5 sm:hidden">
          <button
            type="button"
            onClick={onOpenCart}
            className="flex h-[54px] w-full items-center gap-3 rounded-[13px] px-4 font-bold text-white"
            style={{ background: catalog.accent }}
          >
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 text-[13px]">{itemCount}</span>
            <span>{session.fulfillment ? fulfillmentLabel(session.fulfillment) : "Order"}</span>
            <span className="ml-auto">{formatMoney(subtotal, catalog.currency)}</span>
          </button>
        </div>
      ) : null}

      {ticketOpen && tableSession ? (
        <Sheet title={`Table ${session.tableNo}`} sub="What this table has already sent" onClose={() => setTicketOpen(false)}>
          <div className="rounded-[12px] bg-[var(--cat-ink)] p-4 text-white">
            <TableTicketList ticket={ticket} />
          </div>
          <button
            type="button"
            onClick={() => setTicketOpen(false)}
            className="mt-4 h-12 w-full rounded-[10px] bg-[var(--cat-accent)] text-[14px] font-bold text-white"
          >
            Back to menu
          </button>
        </Sheet>
      ) : null}

      {tableOpen ? (
        <Sheet title="Your table" onClose={() => setTableOpen(false)}>
          <div className="grid grid-cols-3 gap-2">
            {tables.map((t) => {
              const on = session.tableNo === t.no;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => session.setTableNo(t.no)}
                  className="flex h-[62px] flex-col items-center justify-center rounded-[11px] border"
                  style={{
                    background: on ? catalog.accent : "#fff",
                    borderColor: on ? catalog.accent : LINE,
                    color: on ? "#fff" : INK,
                  }}
                >
                  <span className="text-[17px] font-bold">{t.no}</span>
                  <span className="text-[10.5px] opacity-80">{t.seats} seats</span>
                </button>
              );
            })}
          </div>
          {tables.length === 0 ? <p className="text-[13px] text-[var(--cat-muted)]">No tables published yet.</p> : null}
          <button
            type="button"
            onClick={() => setTableOpen(false)}
            className="mt-4 h-12 w-full rounded-[10px] bg-[var(--cat-accent)] text-[14px] font-bold text-white"
          >
            {session.tableNo ? `Use table ${session.tableNo}` : "Close"}
          </button>
        </Sheet>
      ) : null}

      {filterOpen ? (
        <Sheet title="Filter & sort" onClose={() => setFilterOpen(false)}>
          {menu.dietFilters ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {menu.dietOptions.map((d) => {
                const on = diet.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiet((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                    className="h-11 rounded-full border px-4 text-[13px] font-bold"
                    style={{ background: on ? catalog.accent : "#fff", borderColor: on ? catalog.accent : LINE, color: on ? "#fff" : MUTED }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {menu.sorts ? (
            <div className="flex flex-col gap-2">
              {menu.sortOptions.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className="h-12 rounded-[11px] border px-4 text-left text-[14px] font-bold capitalize"
                  style={{ borderColor: sort === id ? catalog.accent : LINE, background: sort === id ? PHOTO : "#fff", color: sort === id ? catalog.accent : INK }}
                >
                  {id}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={() => setFilterOpen(false)} className="mt-4 h-12 w-full rounded-[10px] bg-[var(--cat-accent)] font-bold text-white">
            Apply
          </button>
        </Sheet>
      ) : null}

      {selected ? (
        <ProductDetailModal
          item={selected}
          currency={catalog.currency}
          variant="menu"
          showKitchenNote={kitchenNote}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );

  function openItem(item: StorefrontItem) {
    setSelected(item);
  }
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 shrink-0 rounded-full border px-3.5 text-[13px] font-bold"
      style={{
        background: on ? "var(--cat-accent)" : "#fff",
        borderColor: on ? "var(--cat-accent)" : LINE,
        color: on ? "#fff" : MUTED,
      }}
    >
      {label}
    </button>
  );
}

function Sheet({
  title,
  sub,
  onClose,
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(16,23,32,0.45)]">
      <div className="max-h-[92%] w-full max-w-[460px] overflow-y-auto rounded-t-[18px] bg-white p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-catalog-display m-0 text-[24px] font-semibold">{title}</h3>
            {sub ? <p className="m-0 mt-1 text-[13px] text-[var(--cat-muted)]">{sub}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--cat-border)] text-lg">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  catalog,
  qty,
  rows,
  showPhotos,
  acceptOrders,
  onOpen,
  onInc,
  onDec,
}: {
  item: StorefrontItem;
  catalog: StorefrontCatalog;
  qty: number;
  rows: boolean;
  showPhotos: boolean;
  acceptOrders: boolean;
  onOpen: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const available = isItemAvailable(item);
  const lockAdd = needsOptionPick(item);
  const canStep = acceptOrders && available && !lockAdd;
  const cue = item.isCombo ? null : optionsCue(item);
  const initial = item.name.trim()[0]?.toUpperCase() ?? "?";
  const btn = rows ? "h-8 w-8 rounded-[7px] text-[15px] font-bold" : "h-7 w-7 rounded-[6px] text-[14px] font-bold";

  function stop(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  const actions =
    !acceptOrders || !available ? (
      available ? null : <span className="text-[11px] text-[var(--cat-muted)]">Unavailable</span>
    ) : canStep ? (
      qty > 0 ? (
        <div className="flex items-center gap-1" onClick={stop} onKeyDown={stop}>
          <button type="button" onClick={onDec} aria-label={`Remove one ${item.name}`} className={`${btn} border border-[var(--cat-border)]`}>−</button>
          <span className="min-w-3.5 text-center text-[12px] font-bold">{qty}</span>
          <button type="button" onClick={onInc} aria-label={`Add one more ${item.name}`} className={`${btn} bg-[var(--cat-accent)] text-white`}>+</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onInc();
          }}
          aria-label={`Add ${item.name}`}
          className={`grid place-items-center ${btn} border border-[var(--cat-border)] text-[var(--cat-ink)]`}
        >
          +
        </button>
      )
    ) : (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        aria-label={`Choose options for ${item.name}`}
        className={`grid place-items-center ${btn} border border-[var(--cat-border)] text-[var(--cat-ink)]`}
      >
        +
      </button>
    );

  if (rows) {
    return (
      <article className="flex gap-2 rounded-[10px] border border-[var(--cat-border)] bg-white p-1.5">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-2 text-left">
          {showPhotos ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[var(--cat-photo-bg)]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className={`h-full w-full ${imageFitClass(item.imageFit)}`} />
              ) : (
                <span className="font-catalog-display grid h-full place-items-center text-[26px] font-semibold text-[var(--cat-muted)]">{initial}</span>
              )}
              {qty > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: catalog.accent }}>{qty}</span>
              ) : null}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-baseline gap-2">
              <h3 className="m-0 line-clamp-2 text-[13.5px] font-semibold">{item.name}</h3>
              {item.isCombo ? <ComboBadge /> : null}
            </div>
            {item.isCombo ? <ComboIncludes lines={item.comboIncludes} layout="inline" size="sm" className="mt-1" /> : null}
            {item.description ? <p className="m-0 mt-0.5 line-clamp-1 text-[12px] text-[var(--cat-muted)]">{item.description}</p> : null}
            {cue ? <p className="m-0 mt-0.5 text-[11px] font-semibold text-[var(--cat-accent)]">{cue}</p> : null}
            <div className="mt-auto pt-1.5 text-[13.5px] font-semibold">{formatMoney(item.price, catalog.currency)}</div>
          </div>
        </button>
        <div className="flex shrink-0 items-end">{actions}</div>
      </article>
    );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--cat-border)] bg-white">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        {showPhotos ? (
          <div className="relative h-[128px] overflow-hidden bg-[var(--cat-photo-bg)]">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className={`h-full w-full ${imageFitClass(item.imageFit)}`} />
            ) : (
              <span className="font-catalog-display grid h-full place-items-center text-[26px] font-semibold text-[var(--cat-muted)]">{initial}</span>
            )}
            {qty > 0 ? (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: catalog.accent }}>{qty}</span>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-1 flex-col px-1.5 pt-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <h3 className="m-0 line-clamp-2 text-[12px] font-semibold leading-snug">{item.name}</h3>
            {item.isCombo ? <ComboBadge /> : null}
          </div>
          {item.isCombo ? <ComboIncludes lines={item.comboIncludes} layout="list" size="sm" className="mt-1" /> : null}
          {item.description ? <p className="m-0 mt-0.5 line-clamp-1 text-[10.5px] text-[var(--cat-muted)]">{item.description}</p> : null}
          {cue ? <p className="m-0 mt-0.5 text-[10px] font-semibold text-[var(--cat-accent)]">{cue}</p> : null}
          <div className="mt-auto pt-1 text-[12px] font-semibold">{formatMoney(item.price, catalog.currency)}</div>
        </div>
      </button>
      <div className="flex items-center justify-end px-1.5 pb-1.5 pt-1">{actions}</div>
    </article>
  );
}
