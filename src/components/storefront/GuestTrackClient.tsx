"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/catalog/currency";
import { formatOrderDateTime } from "@/lib/catalog/order-statuses";
import { telHref } from "@/lib/catalog/merchandising";
import type { GuestTrackTicket } from "@/lib/catalog/guest-track";

const STORAGE_PREFIX = "guest-track-number:";

export function GuestTrackClient({
  host,
  token,
  shopName,
  shopPhone,
  accent,
  currency,
}: {
  host: string;
  token: string;
  shopName: string;
  shopPhone: string;
  accent: string;
  currency: string;
}) {
  const [phone, setPhone] = useState("");
  const [ticket, setTicket] = useState<GuestTrackTicket | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const tel = telHref(shopPhone);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${token}`);
      if (saved) {
        setPhone(saved);
        void unlock(saved, true);
      }
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore
  }, [token]);

  async function unlock(value = phone, silent = false) {
    const entered = value.trim();
    if (!entered) {
      if (!silent) setError("Enter the number you used.");
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/catalog/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, token, phone: entered }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; ticket?: GuestTrackTicket } | null;
    setPending(false);
    if (!res.ok || !data?.ticket) {
      setTicket(null);
      setError(data?.error || "Could not open this ticket.");
      return;
    }
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${token}`, entered);
    } catch {
      /* ignore */
    }
    setTicket(data.ticket);
  }

  async function cancelTicket() {
    if (!ticket?.canCancel) return;
    setCancelPending(true);
    setError("");
    const res = await fetch("/api/catalog/track", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, token, phone, action: "cancel" }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; ticket?: GuestTrackTicket } | null;
    setCancelPending(false);
    if (!res.ok || !data?.ticket) {
      setError(data?.error || "Could not cancel. Call the shop.");
      return;
    }
    setTicket(data.ticket);
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4"
      style={{
        paddingTop: "max(1.25rem, calc(env(safe-area-inset-top) + 0.75rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1.25rem))",
      }}
    >
      <header className="rounded-[18px] border border-[var(--cat-border)] bg-white/90 p-4 backdrop-blur-xl">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
          {ticket?.kind === "reservation" ? "Booking status" : ticket ? "Order status" : "Track"}
        </p>
        <h1 className="m-0 mt-1 font-catalog-display text-[22px] font-semibold tracking-[-0.02em] text-[var(--cat-ink)]">
          {shopName}
        </h1>
      </header>

      {ticket ? (
        <TicketCard
          ticket={ticket}
          currency={currency}
          accent={accent}
          shopPhone={shopPhone}
          tel={tel}
          error={error}
          cancelPending={cancelPending}
          onCancel={() => void cancelTicket()}
        />
      ) : (
        <form
          className="mt-3 rounded-[18px] border border-[var(--cat-border)] bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void unlock();
          }}
        >
          <h2 className="m-0 font-catalog-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--cat-ink)]">
            Enter your number
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-muted)]">
            Use the phone number you entered — or the table number for a dine-in QR order.
          </p>
          <label className="mt-5 block text-[12px] font-bold text-[var(--cat-muted)]">
            Customer number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              className="mt-1.5 min-h-12 w-full rounded-[12px] border border-[var(--cat-border)] px-3 text-[16px] text-[var(--cat-ink)]"
            />
          </label>
          {error ? <p className="mt-3 text-[14px] text-[#b42318]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-[12px] text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-70 motion-reduce:active:scale-100"
            style={{ background: accent }}
          >
            {pending ? "Opening…" : "View status"}
          </button>
        </form>
      )}

      {!ticket && shopPhone ? (
        <a
          href={tel ?? undefined}
          className="mt-3 flex min-h-12 items-center justify-center rounded-[14px] border border-[var(--cat-border)] bg-white text-[15px] font-semibold text-[var(--cat-ink)] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          Call {shopPhone}
        </a>
      ) : null}
    </main>
  );
}

