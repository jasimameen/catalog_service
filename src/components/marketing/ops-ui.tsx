import type { ReactNode } from "react";
import {
  fulfillmentLabel,
  OPS_STORE,
  type OpsStatus,
  type OpsTicket,
} from "@/lib/marketing/ops-sample";

/** Flutter ops palette — used only inside product mocks. */
export const ops = {
  bg: "#f4f5f7",
  surface: "#ffffff",
  border: "#e4e6e9",
  text: "#12151a",
  dim: "#5b6470",
  faint: "#8b94a0",
  new: "#ea580c",
  newBg: "#ffede0",
  preparing: "#2563eb",
  preparingBg: "#e7eeff",
  ready: "#16a34a",
  readyBg: "#e7f8ec",
  done: "#6b7280",
  doneBg: "#eef0f2",
  request: "#c026d3",
  requestBg: "#fce9fc",
  cancelled: "#dc2626",
  cancelledBg: "#fdeaea",
} as const;

const STATUS: Record<OpsStatus, { fg: string; bg: string; label: string }> = {
  new: { fg: ops.new, bg: ops.newBg, label: "NEW" },
  preparing: { fg: ops.preparing, bg: ops.preparingBg, label: "PREPARING" },
  ready: { fg: ops.ready, bg: ops.readyBg, label: "READY" },
  done: { fg: ops.done, bg: ops.doneBg, label: "DONE" },
};

const ACTION_BG: Record<OpsStatus, string> = {
  new: ops.ready,
  preparing: ops.preparing,
  ready: ops.ready,
  done: ops.done,
};

export function StatusPill({ status, dense }: { status: OpsStatus; dense?: boolean }) {
  const tone = STATUS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-[0.03em] ${
        dense ? "h-5 px-2 text-[9px]" : "h-6 px-2.5 text-[10px]"
      }`}
      style={{ color: tone.fg, background: tone.bg }}
    >
      {tone.label}
    </span>
  );
}

export function StoreStrip({ compact }: { compact?: boolean }) {
  return (
    <div className={`border-b border-[#e4e6e9] bg-white ${compact ? "px-3 py-2" : "px-3.5 py-2.5"}`}>
      <div className="flex items-center gap-2">
        <p className={`font-semibold text-[#12151a] ${compact ? "text-[13px]" : "text-[15px]"}`}>{OPS_STORE}</p>
        <span className="ml-auto h-2 w-2 rounded-full bg-[#16a34a]" aria-hidden />
        <span className="text-[11px] font-semibold text-[#5b6470]">Live</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[#e7f8ec] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">Taking orders</span>
        <span className="rounded-full border border-[#cbd0d6] bg-[#f0f1f3] px-2 py-0.5 text-[10px] font-bold text-[#5b6470]">
          Kitchen open
        </span>
      </div>
    </div>
  );
}

export function OpsBottomNav({ active }: { active: "Now" | "Orders" | "Menu" | "More" }) {
  const items = ["Now", "Orders", "Menu", "More"] as const;
  return (
    <nav className="grid grid-cols-4 border-t border-[#e4e6e9] bg-white pb-2" aria-label="Ops tabs">
      {items.map((item) => {
        const on = item === active;
        return (
          <span
            key={item}
            className={`flex min-h-12 flex-col items-center justify-center text-[10px] ${
              on ? "font-bold text-[#16a34a]" : "font-semibold text-[#5b6470]"
            }`}
          >
            {item === "Orders" ? (
              <span className="relative">
                <span>Orders</span>
                <span className="absolute -right-3 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ea580c] px-0.5 text-[8px] font-bold text-white">
                  2
                </span>
              </span>
            ) : (
              item
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function TicketCard({ ticket, compact }: { ticket: OpsTicket; compact?: boolean }) {
  const isNew = ticket.status === "new";
  return (
    <article
      className={`border bg-white ${compact ? "rounded-[12px] p-2.5" : "rounded-[16px] p-3"}`}
      style={{
        borderColor: isNew ? ops.new : ops.border,
        borderWidth: isNew || compact ? 1.5 : 1,
      }}
    >
      <div className="flex items-center gap-1.5">
        <StatusPill status={ticket.status} dense={compact} />
        {!compact ? (
          <span className="text-[11px] font-semibold text-[#5b6470]">{fulfillmentLabel(ticket.type)}</span>
        ) : null}
        <span className="ml-auto text-[10px] font-semibold text-[#8b94a0]">{ticket.when}</span>
      </div>
      {compact ? (
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8b94a0]">
          {fulfillmentLabel(ticket.type)}
        </p>
      ) : null}
      <p className={`mt-1 font-bold leading-none text-[#12151a] ${compact ? "text-[18px]" : "text-[26px]"}`}>
        {ticket.reference}
      </p>
      <p className="mt-1 truncate text-[11px] text-[#5b6470]">
        {ticket.itemCount} item{ticket.itemCount === 1 ? "" : "s"}
        {compact ? "" : ` · ${ticket.summary}`}
      </p>
      {ticket.duplicate && !compact ? (
        <span className="mt-1.5 inline-flex rounded-full border border-[#ea580c] px-2 py-0.5 text-[9px] font-bold text-[#ea580c]">
          Possible duplicate
        </span>
      ) : null}
      {ticket.status !== "done" ? (
        <span
          className={`mt-2 flex w-full items-center justify-center rounded-[10px] font-bold text-white ${
            compact ? "min-h-9 text-[11px]" : "min-h-11 text-[13px]"
          }`}
          style={{ background: ACTION_BG[ticket.status] }}
        >
          {ticket.action}
        </span>
      ) : null}
    </article>
  );
}

export function OpsScreen({
  children,
  nav,
}: {
  children: ReactNode;
  nav: "Now" | "Orders" | "Menu" | "More";
}) {
  return (
    <div className="flex h-[26.25rem] flex-col bg-[#f4f5f7] text-left" aria-hidden>
      <StoreStrip />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <OpsBottomNav active={nav} />
    </div>
  );
}
