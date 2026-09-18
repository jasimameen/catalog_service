"use client";

import { useEffect, useMemo, useState } from "react";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import { flattenGuestTables } from "@/lib/catalog/floor-plan";
import { CartProvider, useCart } from "@/lib/catalog/cart-context";
import { formatOrderDateTime } from "@/lib/catalog/order-statuses";
import {
  guestCanCancelReservation,
  parseReservationStatus,
  RESERVATION_STATUS_META,
} from "@/lib/catalog/reservation-status";
import type { ReservationTableRef } from "@/lib/catalog/reservation-tables";
import { ReserveMap, type ReserveMapMark } from "@/components/storefront/ReserveMap";
import { ReserveMenu } from "@/components/storefront/ReserveMenu";
import type { ReservationRow, ReservationStatus } from "@/lib/supabase/types";

type BookedSnap = {
  id: string;
  tables: ReservationTableRef[];
  day: string;
  slot: string;
  guests: number;
  status: ReservationStatus;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  seatedAt: string | null;
};

export function ReserveClient({ catalog }: { catalog: StorefrontCatalog }) {
  return (
    <CartProvider
      catalogId={`${catalog.id}:reserve`}
      items={catalog.items}
      acceptOrders={catalog.acceptOrders}
      pausedMessage={catalog.ordersPausedMessage}
    >
      <ReserveFlow catalog={catalog} />
    </CartProvider>
  );
}

