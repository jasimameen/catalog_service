"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setDayService } from "./actions";

export function DayOpsStrip({
  catalogId,
  acceptOrders,
  kitchenOpen,
  openTickets,
  bookedToday,
}: {
  catalogId: string;
  acceptOrders: boolean;
  kitchenOpen: boolean;
  openTickets: number;
  bookedToday: number;
}) {
  const router = useRouter();
  const [taking, setTaking] = useState(acceptOrders);
  const [kitchen, setKitchen] = useState(kitchenOpen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleOrders() {
    const next = !taking;
    setTaking(next);
    setError(null);
    startTransition(async () => {
      const result = await setDayService(catalogId, { acceptOrders: next });
      if (result.error) {
        setTaking(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleKitchen() {
    const next = !kitchen;
    setKitchen(next);
    setError(null);
    startTransition(async () => {
      const result = await setDayService(catalogId, { kitchenOpen: next });
      if (result.error) {
        setKitchen(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[16px] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,23,32,0.04)] sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] uppercase tracking-[0.06em] text-[#86868b]">Today</p>
          <p className="m-0 mt-1 text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--cat-ink)]">
            {taking ? "Taking orders" : "Orders paused"}
          </p>
          <p className="m-0 mt-1 text-[13px] text-[#5a6472]">
            {kitchen ? "Kitchen open" : "Kitchen closed"}
            {pending ? " · Saving" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleOrders}
            disabled={pending}
            className={`ops-press inline-flex min-h-11 items-center rounded-[11px] px-4 text-[14px] font-semibold ${
              taking
                ? "bg-[#fff3d6] text-[#8a5a00]"
                : "bg-[#101720] text-white"
            }`}
          >
            {taking ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={toggleKitchen}
            disabled={pending}
            className="ops-press inline-flex min-h-11 items-center rounded-[11px] bg-black/[0.04] px-4 text-[14px] font-medium text-[var(--cat-ink)]"
          >
            {kitchen ? "Close kitchen" : "Open kitchen"}
          </button>
        </div>
      </div>
      {error ? <p className="m-0 mt-3 text-[13px] text-[#b42318]">{error}</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
        <Link
          href={`/admin/${catalogId}/orders`}
          className="ops-press flex min-h-14 items-center justify-between rounded-[12px] bg-[#f4f6f9] px-3.5 no-underline"
        >
          <span>
            <span className="block text-[13px] text-[#86868b]">Needs a tap</span>
            <span className="mt-0.5 block text-[17px] font-semibold tracking-tight text-[var(--cat-ink)]">
              {openTickets} {openTickets === 1 ? "ticket" : "tickets"}
            </span>
          </span>
          <span className="text-[13px] text-[#0b5fce]">Orders</span>
        </Link>
        <Link
          href={`/admin/${catalogId}/orders?inbox=reservations`}
          className="ops-press flex min-h-14 items-center justify-between rounded-[12px] bg-[#f4f6f9] px-3.5 no-underline"
        >
          <span>
            <span className="block text-[13px] text-[#86868b]">Booked today</span>
            <span className="mt-0.5 block text-[17px] font-semibold tracking-tight text-[var(--cat-ink)]">
              {bookedToday} {bookedToday === 1 ? "booking" : "bookings"}
            </span>
          </span>
          <span className="text-[13px] text-[#0b5fce]">Reservations</span>
        </Link>
      </div>
    </section>
  );
}
