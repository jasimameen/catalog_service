import { TabletFrame } from "@/components/marketing/DeviceFrame";
import { StoreStrip, TicketCard } from "@/components/marketing/ops-ui";
import { ticketsFor, type OpsStatus } from "@/lib/marketing/ops-sample";

const LANES: { id: OpsStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "preparing", label: "In kitchen" },
  { id: "ready", label: "Ready" },
  { id: "done", label: "Done" },
];

export function OpsTabletBoard() {
  return (
    <TabletFrame label="iPad kitchen board — four lanes, same tickets as the phone.">
      <div className="text-left" aria-hidden>
        <div className="flex">
          <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-[#e4e6e9] bg-white py-3 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#16a34a] text-[11px] font-bold text-white">
              IC
            </span>
            {["Now", "Orders", "Menu", "More"].map((item, i) => (
              <span
                key={item}
                className={`mt-4 text-[9px] font-semibold ${i === 1 ? "text-[#16a34a]" : "text-[#5b6470]"}`}
              >
                {item}
              </span>
            ))}
          </aside>
          <div className="min-w-0 flex-1">
            <StoreStrip compact />
            <div className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-4">
              {LANES.map((lane) => {
                const rows = ticketsFor(lane.id);
                return (
                  <section key={lane.id} className="min-w-0 rounded-[12px] bg-[#eef0f2] p-1.5">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <h3 className="text-[11px] font-bold text-[#12151a]">{lane.label}</h3>
                      <span className="text-[10px] font-semibold tabular-nums text-[#8b94a0]">{rows.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {rows.length === 0 ? (
                        <p className="px-1 py-6 text-center text-[11px] text-[#8b94a0]">Quiet</p>
                      ) : (
                        rows.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} compact />)
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TabletFrame>
  );
}
