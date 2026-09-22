import { PhoneFrame } from "@/components/marketing/DeviceFrame";
import { ops, OpsScreen, TicketCard } from "@/components/marketing/ops-ui";
import { OPS_MENU, OPS_STORE, OPS_TABLE_REQUEST, OPS_TICKETS, ticketsFor } from "@/lib/marketing/ops-sample";

export function OpsNowPhone() {
  return (
    <PhoneFrame label="Ops on phone — Now. Hear it, then bump the ticket.">
      <OpsScreen nav="Now">
        <div className="space-y-2.5 px-3 py-3">
          <div className="rounded-2xl border border-[#e4e6e9] bg-white px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5b6470]">New orders</p>
            <p className="text-[44px] font-bold leading-none text-[#12151a]">{ticketsFor("new").length}</p>
            <p className="mt-1 text-[11px] text-[#8b94a0]">Waiting to be accepted</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b6470]">Table requests</p>
          <div
            className="flex items-center gap-2 rounded-[14px] border px-3 py-2.5"
            style={{ background: ops.requestBg, borderColor: ops.request }}
          >
            <span className="text-[12px] font-bold" style={{ color: ops.request }}>
              {OPS_TABLE_REQUEST.table} · Call waiter
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b6470]">Store controls</p>
          <div className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
            <ControlRow title="Pause new orders" sub="Guests can't check out. Tickets still finish." on={false} />
            <ControlRow title="Close kitchen" sub="Guests see the store as closed." on={false} last />
          </div>
        </div>
      </OpsScreen>
    </PhoneFrame>
  );
}

export function OpsAlarmPhone() {
  return (
    <PhoneFrame chrome="dark" bleed label="New ticket alarm — loud, full screen, one tap to accept.">
      <div className="flex h-[26.25rem] flex-col text-white" style={{ background: ops.new }} aria-hidden>
        <div className="flex items-center px-3.5 pb-2.5 pt-12 text-[11px] font-bold">
          {OPS_STORE}
          <span className="ml-auto flex items-center gap-1.5 font-semibold text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Live
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#ea580c]">
            New
          </span>
          <p className="mt-4 text-[11px] font-bold tracking-[0.14em]">NEW · DINE-IN</p>
          <p className="mt-3 text-[12px] font-semibold text-white/70">TABLE</p>
          <p className="text-[84px] font-bold leading-none">5</p>
          <p className="mt-2 text-[13px] font-semibold">3 items · Placed just now</p>
          <span className="mt-3 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">Ringing…</span>
        </div>
        <div className="px-3.5 pb-4">
          <span className="flex min-h-12 items-center justify-center rounded-[16px] bg-white text-[15px] font-bold text-[#ea580c]">
            Accept & start
          </span>
          <p className="mt-2 text-center text-[12px] font-semibold text-white/70">View all new</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function OpsOrdersPhone() {
  return (
    <PhoneFrame label="Phone list — one-tap New → Preparing → Ready → Done.">
      <OpsScreen nav="Orders">
        <div className="space-y-2 overflow-hidden px-3 py-3">
          {OPS_TICKETS.filter((row) => row.status !== "done")
            .slice(0, 3)
            .map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
        </div>
      </OpsScreen>
    </PhoneFrame>
  );
}

export function OpsMenu86Phone() {
  return (
    <PhoneFrame label="86 an item — Available or Sold out, same list guests see.">
      <OpsScreen nav="Menu">
        <div className="px-3 py-2.5">
          <div className="mb-2 rounded-[12px] border border-[#e4e6e9] bg-white px-3 py-2 text-[12px] text-[#8b94a0]">
            Search the menu
          </div>
          <div className="overflow-hidden rounded-[14px] border border-[#e4e6e9] bg-white">
            {OPS_MENU.slice(0, 6).map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-3 py-2 ${i > 0 ? "border-t border-[#f0f1f3]" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#12151a]">{item.name}</p>
                  <p className="font-mono text-[10px] text-[#8b94a0]">{item.code}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.available ? "bg-[#e7f8ec] text-[#16a34a]" : "bg-[#fdeaea] text-[#dc2626]"
                  }`}
                >
                  {item.available ? "Available" : "Sold out"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </OpsScreen>
    </PhoneFrame>
  );
}

function ControlRow({ title, sub, on, last }: { title: string; sub: string; on: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${last ? "" : "border-b border-[#e4e6e9]"}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#12151a]">{title}</p>
        <p className="text-[10px] leading-snug text-[#8b94a0]">{sub}</p>
      </div>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full ${on ? "bg-[#16a34a]" : "bg-[#cbd0d6]"}`}
        aria-hidden
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${on ? "right-0.5" : "left-0.5"}`} />
      </span>
    </div>
  );
}
