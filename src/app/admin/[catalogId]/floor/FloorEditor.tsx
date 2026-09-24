"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { CadItem, CadTable, TableThumb } from "@/components/admin/FloorSymbols";
import {
  TABLE_PRESETS,
  PLAN_SWATCHES,
  SHAPES,
  FLOOR_LAYOUT_PRESETS,
  groupedRoomItems,
  itemOf,
  areaOf,
  applyLayoutPreset,
  accentShadow,
  boundsOf,
  canPlace,
  overlaps,
  clonePlan,
  covers,
  emptyFloor,
  emptyPlan,
  key,
  newId,
  nextTableNo,
  nextTableStart,
  parseKey,
  planStats,
  rectTiles,
  type FloorLayoutPreset,
  type StudioBox,
  type StudioFloor,
  type StudioItem,
  type StudioPlan,
  type StudioTable,
  type StudioTableShape,
} from "@/lib/catalog/floor-plan";
import { catalogDineUrl } from "@/app/admin/_lib/urls";
import { saveFloorPlan } from "./actions";

type Tool =
  | { kind: "select" }
  | { kind: "paint" }
  | { kind: "erase" }
  | { kind: "table"; id: string }
  | { kind: "item"; id: string };

type Sel = { kind: "table" | "item"; id: string };
type PaintMode = "add" | "erase";
type Drag =
  | { mode: "move"; kind: "table" | "item"; id: string; gx: number; gy: number }
  | { mode: "resize"; kind: "table" | "item"; id: string; edge: "e" | "s" | "se" };

const INK = "var(--cat-ink)";
const MUTED = "var(--cat-muted)";
const LINE = "var(--cat-border)";
const PHOTO = "var(--cat-photo-bg)";
const CANVAS = "#f4f6f9";
const DANGER = "#b42318";

function objAt(floor: StudioFloor, id: string): StudioTable | StudioItem | null {
  return floor.tables.find((t) => t.id === id) ?? floor.items.find((i) => i.id === id) ?? null;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
      {children}
    </div>
  );
}

function IconSelect() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.2 2.4 12.6 8.1l-3.8.5 1.7 4.6-1.8.7-1.7-4.6L3.2 13.2V2.4Z" fill="currentColor" />
    </svg>
  );
}

