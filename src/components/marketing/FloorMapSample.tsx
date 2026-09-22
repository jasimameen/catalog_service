import { CadItem, CadTable } from "@/components/admin/FloorSymbols";
import { boundsOf, itemOf, parseKey, rectTiles, type StudioFloor } from "@/lib/catalog/floor-plan";

const ACCENT = "#0b5fce";
const CELL = 34;

const FLOOR: StudioFloor = {
  id: "harbor-ground",
  name: "Ground floor",
  tiles: rectTiles(0, 0, 12, 8),
  items: [
    { id: "kitchen", kind: "kitchen", x: 0, y: 0, w: 4, h: 2 },
    { id: "host", kind: "host", x: 4, y: 0, w: 1, h: 1 },
    { id: "door", kind: "entrance", x: 5, y: 0, w: 1, h: 2 },
    { id: "window", kind: "window", x: 6, y: 0, w: 2, h: 1 },
    { id: "plants", kind: "planters", x: 8, y: 0, w: 1, h: 1 },
    { id: "wc", kind: "restroom", x: 10, y: 0, w: 2, h: 2 },
    { id: "waiter", kind: "waiter", x: 11, y: 6, w: 1, h: 1 },
  ],
  tables: [
    { id: "t1", no: "1", x: 0, y: 3, seats: 4, w: 2, h: 2, shape: "booth", status: "open" },
    { id: "t2", no: "2", x: 0, y: 6, seats: 4, w: 2, h: 2, shape: "booth", status: "open" },
    { id: "t3", no: "3", x: 3, y: 3, seats: 4, w: 2, h: 2, shape: "square", status: "open" },
    { id: "t4", no: "4", x: 6, y: 3, seats: 4, w: 2, h: 2, shape: "square", status: "open" },
    { id: "t5", no: "5", x: 9, y: 3, seats: 4, w: 2, h: 2, shape: "square", status: "open" },
    { id: "t6", no: "6", x: 3, y: 6, seats: 4, w: 2, h: 2, shape: "square", status: "open" },
    { id: "t7", no: "7", x: 6, y: 6, seats: 4, w: 2, h: 2, shape: "square", status: "open" },
    { id: "t8", no: "8", x: 9, y: 6, seats: 2, w: 1, h: 1, shape: "round", status: "closed" },
  ],
};

const MARKS: Record<string, { kind: "reserved" | "waiter" | "bill" | "seated"; label: string }> = {
  t3: { kind: "reserved", label: "7:30 · 4" },
  t1: { kind: "waiter", label: "Waiter" },
  t5: { kind: "bill", label: "Bill" },
  t2: { kind: "seated", label: "Seated" },
};

export function FloorMapSample() {
  const bounds = boundsOf(FLOOR, 0);
  const width = bounds.cols * CELL;
  const height = bounds.rows * CELL;

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-[var(--cat-surface)] shadow-[0_28px_56px_-32px_rgba(16,23,32,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">
            Floor studio
          </p>
          <p className="text-[0.9375rem] font-semibold tracking-tight">{FLOOR.name} · Harbor Kitchen</p>
        </div>
        <p className="text-[0.75rem] text-[var(--cat-muted)]">8 tables · same map guests pick for reserve</p>
      </div>
      <div className="overflow-x-auto bg-[#f4f6f9] px-3 pb-3">
        <div
          className="relative mx-auto"
          style={{
            width,
            height,
            backgroundImage:
              "linear-gradient(var(--cat-border) 1px, transparent 1px), linear-gradient(90deg, var(--cat-border) 1px, transparent 1px)",
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
          role="img"
          aria-label="Harbor Kitchen ground floor. Table 3 reserved at 7:30, table 1 waiter, table 5 bill, table 8 closed."
        >
          {FLOOR.tiles.map((tile) => {
            const c = parseKey(tile);
            return (
              <div
                key={tile}
                className="absolute bg-white"
                style={{
                  left: (c.x - bounds.minX) * CELL,
                  top: (c.y - bounds.minY) * CELL,
                  width: CELL,
                  height: CELL,
                  boxShadow: "inset -1px -1px 0 var(--cat-border), inset 1px 1px 0 var(--cat-border)",
                }}
              />
            );
          })}
          {FLOOR.items.map((item) => {
            const def = itemOf(item.kind);
            return (
              <div
                key={item.id}
                className="absolute"
                title={def.label}
                style={{
                  left: (item.x - bounds.minX) * CELL,
                  top: (item.y - bounds.minY) * CELL,
                  width: item.w * CELL,
                  height: item.h * CELL,
                  zIndex: 1,
                }}
              >
                <CadItem kind={item.kind} accent={ACCENT} showLabel={item.w * CELL >= 72} />
              </div>
            );
          })}
          {FLOOR.tables.map((table) => {
            const mark = MARKS[table.id];
            const reserved = mark?.kind === "reserved";
            const closed = table.status === "closed";
            const selected = mark?.kind === "seated";
            return (
              <div
                key={table.id}
                className="absolute"
                style={{
                  left: (table.x - bounds.minX) * CELL,
                  top: (table.y - bounds.minY) * CELL,
                  width: Math.max(48, table.w * CELL),
                  height: Math.max(48, table.h * CELL),
                  zIndex: 2,
                  opacity: reserved ? 0.7 : 1,
                }}
              >
                <CadTable
                  shape={table.shape}
                  seats={table.seats}
                  no={table.no}
                  selected={selected}
                  closed={closed}
                  reserved={reserved}
                  accent={ACCENT}
                />
                {mark ? (
                  <span
                    className={`pointer-events-none absolute inset-x-0.5 bottom-0.5 truncate rounded-[4px] px-0.5 text-center text-[9px] font-bold leading-4 text-white ${
                      mark.kind === "waiter"
                        ? "bg-[#c026d3]"
                        : mark.kind === "bill"
                          ? "bg-[#101720]"
                          : "bg-[rgba(16,23,32,0.62)]"
                    }`}
                  >
                    {mark.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 text-[0.72rem] text-[var(--cat-muted)]">
        <Legend swatch="border border-[var(--cat-ink)] bg-white" label="Open" />
        <Legend swatch="bg-[#0b5fce]" label="Seated" />
        <Legend swatch="bg-[rgba(138,147,162,0.45)]" label="Reserved" />
        <Legend swatch="bg-[#c026d3]" label="Waiter" />
        <Legend swatch="bg-[#101720]" label="Bill" />
        <Legend swatch="border border-dashed border-[var(--cat-border)] bg-[var(--cat-photo-bg)]" label="Closed" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}