function ReserveFlow({ catalog }: { catalog: StorefrontCatalog }) {
  const rest = catalog.settings.restaurant;
  const floors = catalog.settings.floor.floors;
  const { lines, itemCount, subtotal, clear } = useCart();
  const tables = useMemo(() => {
    const fromPlan = flattenGuestTables({ floors });
    const source = fromPlan.length > 0 ? fromPlan : catalog.settings.floor.tables;
    return source.filter((t) => t.bookable && t.status === "open");
  }, [floors, catalog.settings.floor.tables]);
  const hasPublishedPlan = floors.some((f) => f.tables.length > 0 || f.items.length > 0);
  const days = useMemo(() => {
    const out: { iso: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < rest.dayCount; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      });
    }
    return out;
  }, [rest.dayCount]);

  const [day, setDay] = useState(days[0]?.iso ?? "");
  const [slot, setSlot] = useState(rest.timeSlots[0] ?? "");
  const [guests, setGuests] = useState(Math.min(rest.guestMax, Math.max(rest.guestMin, 2)));
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [reserved, setReserved] = useState<ReserveMapMark[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState<BookedSnap | null>(null);
  const [bookedFood, setBookedFood] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);

  const picked = useMemo(() => tables.filter((t) => tableIds.includes(t.id)), [tables, tableIds]);
  const foodLines = lines.filter((line) => line.qty > 0);
  const seats = picked.reduce((sum, t) => sum + t.seats, 0);
  const tightSeats = picked.length > 0 && seats < guests;
  const canBook = Boolean(name.trim() && phone.trim() && day && slot);
  const dayLabel = days.find((d) => d.iso === day)?.label ?? day;

  useEffect(() => {
    if (!catalog.id || !day || !slot) return;
    let alive = true;
    void fetch(`/api/catalog/reserve?catalogId=${encodeURIComponent(catalog.id)}&day=${encodeURIComponent(day)}&slot=${encodeURIComponent(slot)}`)
      .then((res) => res.json().catch(() => null))
      .then((data: { tables?: { id?: string; no?: string }[] } | null) => {
        if (!alive || !data || !Array.isArray(data.tables)) return;
        setReserved(
          data.tables
            .filter((row) => typeof row.id === "string" && row.id)
            .map((row) => ({ id: row.id as string, label: `Reserved · ${slot}` })),
        );
        setTableIds((prev) => prev.filter((id) => !data.tables?.some((row) => row.id === id)));
      })
      .catch(() => {
        if (alive) setReserved([]);
      });
    return () => {
      alive = false;
    };
  }, [catalog.id, day, slot]);

  function toggleTable(id: string) {
    if (reserved.some((row) => row.id === id)) return;
    setTableIds((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  }

  async function book() {
    if (!canBook) return;
    if (picked.some((t) => reserved.some((row) => row.id === t.id))) {
      setError("One of those tables is already reserved for this time.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/catalog/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: catalog.id,
        tables: picked.map((t) => ({ id: t.id, no: t.no })),
        day,
        slot,
        guests,
        name,
        phone,
        note,
        items: foodLines.map((line) => ({
          code: line.code,
          qty: line.qty,
          options: line.options,
          notes: line.note,
        })),
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string; reservation?: ReservationRow; reservationId?: string }
      | null;
    setPending(false);
    if (!res.ok) {
      setError(data?.error || "Could not book.");
      return;
    }
    const row = data?.reservation;
    const refs = picked.map((t) => ({ id: t.id, no: t.no }));
    setReserved((prev) => {
      const next = [...prev];
      for (const t of refs) {
        if (!next.some((row) => row.id === t.id)) next.push({ id: t.id, label: `Reserved · ${slot}` });
      }
      return next;
    });
    setBookedFood(itemCount);
    clear();
    setTableIds([]);
    setBooked({
      id: row?.id ?? data?.reservationId ?? "",
      tables: refs,
      day,
      slot,
      guests,
      status: parseReservationStatus(row?.status),
      createdAt: row?.created_at ?? new Date().toISOString(),
      confirmedAt: row?.confirmed_at ?? null,
      cancelledAt: row?.cancelled_at ?? null,
      seatedAt: row?.seated_at ?? null,
    });
  }

  async function cancelBooking() {
    if (!booked || !guestCanCancelReservation(booked.status)) return;
    setCancelPending(true);
    setError("");
    const res = await fetch("/api/catalog/reserve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogId: catalog.id,
        reservationId: booked.id,
        action: "cancel",
        phone,
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; reservation?: ReservationRow } | null;
    setCancelPending(false);
    if (!res.ok) {
      setError(data?.error || "Could not cancel.");
      return;
    }
    const released = new Set(booked.tables.map((t) => t.id));
    setReserved((prev) => prev.filter((row) => !released.has(row.id)));
    setBooked({
      ...booked,
      status: "cancelled",
      cancelledAt: data?.reservation?.cancelled_at ?? new Date().toISOString(),
    });
  }

  if (!rest.enableReserve) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[var(--cat-bg)] px-4 py-16 text-center text-[var(--cat-ink)]">
        <h1 className="font-catalog-display text-2xl font-semibold">{catalog.name}</h1>
        <p className="mt-2 text-sm text-[var(--cat-muted)]">Reservations are not open.</p>
        <a href={`/s/${catalog.slug}`} className="mt-4 inline-block font-bold" style={{ color: catalog.accent }}>
          Browse the menu
        </a>
      </main>
    );
  }

  if (booked) {
    const meta = RESERVATION_STATUS_META[booked.status];
    const tablesCopy =
      booked.tables.length > 0 ? booked.tables.map((t) => `Table ${t.no}`).join(" + ") : "No table preference — we'll seat you";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cat-bg)] px-4 text-[var(--cat-ink)]">
        <div className="w-full max-w-[460px] rounded-[18px] border border-[var(--cat-border)] bg-white p-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--cat-success-bg)] text-[var(--cat-success-ink)]">
            {booked.status === "cancelled" ? "–" : "✓"}
          </div>
          <h1 className="font-catalog-display text-[26px] font-semibold">
            {booked.status === "cancelled" ? "Booking cancelled" : `You're booked at ${catalog.name}`}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--cat-muted)]">
            {tablesCopy} · {booked.day} · {booked.slot} · {booked.guests} guests
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold text-white" style={{ background: meta.color }}>
            {meta.label}
          </div>
          <p className="mt-2 text-[13px] text-[var(--cat-muted)]">
            Booked at {formatOrderDateTime(booked.createdAt)}
            {booked.confirmedAt ? ` · Confirmed at ${formatOrderDateTime(booked.confirmedAt)}` : ""}
            {booked.seatedAt ? ` · Seated at ${formatOrderDateTime(booked.seatedAt)}` : ""}
            {booked.cancelledAt ? ` · Cancelled at ${formatOrderDateTime(booked.cancelledAt)}` : ""}
          </p>
          {bookedFood > 0 ? (
            <p className="mt-2 text-[13px] text-[var(--cat-muted)]">
              Food is in with the kitchen · {bookedFood} {bookedFood === 1 ? "dish" : "dishes"}
            </p>
          ) : null}
          <p className="mt-2 text-[13px] text-[var(--cat-muted)]">{rest.holdPolicy}</p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-5 flex flex-col gap-2">
            {guestCanCancelReservation(booked.status) ? (
              <button
                type="button"
                disabled={cancelPending}
                onClick={() => void cancelBooking()}
                className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[var(--cat-border)] px-5 font-bold"
              >
                {cancelPending ? "Cancelling…" : "Cancel booking"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setBooked(null);
                setBookedFood(0);
                setError("");
              }}
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[var(--cat-border)] px-5 font-bold"
            >
              Book another
            </button>
            <a href={`/s/${catalog.slug}`} className="inline-flex h-12 items-center justify-center rounded-[10px] px-5 font-bold text-white" style={{ background: catalog.accent }}>
              Browse the menu
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--cat-bg)] text-[var(--cat-ink)]">
      <header className="shrink-0 border-b border-[var(--cat-border)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4">
          <div className="mr-auto">
            <div className="font-catalog-display text-[26px] font-semibold">{catalog.name}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--cat-muted)]">Reserve a table</div>
          </div>
          <a href={`/s/${catalog.slug}`} className="inline-flex h-11 items-center rounded-[10px] border border-[var(--cat-border)] px-4 text-[13px] font-bold">
            Browse the menu
          </a>
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-4 py-5">
        <ol className="mb-4 flex items-center gap-2 text-[12px] font-bold">
          <StepCue n={1} label="Details" accent={catalog.accent} />
          <span className="text-[var(--cat-border)]">→</span>
          <StepCue n={2} label="Time" accent={catalog.accent} />
          <span className="text-[var(--cat-border)]">→</span>
          <StepCue n={3} label="Table" muted />
        </ol>

        <section className="rounded-[14px] border border-[var(--cat-border)] bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cat-muted)]">1 · Your details</div>
          <label className="mb-3 block text-[12px] font-bold text-[var(--cat-muted)]">
            Name for the booking
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1.5 h-12 w-full rounded-[10px] border border-[var(--cat-border)] px-3 font-normal text-[var(--cat-ink)]"
            />
          </label>
          <label className="mb-3 block text-[12px] font-bold text-[var(--cat-muted)]">
            Mobile number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              className="mt-1.5 h-12 w-full rounded-[10px] border border-[var(--cat-border)] px-3 font-normal text-[var(--cat-ink)]"
            />
          </label>
          <div className="mb-3">
            <div className="mb-2 text-[12px] font-bold text-[var(--cat-muted)]">How many people</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setGuests((n) => Math.max(rest.guestMin, n - 1))} className="h-11 w-11 rounded-[10px] border border-[var(--cat-border)] text-lg font-bold">
                −
              </button>
              <div className="font-catalog-display flex-1 text-center text-[28px] font-semibold">{guests}</div>
              <button type="button" onClick={() => setGuests((n) => Math.min(rest.guestMax, n + 1))} className="h-11 w-11 rounded-[10px] bg-[var(--cat-accent)] text-lg font-bold text-white">
                +
              </button>
            </div>
          </div>
          <label className="block text-[12px] font-bold text-[var(--cat-muted)]">
            Occasion or request
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-[10px] border border-[var(--cat-border)] px-3 font-normal text-[var(--cat-ink)]"
            />
          </label>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 pb-2 md:grid-cols-2">
          <Picker label="2 · Day" options={days.map((d) => ({ id: d.iso, label: d.label }))} value={day} onChange={setDay} accent={catalog.accent} />
          <Picker label="2 · Time" options={rest.timeSlots.map((t) => ({ id: t, label: t }))} value={slot} onChange={setSlot} accent={catalog.accent} />
        </div>

        <section className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cat-muted)]">3 · Table · optional</div>
          <p className="mb-3 text-[13px] text-[var(--cat-muted)]">
            Want a table? Tap one or more, or skip — no preference.
          </p>
          {hasPublishedPlan ? (
            <ReserveMap
              floors={floors}
              selectedIds={tableIds}
              onToggle={toggleTable}
              reserved={reserved}
              accent={catalog.accent}
            />
          ) : tables.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {tables.map((t) => {
                const held = reserved.some((row) => row.id === t.id);
                const on = tableIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={held}
                    onClick={() => toggleTable(t.id)}
                    className="flex h-[72px] flex-col items-center justify-center rounded-[12px] border disabled:cursor-not-allowed"
                    style={{
                      background: held ? "rgba(138,147,162,0.22)" : on ? catalog.accent : "#fff",
                      borderColor: on ? catalog.accent : "var(--cat-border)",
                      color: on && !held ? "#fff" : "var(--cat-ink)",
                    }}
                  >
                    <span className="text-[17px] font-bold">{t.no}</span>
                    <span className="text-[11px] opacity-80">{held ? "Reserved" : `${t.seats} seats`}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-[14px] border border-[var(--cat-border)] bg-white px-4 py-3 text-[13px] text-[var(--cat-muted)]">
              No floor map yet — book with party size and we&apos;ll seat you.
            </p>
          )}
          {picked.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {picked.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTable(t.id)}
                  className="inline-flex h-9 items-center rounded-full border px-3 text-[13px] font-bold"
                  style={{ borderColor: catalog.accent, color: catalog.accent, background: "#fff" }}
                >
                  Table {t.no} ×
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--cat-muted)]">No table preference — we&apos;ll seat you.</p>
          )}
          {tightSeats ? (
            <p className="mt-2 text-[13px] text-[#c27c0e]">
              Those tables seat {seats}, and you have {guests} guests. You can still book — we&apos;ll make it work.
            </p>
          ) : null}
        </section>

        <ReserveMenu catalog={catalog} />
      </main>

      <div className="shrink-0 border-t border-[var(--cat-border)] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-bold">
              {picked.length > 0 ? picked.map((t) => `Table ${t.no}`).join(" + ") : "No table preference — we'll seat you"}
            </div>
            <div className="text-[12.5px] text-[var(--cat-muted)]">
              {dayLabel} · {slot} · {guests} guests
              {itemCount > 0 ? ` · ${itemCount} ${itemCount === 1 ? "dish" : "dishes"}` : " · food optional"}
            </div>
          </div>
          {error ? <p className="w-full text-sm text-red-600 sm:w-auto">{error}</p> : null}
          <button
            type="button"
            disabled={!canBook || pending}
            onClick={() => void book()}
            className="h-12 rounded-[10px] px-6 font-bold text-white disabled:bg-[var(--cat-photo-bg)] disabled:text-[var(--cat-muted)]"
            style={{ background: canBook ? catalog.accent : undefined }}
          >
            {pending ? "Booking…" : foodLines.length > 0 ? "Book table and food" : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCue({ n, label, accent, muted }: { n: number; label: string; accent?: string; muted?: boolean }) {
  return (
    <li className="inline-flex items-center gap-1.5" style={{ color: muted ? "var(--cat-muted)" : "var(--cat-ink)" }}>
      <span
        className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-white"
        style={{ background: muted ? "var(--cat-muted)" : accent }}
      >
        {n}
      </span>
      {label}
    </li>
  );
}

function Picker({
  label,
  options,
  value,
  onChange,
  accent,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  accent: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--cat-border)] bg-white p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cat-muted)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="h-10 rounded-full border px-3 text-[13px] font-bold"
            style={{
              background: value === opt.id ? accent : "#fff",
              color: value === opt.id ? "#fff" : "var(--cat-muted)",
              borderColor: value === opt.id ? accent : "var(--cat-border)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