function IconBrush() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9.6 2.4 13.6 6.4 7 13H3v-4L9.6 2.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEraser() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.2 10.2 8.6 4.8 12.2 8.4 6.8 13.8H3.2v-3.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ColorRow({
  value,
  accent,
  onPick,
}: {
  value?: string;
  accent: string;
  onPick: (hex?: string) => void;
}) {
  const swatches = PLAN_SWATCHES.includes(accent as (typeof PLAN_SWATCHES)[number])
    ? [...PLAN_SWATCHES]
    : [accent, ...PLAN_SWATCHES];
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-semibold text-[var(--cat-muted)]">Color</div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="h-8 cursor-pointer rounded-full border px-2.5 text-[11px] font-semibold"
          style={{
            borderColor: value ? LINE : accent,
            background: "#fff",
            color: INK,
          }}
        >
          Default
        </button>
        {swatches.map((hex) => {
          const on = value?.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Color ${hex}`}
              onClick={() => onPick(hex)}
              className="h-8 w-8 cursor-pointer rounded-full border"
              style={{
                background: hex,
                borderColor: on ? INK : LINE,
                boxShadow: on ? `0 0 0 2px ${accent}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-[12.5px] font-bold text-[var(--cat-muted)]">{label}</span>
      <button type="button" onClick={onDec} className="h-[38px] w-[38px] rounded-lg border border-[var(--cat-border)] bg-white text-base font-bold">
        −
      </button>
      <span className="min-w-[44px] text-center text-[14px] font-bold tabular-nums">{value}</span>
      <button type="button" onClick={onInc} className="h-[38px] w-[38px] rounded-lg border border-[var(--cat-border)] bg-white text-base font-bold">
        +
      </button>
    </div>
  );
}

export function FloorEditor({
  catalogId,
  catalogName,
  accent,
  slug,
  initialPlan,
}: {
  catalogId: string;
  catalogName: string;
  accent: string;
  slug: string;
  initialPlan: StudioPlan;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mobileCanvasRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<StudioPlan>(() => clonePlan(initialPlan));
  const [floorIdx, setFloorIdx] = useState(0);
  const [tool, setTool] = useState<Tool>({ kind: "select" });
  const [sel, setSel] = useState<Sel | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [paint, setPaint] = useState<PaintMode | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guestHref = `/s/${slug}/reserve`;
  const dineHref = `/s/${slug}/dine`;

  const floor = plan.floors[Math.min(floorIdx, plan.floors.length - 1)] ?? plan.floors[0]!;
  const stats = useMemo(() => planStats(plan), [plan]);
  const bounds = useMemo(() => boundsOf(floor, 3), [floor]);
  const cell = Math.round(44 * zoom);
  const mobileCell = Math.max(22, Math.round(28 * Math.min(zoom, 1)));

  function flash(next: string) {
    setMsg(next);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setMsg(""), 2400);
  }

  function snapshot() {
    setHistory((prev) => prev.concat([JSON.stringify(plan)]).slice(-40));
  }

  function undo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last) {
        setPlan(JSON.parse(last) as StudioPlan);
        setDirty(true);
        setSel(null);
      }
      return prev.slice(0, -1);
    });
  }

  function edit(fn: (next: StudioPlan, fl: StudioFloor) => Partial<{ floorIdx: number; sel: Sel | null }> | void) {
    const next = clonePlan(plan);
    const fl = next.floors[Math.min(floorIdx, next.floors.length - 1)];
    if (!fl) return;
    const extra = fn(next, fl);
    setPlan(next);
    setDirty(true);
    if (extra && typeof extra.floorIdx === "number") setFloorIdx(extra.floorIdx);
    if (extra && "sel" in extra) setSel(extra.sel ?? null);
  }

  function live(fn: (next: StudioPlan, fl: StudioFloor) => boolean | void) {
    const next = clonePlan(plan);
    const fl = next.floors[Math.min(floorIdx, next.floors.length - 1)];
    if (!fl) return;
    if (fn(next, fl) === false) return;
    setPlan(next);
    setDirty(true);
  }

  function cellAt(e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null, cp: number) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / cp) + bounds.minX,
      y: Math.floor((e.clientY - r.top) / cp) + bounds.minY,
    };
  }

  function paintAt(cellPos: { x: number; y: number }, mode: PaintMode) {
    const k = key(cellPos.x, cellPos.y);
    const has = floor.tiles.includes(k);
    if (mode === "add" && has) return;
    if (mode === "erase" && !has) return;
    if (mode === "erase") {
      const box: StudioBox = { x: cellPos.x, y: cellPos.y, w: 1, h: 1 };
      const busy = floor.tables.some((t) => overlaps(box, t)) || floor.items.some((item) => overlaps(box, item));
      if (busy) {
        flash("Move the table or item off that tile first.");
        return;
      }
    }
    live((_p, fl) => {
      if (mode === "add") fl.tiles.push(k);
      else fl.tiles = fl.tiles.filter((t) => t !== k);
    });
  }

  function deleteSel() {
    if (!sel) return;
    snapshot();
    edit((_p, fl) => {
      if (sel.kind === "table") fl.tables = fl.tables.filter((t) => t.id !== sel.id);
      else fl.items = fl.items.filter((i) => i.id !== sel.id);
      return { sel: null };
    });
  }

  function nudge(dx: number, dy: number) {
    if (!sel) return;
    const obj = objAt(floor, sel.id);
    if (!obj) return;
    const box = { x: obj.x + dx, y: obj.y + dy, w: obj.w, h: obj.h };
    if (!canPlace(floor, box, obj.id)) return;
    snapshot();
    edit((_p, fl) => {
      const o = sel.kind === "table" ? fl.tables.find((t) => t.id === sel.id) : fl.items.find((i) => i.id === sel.id);
      if (!o) return;
      o.x = box.x;
      o.y = box.y;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "Escape") {
        setTool({ kind: "select" });
        setSel(null);
        return;
      }
      if (e.key === "v" || e.key === "V") setTool({ kind: "select" });
      if (e.key === "b" || e.key === "B") {
        setTool({ kind: "paint" });
        setSel(null);
      }
      if (e.key === "e" || e.key === "E") {
        setTool({ kind: "erase" });
        setSel(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        deleteSel();
      }
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (dir && sel) {
        e.preventDefault();
        nudge(dir[0]!, dir[1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyboard binds current sel/plan via closures; rebind on those
  }, [sel, plan, floorIdx]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const selTable = sel?.kind === "table" ? floor.tables.find((t) => t.id === sel.id) ?? null : null;
  const selItem = sel?.kind === "item" ? floor.items.find((i) => i.id === sel.id) ?? null : null;
  const selObj = selTable ?? selItem;

  function startDrag(kind: "table" | "item", id: string, e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null, cp: number) {
    e.stopPropagation();
    const cellPos = cellAt(e, el, cp);
    const obj = objAt(floor, id);
    if (!cellPos || !obj) return;
    el?.setPointerCapture?.(e.pointerId);
    snapshot();
    setSel({ kind, id });
    setTool({ kind: "select" });
    setDrag({ mode: "move", kind, id, gx: cellPos.x - obj.x, gy: cellPos.y - obj.y });
  }

  function startResize(edge: "e" | "s" | "se", e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null) {
    e.stopPropagation();
    if (!sel || !selObj) return;
    el?.setPointerCapture?.(e.pointerId);
    snapshot();
    setDrag({ mode: "resize", kind: sel.kind, id: sel.id, edge });
  }

  function onDown(e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null, cp: number) {
    const cellPos = cellAt(e, el, cp);
    if (!cellPos) return;
    el?.setPointerCapture?.(e.pointerId);
    if (tool.kind === "paint" || tool.kind === "erase") {
      const mode: PaintMode = tool.kind === "paint" ? "add" : "erase";
      snapshot();
      setPaint(mode);
      paintAt(cellPos, mode);
      return;
    }
    if (tool.kind === "table") {
      const p = TABLE_PRESETS.find((t) => t.id === tool.id);
      if (!p) return;
      const box = { x: cellPos.x, y: cellPos.y, w: p.w, h: p.h };
      if (!canPlace(floor, box, null)) {
        flash("That spot is off the room or already taken.");
        return;
      }
      snapshot();
      const id = newId("t");
      edit((pl, fl) => {
        fl.tables.push({
          id,
          no: nextTableNo(pl),
          x: cellPos.x,
          y: cellPos.y,
          seats: p.seats,
          w: p.w,
          h: p.h,
          shape: p.shape,
          status: "open",
        });
        return { sel: { kind: "table", id } };
      });
      return;
    }
    if (tool.kind === "item") {
      const def = itemOf(tool.id);
      const box = { x: cellPos.x, y: cellPos.y, w: def.w, h: def.h };
      if (!canPlace(floor, box, null)) {
        flash("That spot is off the room or already taken.");
        return;
      }
      snapshot();
      const id = newId("i");
      edit((_pl, fl) => {
        fl.items.push({ id, kind: def.id, x: cellPos.x, y: cellPos.y, w: def.w, h: def.h });
        return { sel: { kind: "item", id } };
      });
      return;
    }
    setSel(null);
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null, cp: number) {
    const cellPos = cellAt(e, el, cp);
    if (!cellPos) return;
    if (!cursor || cursor.x !== cellPos.x || cursor.y !== cellPos.y) setCursor(cellPos);
    if (paint) {
      paintAt(cellPos, paint);
      return;
    }
    if (!drag) return;
    if (drag.mode === "move") {
      const obj = objAt(floor, drag.id);
      if (!obj) return;
      const box = { x: cellPos.x - drag.gx, y: cellPos.y - drag.gy, w: obj.w, h: obj.h };
      if (box.x === obj.x && box.y === obj.y) return;
      if (!canPlace(floor, box, obj.id)) return;
      live((_p, fl) => {
        const o = drag.kind === "table" ? fl.tables.find((t) => t.id === drag.id) : fl.items.find((i) => i.id === drag.id);
        if (!o) return false;
        o.x = box.x;
        o.y = box.y;
      });
      return;
    }
    const obj = objAt(floor, drag.id);
    if (!obj) return;
    const w = drag.edge === "s" ? obj.w : Math.max(1, cellPos.x - obj.x + 1);
    const h = drag.edge === "e" ? obj.h : Math.max(1, cellPos.y - obj.y + 1);
    if (w === obj.w && h === obj.h) return;
    const box = { x: obj.x, y: obj.y, w, h };
    if (!canPlace(floor, box, obj.id)) return;
    live((_p, fl) => {
      const o = drag.kind === "table" ? fl.tables.find((t) => t.id === drag.id) : fl.items.find((i) => i.id === drag.id);
      if (!o) return false;
      o.w = w;
      o.h = h;
    });
  }

  function onUp(e: ReactPointerEvent<HTMLDivElement>, el: HTMLDivElement | null) {
    if (el && e.pointerId !== undefined) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (paint || drag) {
      setPaint(null);
      setDrag(null);
    }
  }

  function setSelNum(field: "seats" | "w" | "h", delta: number, min: number, max: number) {
    if (!sel || !selObj) return;
    if (field === "seats") {
      if (!selTable) return;
      const v = Math.max(min, Math.min(max, selTable.seats + delta));
      if (v === selTable.seats) return;
      snapshot();
      edit((_p, fl) => {
        const t = fl.tables.find((row) => row.id === selTable.id);
        if (t) t.seats = v;
      });
      return;
    }
    const current = field === "w" ? selObj.w : selObj.h;
    const v = Math.max(min, Math.min(max, current + delta));
    if (v === current) return;
    const box = { x: selObj.x, y: selObj.y, w: field === "w" ? v : selObj.w, h: field === "h" ? v : selObj.h };
    if (!canPlace(floor, box, selObj.id)) {
      flash("No room to grow that way — move it first.");
      return;
    }
    snapshot();
    edit((_p, fl) => {
      const o = sel.kind === "table" ? fl.tables.find((t) => t.id === sel.id) : fl.items.find((i) => i.id === sel.id);
      if (!o) return;
      o[field] = v;
    });
  }

  function duplicateSel() {
    if (!sel || !selObj) return;
    const box = { x: selObj.x + selObj.w, y: selObj.y, w: selObj.w, h: selObj.h };
    if (!canPlace(floor, box, null)) {
      flash("No clear space beside it — move it first.");
      return;
    }
    snapshot();
    edit((p, fl) => {
      const id = newId(sel.kind === "table" ? "t" : "i");
      if (sel.kind === "table") {
        const src = fl.tables.find((t) => t.id === sel.id);
        if (!src) return;
        fl.tables.push({ ...src, id, no: nextTableNo(p), x: box.x, y: box.y });
      } else {
        const src = fl.items.find((i) => i.id === sel.id);
        if (!src) return;
        fl.items.push({ ...src, id, x: box.x, y: box.y });
      }
      return { sel: { kind: sel.kind, id } };
    });
  }

  function addFloor() {
    snapshot();
    edit((p) => {
      p.floors.push(emptyFloor(`Floor ${p.floors.length + 1}`, newId("fl")));
      return { floorIdx: p.floors.length - 1, sel: null };
    });
  }

  function dupFloor() {
    snapshot();
    edit((p) => {
      const src = p.floors[Math.min(floorIdx, p.floors.length - 1)];
      if (!src) return;
      const stamp = Date.now().toString(36);
      p.floors.push({
        id: newId("fl"),
        name: `${src.name} copy`,
        tiles: src.tiles.slice(),
        items: src.items.map((item, n) => ({ ...item, id: `i${stamp}${n}` })),
        tables: src.tables.map((t, n) => ({ ...t, id: `t${stamp}${n}` })),
      });
      return { floorIdx: p.floors.length - 1, sel: null };
    });
  }

  function deleteFloor() {
    if (plan.floors.length <= 1) return;
    snapshot();
    edit((p) => {
      p.floors.splice(floorIdx, 1);
      return { floorIdx: 0, sel: null };
    });
  }

  function resetPlan() {
    snapshot();
    setPlan(emptyPlan("Ground floor"));
    setFloorIdx(0);
    setSel(null);
    setTool({ kind: "select" });
    setDirty(true);
    flash("Reset to an empty ground floor. Publish to make it live.");
  }

  function applyLayout(preset: FloorLayoutPreset) {
    const busy = floor.tables.length + floor.items.length > 0;
    if (busy) {
      const ok = window.confirm(
        `Replace “${floor.name}” with the ${preset.label} layout? Other floors stay as they are. Undo restores this floor.`,
      );
      if (!ok) return;
    }
    snapshot();
    edit((pl, fl) => {
      applyLayoutPreset(fl, preset, nextTableStart(pl, fl.id));
      return { sel: null };
    });
    setTool({ kind: "select" });
    flash(`${preset.label} layout applied. Publish to make it live.`);
  }

  function renderLayouts() {
    return (
      <div className="flex flex-col gap-1.5">
        {FLOOR_LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyLayout(preset)}
            className="rounded-[10px] border border-[var(--cat-border)] bg-white px-3 py-2 text-left transition-colors duration-150 hover:bg-[#f7f8fa]"
          >
            <span className="block text-[13px] font-semibold text-[var(--cat-ink)]">{preset.label}</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--cat-muted)]">{preset.blurb}</span>
          </button>
        ))}
      </div>
    );
  }

  function addBlock(w: number, h: number) {
    const bb = boundsOf(floor, 0);
    const x0 = floor.tiles.length ? bb.minX : 0;
    const y0 = floor.tiles.length ? bb.minY + bb.rows + 1 : 0;
    snapshot();
    edit((_p, fl) => {
      const set = new Set(fl.tiles);
      for (const t of rectTiles(x0, y0, w, h)) set.add(t);
      fl.tiles = Array.from(set);
    });
    flash(`${w} × ${h} m block added — drag it into shape with the brush.`);
  }

  async function publish() {
    setPending(true);
    const result = await saveFloorPlan(catalogId, plan);
    setPending(false);
    if (result.error) {
      flash(result.error);
      return;
    }
    setDirty(false);
    flash("Published. Guests and the dine-in picker now use this plan.");
  }

  const hint =
    tool.kind === "paint"
      ? "Drag across the grid to paint room tiles."
      : tool.kind === "erase"
        ? "Drag to erase tiles and cut the room to shape."
        : tool.kind === "table"
          ? "Click the plan to drop the table. Esc to stop."
          : tool.kind === "item"
            ? "Click the plan to drop the item. Esc to stop."
            : selObj
              ? "Drag to move · handles resize · arrows nudge · Delete removes."
              : "Select a tool, or click anything on the plan to edit it.";

  const canvasCursor = tool.kind === "paint" || tool.kind === "erase" ? "crosshair" : tool.kind === "select" ? "default" : "copy";

  function px(x: number, cp: number) {
    return (x - bounds.minX) * cp;
  }
  function py(y: number, cp: number) {
    return (y - bounds.minY) * cp;
  }

  function handlesFor(cp: number, el: HTMLDivElement | null) {
    if (!selObj) {
      return [] as {
        l: number;
        t: number;
        cursor: string;
        title: string;
        edge: "e" | "s" | "se";
        down: (e: ReactPointerEvent<HTMLDivElement>) => void;
      }[];
    }
    const size = 8;
    const gap = 5;
    const x1 = px(selObj.x, cp);
    const y1 = py(selObj.y, cp);
    const x2 = x1 + selObj.w * cp;
    const y2 = y1 + selObj.h * cp;
    const cy = y1 + (selObj.h * cp) / 2;
    const cx = x1 + (selObj.w * cp) / 2;
    return [
      { l: x2 + gap, t: cy - size / 2, cursor: "ew-resize", title: "Drag to change width", edge: "e" as const },
      { l: cx - size / 2, t: y2 + gap, cursor: "ns-resize", title: "Drag to change depth", edge: "s" as const },
      { l: x2 + gap, t: y2 + gap, cursor: "nwse-resize", title: "Drag to resize", edge: "se" as const },
    ].map((h) => ({ ...h, down: (e: ReactPointerEvent<HTMLDivElement>) => startResize(h.edge, e, el) }));
  }

  function renderCanvas(elRef: typeof canvasRef, cp: number, pad: number) {
    const w = bounds.cols * cp;
    const h = bounds.rows * cp;
    return (
      <div
        ref={elRef}
        onPointerDown={(e) => onDown(e, elRef.current, cp)}
        onPointerMove={(e) => onMove(e, elRef.current, cp)}
        onPointerUp={(e) => onUp(e, elRef.current)}
        onPointerCancel={(e) => onUp(e, elRef.current)}
        className="relative mx-auto touch-none"
        style={{
          width: w,
          height: h,
          backgroundImage: "linear-gradient(var(--cat-border) 1px, transparent 1px), linear-gradient(90deg, var(--cat-border) 1px, transparent 1px)",
          backgroundSize: `${cp}px ${cp}px`,
          cursor: canvasCursor,
          margin: pad,
        }}
      >
        {floor.tiles.map((tile) => {
          const c = parseKey(tile);
          return (
            <div
              key={tile}
              className="absolute bg-white"
              style={{
                left: px(c.x, cp),
                top: py(c.y, cp),
                width: cp,
                height: cp,
                boxShadow: "inset -1px -1px 0 var(--cat-border), inset 1px 1px 0 var(--cat-border)",
              }}
            />
          );
        })}
        {floor.items.map((item) => {
          const on = sel?.kind === "item" && sel.id === item.id;
          return (
            <div
              key={item.id}
              onPointerDown={(e) => startDrag("item", item.id, e, elRef.current, cp)}
              className="absolute cursor-move"
              style={{
                left: px(item.x, cp),
                top: py(item.y, cp),
                width: item.w * cp,
                height: item.h * cp,
                zIndex: on ? 3 : 1,
                boxShadow: on ? accentShadow(accent) : undefined,
                borderRadius: 7,
              }}
            >
              <CadItem kind={item.kind} color={item.color} selected={on} accent={accent} />
            </div>
          );
        })}
        {floor.tables.map((table) => {
          const on = sel?.kind === "table" && sel.id === table.id;
          const closed = table.status === "closed";
          return (
            <div
              key={table.id}
              onPointerDown={(e) => startDrag("table", table.id, e, elRef.current, cp)}
              className="absolute cursor-move"
              style={{
                left: px(table.x, cp),
                top: py(table.y, cp),
                width: table.w * cp,
                height: table.h * cp,
                zIndex: on ? 4 : 2,
                boxShadow: on ? accentShadow(accent) : undefined,
                borderRadius: 7,
              }}
            >
              <CadTable
                shape={table.shape}
                seats={table.seats}
                no={table.no}
                color={table.color}
                selected={on}
                closed={closed}
                accent={accent}
              />
            </div>
          );
        })}
        {handlesFor(cp, elRef.current).map((handle) => (
          <div
            key={handle.title}
            onPointerDown={handle.down}
            title={handle.title}
            className="absolute h-2 w-2 rounded-[2px] border border-white"
            style={{
              left: handle.l,
              top: handle.t,
              background: accent,
              boxShadow: `0 0 0 1px ${accent}`,
              cursor: handle.cursor,
              zIndex: 5,
            }}
          />
        ))}
      </div>
    );
  }

  function renderInspector() {
    return (
    <div>
      {selTable ? (
        <div>
          <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Table</div>
          <label className="mb-3.5 flex flex-col gap-1.5 text-xs font-bold text-[var(--cat-muted)]">
            Number on the QR code
            <input
              value={selTable.no}
              onChange={(e) => {
                const v = e.target.value;
                edit((_p, fl) => {
                  const t = fl.tables.find((row) => row.id === selTable.id);
                  if (t) t.no = v.slice(0, 16);
                });
              }}
              className="h-[46px] rounded-[9px] border border-[var(--cat-border)] bg-white px-3 text-base font-bold text-[var(--cat-ink)] outline-none"
              style={{ outlineColor: accent }}
            />
          </label>
          <div className="mb-4 flex flex-col gap-2.5">
            <Stepper label="Seats" value={String(selTable.seats)} onInc={() => setSelNum("seats", 1, 1, 30)} onDec={() => setSelNum("seats", -1, 1, 30)} />
            <Stepper label="Width" value={`${selTable.w} m`} onInc={() => setSelNum("w", 1, 1, 14)} onDec={() => setSelNum("w", -1, 1, 14)} />
            <Stepper label="Depth" value={`${selTable.h} m`} onInc={() => setSelNum("h", 1, 1, 14)} onDec={() => setSelNum("h", -1, 1, 14)} />
          </div>
          <div className="mb-1.5 text-xs font-bold text-[var(--cat-muted)]">Shape</div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {SHAPES.map((sh) => {
              const on = selTable.shape === sh.id;
              return (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => {
                    snapshot();
                    edit((_p, fl) => {
                      const t = fl.tables.find((row) => row.id === selTable.id);
                      if (t) t.shape = sh.id as StudioTableShape;
                    });
                  }}
                  className="h-10 rounded-full px-3.5 text-xs"
                  style={
                    on
                      ? { background: accent, border: `1px solid ${accent}`, color: "#fff", fontWeight: 700 }
                      : { background: "#fff", border: `1px solid ${LINE}`, color: MUTED, fontWeight: 600 }
                  }
                >
                  {sh.label}
                </button>
              );
            })}
          </div>
          <ColorRow
            value={selTable.color}
            accent={accent}
            onPick={(hex) => {
              snapshot();
              edit((_p, fl) => {
                const t = fl.tables.find((row) => row.id === selTable.id);
                if (t) t.color = hex;
              });
            }}
          />
          <div className="mb-1.5 text-xs font-bold text-[var(--cat-muted)]">Bookable</div>
          <div className="mb-4 flex gap-1.5">
            {(
              [
                { key: "open", label: "Bookable" },
                { key: "closed", label: "Out of service" },
              ] as const
            ).map((st) => {
              const on = (selTable.status || "open") === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    snapshot();
                    edit((_p, fl) => {
                      const t = fl.tables.find((row) => row.id === selTable.id);
                      if (t) t.status = st.key;
                    });
                  }}
                  className="h-[42px] flex-1 rounded-[9px] text-xs"
                  style={
                    on
                      ? { background: accent, border: `1.5px solid ${accent}`, color: "#fff", fontWeight: 700 }
                      : { background: "#fff", border: `1px solid ${LINE}`, color: MUTED, fontWeight: 600 }
                  }
                >
                  {st.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={duplicateSel} className="h-11 flex-1 rounded-[9px] border border-[var(--cat-border)] bg-white text-[12.5px] font-bold">
              Duplicate
            </button>
            <button type="button" onClick={deleteSel} className="h-11 flex-1 rounded-[9px] border border-[#fecaca] bg-[#fef3f2] text-[12.5px] font-bold text-[#b42318]">
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const href = catalogDineUrl(slug, selTable.no);
              void navigator.clipboard?.writeText(href).then(
                () => flash("Copied dine-in table link"),
                () => window.prompt("Copy this dine-in table link", href),
              );
            }}
            className="mt-3 h-11 w-full rounded-[9px] border border-[var(--cat-border)] bg-white text-[12.5px] font-bold"
          >
            Copy dine-in link · table {selTable.no}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-[var(--cat-muted)]">
            Table QR uses /dine?table={selTable.no} — not the regular menu. Drag to move, handles to resize.
          </p>
        </div>
      ) : selItem ? (
        <div>
          <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Room item</div>
          <div className="font-catalog-display mb-3.5 flex items-center gap-2 text-[26px] font-semibold">
            <span aria-hidden>{itemOf(selItem.kind).emoji}</span>
            {itemOf(selItem.kind).label}
          </div>
          <ColorRow
            value={selItem.color}
            accent={accent}
            onPick={(hex) => {
              snapshot();
              edit((_p, fl) => {
                const o = fl.items.find((row) => row.id === selItem.id);
                if (o) o.color = hex;
              });
            }}
          />
          <div className="mb-4 flex flex-col gap-2.5">
            <Stepper label="Width" value={`${selItem.w} m`} onInc={() => setSelNum("w", 1, 1, 20)} onDec={() => setSelNum("w", -1, 1, 20)} />
            <Stepper label="Depth" value={`${selItem.h} m`} onInc={() => setSelNum("h", 1, 1, 20)} onDec={() => setSelNum("h", -1, 1, 20)} />
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={duplicateSel} className="h-11 flex-1 rounded-[9px] border border-[var(--cat-border)] bg-white text-[12.5px] font-bold">
              Duplicate
            </button>
            <button type="button" onClick={deleteSel} className="h-11 flex-1 rounded-[9px] border border-[#fecaca] bg-[#fef3f2] text-[12.5px] font-bold text-[#b42318]">
              Remove
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--cat-muted)]">Stretch walls, counters and rooms with the handles. Color uses the same theme as the catalog.</p>
        </div>
      ) : (
        <div>
          <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Floor</div>
          <input
            value={floor.name}
            aria-label="Floor name"
            onChange={(e) => {
              const v = e.target.value;
              edit((_p, fl) => {
                fl.name = v.slice(0, 80);
              });
            }}
            className="font-catalog-display mb-3.5 h-[46px] w-full rounded-[9px] border border-[var(--cat-border)] bg-white px-2.5 text-2xl font-semibold text-[var(--cat-ink)]"
          />
          <div className="mb-3.5 grid grid-cols-2 gap-1.5">
            {[
              { label: "Area", value: `${areaOf(floor)} m²` },
              { label: "Tables", value: String(floor.tables.length) },
              { label: "Covers", value: String(covers(floor)) },
              { label: "Closed", value: String(floor.tables.filter((t) => t.status === "closed").length) },
            ].map((row) => (
              <div key={row.label} className="rounded-[10px] bg-[var(--cat-photo-bg)] px-2.5 py-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">{row.label}</div>
                <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{row.value}</div>
              </div>
            ))}
          </div>
          <div className="mb-3.5 flex justify-between gap-3 text-[13px]">
            <span className="text-[var(--cat-muted)]">Room items</span>
            <span className="font-semibold tabular-nums">{floor.items.length}</span>
          </div>
          <p className="my-3.5 text-[12.5px] leading-relaxed text-[var(--cat-muted)]">
            Paint the room with the brush — drag across the grid and every tile you touch joins the floor. Erase to cut a courtyard, a lightwell or an angled wall. Tables and items can only sit on painted tiles.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { label: "+ 10 × 8 m block", w: 10, h: 8 },
              { label: "+ 6 × 4 m block", w: 6, h: 4 },
              { label: "+ 4 × 3 m block", w: 4, h: 3 },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => addBlock(b.w, b.h)}
                className="h-10 rounded-[9px] border border-[var(--cat-border)] bg-white px-3 text-xs font-bold"
              >
                {b.label}
              </button>
            ))}
          </div>
          {plan.floors.length > 1 ? (
            <button type="button" onClick={deleteFloor} className="h-[42px] w-full rounded-[9px] border border-[var(--cat-border)] bg-white text-[12.5px] font-bold text-[#b42318]">
              Delete this floor
            </button>
          ) : null}
        </div>
      )}
    </div>
    );
  }

  function renderTools() {
    const tools = [
      { id: "select", label: "Select", hint: "V", icon: <IconSelect />, on: tool.kind === "select", click: () => setTool({ kind: "select" }) },
      {
        id: "paint",
        label: "Paint",
        hint: "B",
        icon: <IconBrush />,
        on: tool.kind === "paint",
        click: () => {
          setTool({ kind: "paint" });
          setSel(null);
        },
      },
      {
        id: "erase",
        label: "Erase",
        hint: "E",
        icon: <IconEraser />,
        on: tool.kind === "erase",
        click: () => {
          setTool({ kind: "erase" });
          setSel(null);
        },
      },
    ] as const;
    return (
      <div className="grid grid-cols-3 gap-1 rounded-[12px] bg-[var(--cat-photo-bg)] p-1">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={t.click}
            aria-pressed={t.on}
            title={`${t.label} (${t.hint})`}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] px-1 py-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              t.on ? "" : "bg-transparent hover:bg-white"
            }`}
            style={t.on ? { background: accent, color: "#fff", outlineColor: accent } : { color: INK, outlineColor: accent }}
          >
            {t.icon}
            <span className="text-[11px] font-semibold leading-none">{t.label}</span>
            <kbd
              className="text-[9px] font-semibold tracking-wide"
              style={{ color: t.on ? "rgba(255,255,255,0.72)" : MUTED }}
            >
              {t.hint}
            </kbd>
          </button>
        ))}
      </div>
    );
  }

  function renderTablePresets() {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {TABLE_PRESETS.map((p) => {
          const on = tool.kind === "table" && tool.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setTool((st) => (st.kind === "table" && st.id === p.id ? { kind: "select" } : { kind: "table", id: p.id }))
              }
              aria-pressed={on}
              className={`flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] px-2 py-2.5 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                on ? "" : "hover:bg-[#f7f8fa]"
              }`}
              style={
                on
                  ? { border: `1.5px solid ${accent}`, background: PHOTO, outlineColor: accent }
                  : { border: `1px solid ${LINE}`, background: "#fff", outlineColor: accent }
              }
            >
              <TableThumb shape={p.shape} seats={p.seats} on={on} accent={accent} />
              <span className="text-[12px] font-semibold leading-none" style={{ color: on ? accent : INK }}>
                {p.label}
              </span>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: MUTED }}>
                {p.w}×{p.h} m
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderItemPresets() {
    return (
      <div className="flex flex-col gap-3">
        {groupedRoomItems().map((group) => (
          <div key={group.id}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">
              {group.label}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {group.items.map((item) => {
                const on = tool.kind === "item" && tool.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setTool((st) => (st.kind === "item" && st.id === item.id ? { kind: "select" } : { kind: "item", id: item.id }))
                    }
                    aria-pressed={on}
                    className={`flex h-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[10px] px-1.5 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      on ? "" : "hover:bg-[#f7f8fa]"
                    }`}
                    style={
                      on
                        ? { border: `1.5px solid ${accent}`, background: PHOTO, color: accent, outlineColor: accent }
                        : { border: `1px solid ${LINE}`, background: "#fff", color: INK, outlineColor: accent }
                    }
                  >
                    <span className="text-[16px] leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderFloorTabs() {
    return (
      <div className="flex flex-col gap-1">
        {plan.floors.map((fl, i) => {
          const on = floorIdx === i;
          return (
            <button
              key={fl.id}
              type="button"
              onClick={() => {
                setFloorIdx(i);
                setSel(null);
              }}
              aria-pressed={on}
              className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-[10px] px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                on ? "" : "bg-[var(--cat-photo-bg)] hover:bg-[#e4e8ee]"
              }`}
              style={on ? { background: accent, color: "#fff", outlineColor: accent } : { color: INK, outlineColor: accent }}
            >
              <span className="w-full truncate text-[13px] font-semibold">{fl.name}</span>
              <span className="text-[11px] tabular-nums" style={{ color: on ? "rgba(255,255,255,0.75)" : MUTED }}>
                {fl.tables.length} tables · {areaOf(fl)} m²
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const headerBtns = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={undo}
        title="Undo (⌘Z)"
        className="h-9 cursor-pointer rounded-[9px] border border-[var(--cat-border)] bg-white px-3 text-[12.5px] font-semibold text-[var(--cat-ink)] transition-colors duration-150 hover:bg-[#f7f8fa]"
      >
        Undo
      </button>
      <div className="flex items-center rounded-[9px] border border-[var(--cat-border)] bg-white">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
          className="h-9 w-9 cursor-pointer text-[15px] font-semibold text-[var(--cat-ink)] hover:bg-[#f7f8fa]"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-[42px] text-center text-xs font-semibold tabular-nums text-[var(--cat-muted)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.2) * 10) / 10))}
          className="h-9 w-9 cursor-pointer text-[15px] font-semibold text-[var(--cat-ink)] hover:bg-[#f7f8fa]"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      <Link
        href={dineHref}
        target="_blank"
        className="inline-flex h-9 cursor-pointer items-center rounded-[9px] border border-[var(--cat-border)] bg-white px-3.5 text-[12.5px] font-semibold text-[var(--cat-ink)] no-underline transition-colors duration-150 hover:bg-[#f7f8fa]"
      >
        Dine-in
      </Link>
      <Link
        href={guestHref}
        target="_blank"
        className="inline-flex h-9 cursor-pointer items-center rounded-[9px] border border-[var(--cat-border)] bg-white px-3.5 text-[12.5px] font-semibold text-[var(--cat-ink)] no-underline transition-colors duration-150 hover:bg-[#f7f8fa]"
      >
        Reserve
      </Link>
      <button
        type="button"
        onClick={() => void publish()}
        disabled={pending}
        className="h-9 cursor-pointer rounded-[9px] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: accent }}
      >
        {pending ? "Publishing…" : dirty ? "Publish plan" : "Published"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#f4f6f9] text-[var(--cat-ink)] md:h-[calc(100dvh)]">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-[var(--cat-border)] bg-white px-3 py-2.5 text-[var(--cat-ink)] sm:px-4">
        <div className="mr-auto flex min-w-0 items-baseline gap-3">
          <span className="font-catalog-display text-[20px] leading-none font-semibold tracking-tight">Floor plan studio</span>
          <span className="hidden truncate text-[13px] text-[var(--cat-muted)] sm:inline">{catalogName}</span>
        </div>
        <div className="hidden text-[12.5px] tabular-nums text-[var(--cat-muted)] lg:block">
          {stats.floors} {stats.floors === 1 ? "floor" : "floors"} · {stats.tables} tables · {stats.covers} covers · {stats.area} m²
        </div>
        {headerBtns}
      </header>

      {/* Desktop studio */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <aside className="w-[272px] shrink-0 overflow-y-auto border-r border-[var(--cat-border)] bg-white px-3.5 py-4">
          <SectionLabel>Draw</SectionLabel>
          {renderTools()}
          <div className="mt-5">
            <SectionLabel>Tables</SectionLabel>
            <p className="mb-2.5 text-[12px] leading-snug text-[var(--cat-muted)]">Pick a size, then click the plan.</p>
            {renderTablePresets()}
          </div>
          <div className="mt-5">
            <SectionLabel>Room</SectionLabel>
            {renderItemPresets()}
          </div>
          <div className="mt-5">
            <SectionLabel>Layouts</SectionLabel>
            <p className="mb-2.5 text-[12px] leading-snug text-[var(--cat-muted)]">
              One-click room. Replaces this floor only — undo to restore.
            </p>
            {renderLayouts()}
          </div>
          <div className="mt-5">
            <SectionLabel>Floors</SectionLabel>
            {renderFloorTabs()}
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={addFloor}
                className="h-10 flex-1 cursor-pointer rounded-[10px] border border-dashed border-[var(--cat-border)] bg-[var(--cat-photo-bg)] text-[12px] font-semibold text-[var(--cat-muted)] transition-colors duration-150 hover:bg-white hover:text-[var(--cat-ink)]"
              >
                + Floor
              </button>
              <button
                type="button"
                onClick={dupFloor}
                className="h-10 flex-1 cursor-pointer rounded-[10px] border border-[var(--cat-border)] bg-white text-[12px] font-semibold text-[var(--cat-muted)] transition-colors duration-150 hover:text-[var(--cat-ink)]"
              >
                Duplicate
              </button>
            </div>
            <button
              type="button"
              onClick={resetPlan}
              className="mt-3 cursor-pointer text-[12px] font-semibold text-[#b42318] hover:underline"
            >
              Reset plan
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto p-9" style={{ background: CANVAS }}>
            {renderCanvas(canvasRef, cell, 0)}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--cat-border)] bg-white px-4 py-2 text-[12.5px] text-[var(--cat-muted)]">
            <span className="font-bold text-[var(--cat-ink)]">{hint}</span>
            <span className="ml-auto tabular-nums">{cursor ? `x ${cursor.x} · y ${cursor.y}` : ""}</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 border border-[var(--cat-border)] bg-white" />
              1 tile = 1 m² · {areaOf(floor)} m² on this floor
            </span>
          </div>
        </section>

        <aside className="w-[292px] shrink-0 overflow-y-auto border-l border-[var(--cat-border)] bg-white p-4">{renderInspector()}</aside>
      </div>

      {/* Mobile: list + compact map */}
      <div className="flex flex-col gap-3 px-3 pb-8 pt-3 md:hidden">
        <p className="m-0 text-[12.5px] tabular-nums text-[var(--cat-muted)]">
          {stats.floors} {stats.floors === 1 ? "floor" : "floors"} · {stats.tables} tables · {stats.covers} covers
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {plan.floors.map((fl, i) => {
            const on = floorIdx === i;
            return (
              <button
                key={fl.id}
                type="button"
                onClick={() => {
                  setFloorIdx(i);
                  setSel(null);
                }}
                className="h-11 shrink-0 rounded-[9px] px-3 text-[13px] font-bold"
                style={
                  on
                    ? { background: accent, color: "#fff" }
                    : { background: "#fff", border: `1px solid ${LINE}`, color: MUTED }
                }
              >
                {fl.name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={addFloor} className="h-11 flex-1 rounded-[9px] border border-dashed border-[var(--cat-border)] bg-[var(--cat-photo-bg)] text-[13px] font-bold text-[var(--cat-muted)]">
            + Floor
          </button>
          <button type="button" onClick={dupFloor} className="h-11 flex-1 rounded-[9px] border border-[var(--cat-border)] bg-white text-[13px] font-bold text-[var(--cat-muted)]">
            Duplicate
          </button>
        </div>
        {renderTools()}
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Map</p>
        <div className="max-h-[42vh] overflow-auto rounded-[12px] border border-[var(--cat-border)]" style={{ background: CANVAS }}>
          {renderCanvas(mobileCanvasRef, mobileCell, 16)}
        </div>
        <p className="m-0 text-[12.5px] text-[var(--cat-muted)]">{hint}</p>
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Tables on this floor</p>
        {floor.tables.length === 0 ? (
          <p className="m-0 rounded-[12px] border border-[var(--cat-border)] bg-white px-3 py-4 text-[13px] text-[var(--cat-muted)]">
            No tables yet. Arm a preset below, then tap the map.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {floor.tables.map((table) => {
              const on = sel?.kind === "table" && sel.id === table.id;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => {
                    setSel({ kind: "table", id: table.id });
                    setTool({ kind: "select" });
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-[12px] border px-3 text-left"
                  style={
                    on
                      ? { borderColor: accent, background: PHOTO }
                      : { borderColor: LINE, background: "#fff" }
                  }
                >
                  <span className="text-[16px] font-bold tabular-nums">{table.no}</span>
                  <span className="flex-1 text-[13px] text-[var(--cat-muted)]">{table.seats} seats · {table.w}×{table.h} m</span>
                  <span className="text-[11px] font-bold" style={{ color: table.status === "closed" ? DANGER : "var(--cat-success-ink)" }}>
                    {table.status === "closed" ? "Out" : "Bookable"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="rounded-[14px] border border-[var(--cat-border)] bg-white p-3.5">{renderInspector()}</div>
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Layouts</p>
        <p className="m-0 text-[12px] text-[var(--cat-muted)]">Replaces this floor. Undo restores it.</p>
        {renderLayouts()}
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Tables</p>
        <p className="m-0 text-[12px] text-[var(--cat-muted)]">Tap a preset, then tap the map.</p>
        {renderTablePresets()}
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Room items</p>
        {renderItemPresets()}
        <button type="button" onClick={resetPlan} className="h-11 rounded-[9px] border border-[var(--cat-border)] bg-white text-[13px] font-bold text-[#b42318]">
          Reset to default plan
        </button>
      </div>

      {msg ? (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-[var(--cat-ink)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(16,23,32,0.22)]">
          {msg}
        </div>
      ) : null}
    </div>
  );
}
