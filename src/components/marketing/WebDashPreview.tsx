import { dashCard, dashKicker } from "@/components/admin/dashboard/styles";

const NAV = ["Dashboard", "Orders", "Items", "Floor", "Share", "Domains"] as const;

const TILES = [
  { label: "Items", note: "Photos, prices, 86" },
  { label: "Floor", note: "Tables and rooms" },
  { label: "Share", note: "QR per table or one code" },
  { label: "Orders", note: "Tickets and reserve" },
] as const;

export function WebDashPreview() {
  return (
    <div className={`${dashCard} text-left shadow-[0_28px_56px_-32px_rgba(16,23,32,0.35)]`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f4] px-4 py-3">
        <span className="inline-flex min-h-9 items-center rounded-full bg-[#dff5e6] px-3 text-[12px] font-medium text-[#1e9e4a]">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#1e9e4a]" />
          Live
        </span>
        <span className="inline-flex min-h-9 items-center rounded-full bg-[#eef1f5] px-3 text-[12px] text-[#46505e]">
          Taking orders
        </span>
        <span className="text-[13px] text-[#5a6472]">Harbor Kitchen · Restaurant Menu · 10 items</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item, i) => (
          <span
            key={item}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-[9px] px-3 text-[13px] ${
              i === 0 ? "bg-[#eef1f6] font-medium text-[var(--cat-ink)]" : "text-[#5a6472]"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {TILES.map((stat) => (
          <div key={stat.label} className="rounded-[12px] bg-[#fbfbfd] px-3 py-2.5">
            <p className="text-[15px] font-semibold tracking-tight">{stat.label}</p>
            <p className={`${dashKicker} mt-1 normal-case tracking-normal`}>{stat.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