function TicketCard({
  ticket,
  currency,
  accent,
  shopPhone,
  tel,
  error,
  cancelPending,
  onCancel,
}: {
  ticket: GuestTrackTicket;
  currency: string;
  accent: string;
  shopPhone: string;
  tel: string | null;
  error: string;
  cancelPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <section className="rounded-[18px] border border-[var(--cat-border)] bg-white px-5 py-6 text-center">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
          Current status
        </p>
        <h2 className="m-0 mt-1.5 font-catalog-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--cat-ink)]">
          {ticket.statusLabel}
        </h2>
        <p className="m-0 mt-1.5 text-[13px] text-[var(--cat-muted)]">
          {ticket.kind === "reservation"
            ? [ticket.day, ticket.slot, ticket.guests ? `${ticket.guests} guests` : "", ticket.tableNo ? `Table ${ticket.tableNo}` : ""]
                .filter(Boolean)
                .join(" · ")
            : [ticket.fulfillment === "dine_in" ? "Dine-in" : ticket.fulfillment === "delivery" ? "Delivery" : ticket.fulfillment === "pickup" ? "Pickup" : "", ticket.tableNo ? `Table ${ticket.tableNo}` : ""]
                .filter(Boolean)
                .join(" · ")}
        </p>
        <p className="m-0 mt-1 text-[12px] text-[var(--cat-muted)]">
          Placed {formatOrderDateTime(ticket.createdAt)}
        </p>
      </section>

      <section className="rounded-[18px] border border-[var(--cat-border)] bg-white p-4.5">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
          {ticket.kind === "reservation" ? "Booking" : "Reference"}
        </p>
        <p className="m-0 mt-1 text-[16px] font-semibold text-[var(--cat-ink)]">{ticket.reference}</p>
        {ticket.note ? <p className="m-0 mt-2 text-[13px] text-[var(--cat-muted)]">{ticket.note}</p> : null}
      </section>

      {ticket.items.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-[18px] border border-[var(--cat-border)] bg-white p-4.5">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">Items</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {ticket.items.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[14px] leading-snug text-[var(--cat-ink)]">
                    {line.qty}× {line.name}
                  </p>
                  {line.options ? <p className="m-0 mt-0.5 text-[12px] text-[var(--cat-muted)]">{line.options}</p> : null}
                </div>
                <p className="m-0 shrink-0 text-[14px] tabular-nums text-[var(--cat-ink)]">
                  {formatMoney(line.total, currency)}
                </p>
              </li>
            ))}
          </ul>
          {ticket.total != null ? (
            <p className="m-0 flex items-baseline justify-between border-t border-[var(--cat-border)] pt-3">
              <span className="text-[13px] text-[var(--cat-muted)]">Total</span>
              <span className="text-[20px] font-semibold tabular-nums tracking-tight text-[var(--cat-ink)]">
                {formatMoney(ticket.total, currency)}
              </span>
            </p>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="px-1 text-[14px] text-[#b42318]">{error}</p> : null}

      {ticket.canCancel ? (
        <button
          type="button"
          disabled={cancelPending}
          onClick={onCancel}
          className="flex min-h-12 items-center justify-center rounded-[14px] border border-[var(--cat-border)] bg-white text-[15px] font-semibold text-[var(--cat-ink)] active:scale-[0.98] disabled:opacity-70 motion-reduce:active:scale-100"
        >
          {cancelPending ? "Cancelling…" : ticket.kind === "reservation" ? "Cancel booking" : "Cancel order"}
        </button>
      ) : (
        <p className="px-1 text-center text-[13px] leading-relaxed text-[var(--cat-muted)]">
          {shopPhone
            ? `Need a change? Call ${shopPhone}.`
            : "This can no longer be changed online. Ask the shop."}
        </p>
      )}

      {shopPhone && tel ? (
        <a
          href={tel}
          className="flex min-h-12 items-center justify-center rounded-[14px] text-[15px] font-semibold text-white active:scale-[0.98] motion-reduce:active:scale-100"
          style={{ background: accent }}
        >
          Call {shopPhone}
        </a>
      ) : null}
    </div>
  );
}
