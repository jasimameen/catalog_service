"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { CadItem, CadTable } from "@/components/admin/FloorSymbols";
import {
  accentShadow,
  boundsOf,
  CELL,
  flattenGuestTables,
  itemOf,
  parseKey,
  type GuestFloorTable,
  type StudioFloor,
} from "@/lib/catalog/floor-plan";

const CANVAS = "#f4f6f9";
const MIN_HIT = 48;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));
}

function isOpen(status: string | undefined, bookable: boolean | undefined): boolean {
  return bookable !== false && status !== "closed" && status !== "out";
}

export type ReserveMapMark = { id: string; label: string };

export function ReserveMap({
  floors,
  selectedIds,
  onToggle,
  reserved,
  accent,
}: {
  floors: StudioFloor[];
  selectedIds: string[];
  onToggle: (tableId: string) => void;
  reserved: ReserveMapMark[];
  accent: string;
}) {
  const guestById = useMemo(() => {
    const map = new Map<string, GuestFloorTable>();
    for (const row of flattenGuestTables({ floors })) map.set(row.id, row);
    return map;
  }, [floors]);

  const reservedById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of reserved) map.set(row.id, row.label);
    return map;
  }, [reserved]);

  const startFloor = useMemo(() => {
    const firstSelected = selectedIds[0];
    if (firstSelected) {
      const i = floors.findIndex((f) => f.tables.some((t) => t.id === firstSelected));
      if (i >= 0) return i;
    }
    const withOpen = floors.findIndex((f) =>
      f.tables.some((t) => isOpen(t.status, guestById.get(t.id)?.bookable) && !reservedById.has(t.id)),
    );
    return Math.max(0, withOpen);
  }, [floors, guestById, reservedById, selectedIds]);

  const [floorIdx, setFloorIdx] = useState(startFloor);
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstSelected = selectedIds[0];
    if (!firstSelected) return;
    const i = floors.findIndex((f) => f.tables.some((t) => t.id === firstSelected));
    if (i >= 0) setFloorIdx(i);
  }, [selectedIds, floors]);

  const floor = floors[Math.min(floorIdx, floors.length - 1)] ?? floors[0];
  const bounds = useMemo(() => (floor ? boundsOf(floor, 1) : { minX: 0, minY: 0, cols: 8, rows: 6 }), [floor]);
  const cell = Math.max(28, Math.round(CELL * zoom));
  const width = bounds.cols * cell;
  const height = bounds.rows * cell;

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const pad = 16;
    const zx = (el.clientWidth - pad) / (bounds.cols * CELL);
    const zy = (Math.max(el.clientHeight, 240) - pad) / (bounds.rows * CELL);
    if (zx > 0 && zy > 0) setZoom(clampZoom(Math.min(zx, zy, 1)));
  }, [bounds.cols, bounds.rows, floorIdx]);

  function px(x: number) {
    return (x - bounds.minX) * cell;
  }
  function py(y: number) {
    return (y - bounds.minY) * cell;
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2) {
      pinch.current = null;
      return;
    }
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    pinch.current = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      zoom,
    };
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2 || !pinch.current) return;
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.current.dist < 8) return;
    setZoom(clampZoom(pinch.current.zoom * (dist / pinch.current.dist)));
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) pinch.current = null;
  }

  if (!floor) return null;

  return (
    <section className="overflow-hidden rounded-[14px] border border-[var(--cat-border)] bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cat-border)] px-3 py-2.5">
        <div className="mr-auto min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cat-muted)]">Floor map</div>
          <p className="m-0 text-[13px] text-[var(--cat-ink)]">
            Want a table? Tap one or more, or skip — no preference.
          </p>
        </div>
        <div className="flex items-center rounded-[10px] border border-[var(--cat-border)] bg-white">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - 0.2))}
            className="grid h-11 w-11 place-items-center text-lg font-bold text-[var(--cat-ink)]"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[44px] text-center text-[12px] font-semibold tabular-nums text-[var(--cat-muted)]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + 0.2))}
            className="grid h-11 w-11 place-items-center text-lg font-bold text-[var(--cat-ink)]"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {floors.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--cat-border)] px-3 py-2">
          {floors.map((fl, i) => {
            const on = floorIdx === i;
            return (
              <button
                key={fl.id}
                type="button"
                onClick={() => setFloorIdx(i)}
                aria-pressed={on}
                className="h-11 shrink-0 rounded-full border px-4 text-[13px] font-bold"
                style={{
                  background: on ? accent : "#fff",
                  color: on ? "#fff" : "var(--cat-ink)",
                  borderColor: on ? accent : "var(--cat-border)",
                }}
              >
                {fl.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        ref={viewRef}
        className="overflow-auto overscroll-contain bg-[var(--cat-photo-bg)]"
        style={{ minHeight: 200, height: "min(34vh, 260px)", touchAction: "pan-x pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="relative mx-auto my-3"
          style={{
            width,
            height,
            backgroundColor: CANVAS,
            backgroundImage:
              "linear-gradient(var(--cat-border) 1px, transparent 1px), linear-gradient(90deg, var(--cat-border) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        >
          {floor.tiles.map((tile) => {
            const c = parseKey(tile);
            return (
              <div
                key={tile}
                className="absolute bg-white"
                style={{
                  left: px(c.x),
                  top: py(c.y),
                  width: cell,
                  height: cell,
                  boxShadow: "inset -1px -1px 0 var(--cat-border), inset 1px 1px 0 var(--cat-border)",
                }}
              />
            );
          })}

          {floor.items.map((item) => {
            const def = itemOf(item.kind);
            return (
              <div
                key={item.id}
                className="pointer-events-none absolute"
                title={def.label}
                style={{
                  left: px(item.x),
                  top: py(item.y),
                  width: item.w * cell,
                  height: item.h * cell,
                  zIndex: 1,
                  borderRadius: 7,
                }}
              >
                <CadItem kind={item.kind} color={item.color} accent={accent} showLabel={item.w * cell >= 72} />
              </div>
            );
          })}

          {floor.tables.map((table) => {
            const guest = guestById.get(table.id);
            const reservedLabel = reservedById.get(table.id);
            const held = Boolean(reservedLabel);
            const open = isOpen(table.status, guest?.bookable ?? table.status !== "closed") && !held;
            const on = selectedIds.includes(table.id);
            const seats = guest?.seats ?? table.seats;
            return (
              <button
                key={table.id}
                type="button"
                disabled={!open}
                onClick={() => {
                  if (open) onToggle(table.id);
                }}
                aria-pressed={on}
                aria-label={
                  held
                    ? `Table ${table.no} is reserved`
                    : open
                      ? `Table ${table.no}, ${seats} seats`
                      : `Table ${table.no} is closed`
                }
                className="absolute p-0 disabled:cursor-not-allowed"
                style={{
                  left: px(table.x),
                  top: py(table.y),
                  width: Math.max(MIN_HIT, table.w * cell),
                  height: Math.max(MIN_HIT, table.h * cell),
                  zIndex: on || held ? 4 : 2,
                  boxShadow: on ? accentShadow(accent) : undefined,
                  borderRadius: 7,
                  cursor: open ? "pointer" : "default",
                  outline: on ? `2px solid ${accent}` : undefined,
                  outlineOffset: 1,
                  opacity: held ? 0.62 : 1,
                  filter: held ? "grayscale(0.45)" : undefined,
                }}
              >
                <CadTable
                  shape={table.shape}
                  seats={seats}
                  no={table.no}
                  color={table.color}
                  selected={on}
                  closed={!open && !held}
                  reserved={held}
                  accent={accent}
                />
                {held ? (
                  <span className="pointer-events-none absolute inset-x-0.5 bottom-0.5 truncate rounded-[4px] bg-[rgba(16,23,32,0.62)] px-0.5 text-center text-[9px] font-bold leading-4 text-white">
                    {reservedLabel}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--cat-border)] px-3 py-2 text-[11.5px] text-[var(--cat-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--cat-ink)] bg-white" />
          Open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[rgba(138,147,162,0.45)]" />
          Reserved
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-[var(--cat-border)] bg-[var(--cat-photo-bg)]" />
          Closed
        </span>
      </div>
    </section>
  );
}
