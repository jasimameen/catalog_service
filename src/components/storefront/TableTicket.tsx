"use client";

import { useCallback, useState } from "react";
import { useLiveRefresh } from "@/lib/catalog/live-orders";

export type TableTicketRound = {
  id: string;
  reference: string;
  status: string;
  open: boolean;
  createdAt: string;
  items: { name: string; qty: number; extras: string; notes: string }[];
};

export type TableTicketData = {
  tableNo: string;
  rounds: TableTicketRound[];
  itemCount: number;
};

export function useTableTicket(catalogId: string, tableNo: string) {
  const [ticket, setTicket] = useState<TableTicketData | null>(null);

  const refresh = useCallback(async () => {
    if (!catalogId || !tableNo) {
      setTicket(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/catalog/table-ticket?catalogId=${encodeURIComponent(catalogId)}&tableNo=${encodeURIComponent(tableNo)}`,
      );
      const data = (await res.json().catch(() => null)) as TableTicketData | null;
      if (!res.ok || !data) return;
      setTicket(data);
    } catch {
      // poll retries
    }
  }, [catalogId, tableNo]);

  useLiveRefresh(refresh, 4000);
  return { ticket, refresh };
}

export function TableTicketList({
  ticket,
  empty,
}: {
  ticket: TableTicketData | null;
  empty?: string;
}) {
  if (!ticket || ticket.itemCount === 0) {
    return <p className="m-0 text-[12.5px] text-white/70">{empty ?? "Nothing sent yet. Add dishes, then send to the kitchen."}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-white/90">
      {ticket.rounds.flatMap((round) =>
        round.items.map((line, index) => (
          <li key={`${round.id}-${index}`}>
            {line.qty}× {line.name}
            {line.extras ? ` · ${line.extras}` : ""}
            {round.open ? "" : " · done"}
          </li>
        )),
      )}
    </ul>
  );
}
