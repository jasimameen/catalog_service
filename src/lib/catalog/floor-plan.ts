/**
 * Shared restaurant floor-plan model.
 * A floor is a painted set of 1 m × 1 m tiles. Tables and room items sit on
 * those tiles. Used by the admin studio; guest reserve / dine-in read the
 * flattened `template_settings.floor.tables` list derived from this plan.
 */

export const CELL = 44;

export type StudioTableShape = "square" | "rect" | "round" | "booth";
export type StudioTableStatus = "open" | "closed";

export type StudioTable = {
  id: string;
  no: string;
  x: number;
  y: number;
  seats: number;
  w: number;
  h: number;
  shape: StudioTableShape;
  status: StudioTableStatus;
  color?: string;
};

export type StudioItem = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
};

export type StudioFloor = {
  id: string;
  name: string;
  tiles: string[];
  items: StudioItem[];
  tables: StudioTable[];
};

export type StudioPlan = {
  floors: StudioFloor[];
};

export type StudioBox = { x: number; y: number; w: number; h: number };

export type TablePreset = {
  id: string;
  label: string;
  seats: number;
  w: number;
  h: number;
  shape: StudioTableShape;
};

export type RoomItemGroup = "service" | "build" | "guest";
export type RoomItemSymbol =
  | "kitchen"
  | "bar"
  | "cashier"
  | "host"
  | "waiter"
  | "prep"
  | "fridge"
  | "sink"
  | "door"
  | "stairs"
  | "wall"
  | "window"
  | "column"
  | "restroom"
  | "room"
  | "plant"
  | "tree"
  | "sofa"
  | "stage"
  | "kids"
  | "block";

export type RoomItemDef = {
  id: string;
  label: string;
  w: number;
  h: number;
  emoji: string;
  group: RoomItemGroup;
  symbol: RoomItemSymbol;
};

export const TABLE_PRESETS: readonly TablePreset[] = [
  { id: "t2", label: "2 seats", seats: 2, w: 1, h: 1, shape: "round" },
  { id: "t4", label: "4 seats", seats: 4, w: 2, h: 2, shape: "square" },
  { id: "b4", label: "Booth 4", seats: 4, w: 2, h: 2, shape: "booth" },
  { id: "t6", label: "6 seats", seats: 6, w: 3, h: 2, shape: "rect" },
  { id: "t8", label: "8 seats", seats: 8, w: 4, h: 2, shape: "rect" },
  { id: "t12", label: "12 seats", seats: 12, w: 6, h: 2, shape: "rect" },
];

export const ROOM_ITEM_GROUPS: readonly { id: RoomItemGroup; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "build", label: "Build" },
  { id: "guest", label: "Guest" },
];

export const ROOM_ITEMS: readonly RoomItemDef[] = [
  { id: "kitchen", label: "Kitchen", w: 4, h: 2, emoji: "🍳", group: "service", symbol: "kitchen" },
  { id: "bar", label: "Bar", w: 4, h: 1, emoji: "🍸", group: "service", symbol: "bar" },
  { id: "cashier", label: "Cashier", w: 2, h: 1, emoji: "🧾", group: "service", symbol: "cashier" },
  { id: "host", label: "Host stand", w: 1, h: 1, emoji: "🛎️", group: "service", symbol: "host" },
  { id: "waiter", label: "Waiter station", w: 1, h: 1, emoji: "🍽️", group: "service", symbol: "waiter" },
  { id: "prep", label: "Prep counter", w: 3, h: 1, emoji: "🔪", group: "service", symbol: "prep" },
  { id: "fridge", label: "Fridge", w: 1, h: 2, emoji: "🧊", group: "service", symbol: "fridge" },
  { id: "sink", label: "Sink", w: 1, h: 1, emoji: "🚰", group: "service", symbol: "sink" },
  { id: "entrance", label: "Door", w: 1, h: 2, emoji: "🚪", group: "build", symbol: "door" },
  { id: "stairs", label: "Stairs", w: 2, h: 2, emoji: "🪜", group: "build", symbol: "stairs" },
  { id: "wall", label: "Wall", w: 3, h: 1, emoji: "🧱", group: "build", symbol: "wall" },
  { id: "window", label: "Window", w: 2, h: 1, emoji: "🪟", group: "build", symbol: "window" },
  { id: "column", label: "Column", w: 1, h: 1, emoji: "⬛", group: "build", symbol: "column" },
  { id: "restroom", label: "Restrooms", w: 2, h: 2, emoji: "🚻", group: "build", symbol: "restroom" },
  { id: "room", label: "Private room", w: 4, h: 3, emoji: "🚪", group: "guest", symbol: "room" },
  { id: "planters", label: "Plant", w: 1, h: 1, emoji: "🪴", group: "guest", symbol: "plant" },
  { id: "tree", label: "Tree", w: 2, h: 2, emoji: "🌳", group: "guest", symbol: "tree" },
  { id: "sofa", label: "Lounge", w: 2, h: 1, emoji: "🛋️", group: "guest", symbol: "sofa" },
  { id: "stage", label: "Stage", w: 4, h: 2, emoji: "🎤", group: "guest", symbol: "stage" },
  { id: "kids", label: "Kids corner", w: 2, h: 2, emoji: "🧸", group: "guest", symbol: "kids" },
];

/** Theme swatches — same family as catalog accents. */
export const PLAN_SWATCHES = ["#0b5fce", "#1d1d1f", "#0f7b53", "#b2432b", "#eef1f5"] as const;

export const SHAPES: readonly { id: StudioTableShape; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rect", label: "Long" },
  { id: "round", label: "Round" },
  { id: "booth", label: "Booth" },
];

const SHAPE_IDS = new Set<StudioTableShape>(["square", "rect", "round", "booth"]);
const ITEM_IDS = new Set(ROOM_ITEMS.map((item) => item.id));
const TILE_KEY = /^-?\d+,-?\d+$/;

function asObj(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function asStr(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const next = value.trim().slice(0, max);
  return next || fallback;
}

export function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseKey(k: string): { x: number; y: number } {
  const p = k.split(",");
  return { x: Number(p[0]) || 0, y: Number(p[1]) || 0 };
}

export function rectTiles(x: number, y: number, w: number, h: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) out.push(key(x + i, y + j));
  }
  return out;
}

export function itemOf(kind: string): RoomItemDef {
  return (
    ROOM_ITEMS.find((item) => item.id === kind) ?? {
      id: kind,
      label: kind,
      w: 2,
      h: 1,
      emoji: "•",
      group: "build",
      symbol: "block",
    }
  );
}

export function groupedRoomItems(): { id: RoomItemGroup; label: string; items: RoomItemDef[] }[] {
  return ROOM_ITEM_GROUPS.map((group) => ({
    ...group,
    items: ROOM_ITEMS.filter((item) => item.group === group.id),
  }));
}

export function sanitizePlanColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return m ? `#${m[1]!.toLowerCase()}` : undefined;
}

export function radiusFor(shape: StudioTableShape): string {
  if (shape === "round") return "999px";
  if (shape === "booth") return "7px 7px 20px 20px";
  return "7px";
}

export function areaOf(floor: StudioFloor): number {
  return floor.tiles.length;
}

export function covers(floor: StudioFloor): number {
  return floor.tables.reduce((n, table) => n + (table.seats || 0), 0);
}

export function hasTile(floor: StudioFloor, x: number, y: number): boolean {
  return floor.tiles.includes(key(x, y));
}

export function boxOnTiles(floor: StudioFloor, box: StudioBox): boolean {
  for (let i = 0; i < box.w; i++) {
    for (let j = 0; j < box.h; j++) {
      if (!hasTile(floor, box.x + i, box.y + j)) return false;
    }
  }
  return true;
}

export function overlaps(a: StudioBox, b: StudioBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function boxFree(floor: StudioFloor, box: StudioBox, skipId: string | null): boolean {
  const tHit = floor.tables.some((t) => t.id !== skipId && overlaps(box, t));
  const iHit = floor.items.some((item) => item.id !== skipId && overlaps(box, item));
  return !tHit && !iHit;
}

export function canPlace(floor: StudioFloor, box: StudioBox, skipId: string | null): boolean {
  return boxOnTiles(floor, box) && boxFree(floor, box, skipId);
}

export function boundsOf(floor: StudioFloor, pad = 3): { minX: number; minY: number; cols: number; rows: number } {
  let minX = 0;
  let minY = 0;
  let maxX = 8;
  let maxY = 6;
  let seen = false;
  const take = (x: number, y: number, w: number, h: number) => {
    if (!seen) {
      minX = x;
      minY = y;
      maxX = x + w - 1;
      maxY = y + h - 1;
      seen = true;
      return;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w - 1);
    maxY = Math.max(maxY, y + h - 1);
  };
  for (const tile of floor.tiles) {
    const c = parseKey(tile);
    take(c.x, c.y, 1, 1);
  }
  for (const table of floor.tables) take(table.x, table.y, table.w, table.h);
  for (const item of floor.items) take(item.x, item.y, item.w, item.h);
  return {
    minX: minX - pad,
    minY: minY - pad,
    cols: maxX - minX + 1 + pad * 2,
    rows: maxY - minY + 1 + pad * 2,
  };
}

export function emptyFloor(name = "Ground floor", id = "ground"): StudioFloor {
  return { id, name, tiles: rectTiles(0, 0, 12, 8), items: [], tables: [] };
}

export function emptyPlan(name = "Ground floor"): StudioPlan {
  return { floors: [emptyFloor(name)] };
}

export function clonePlan(plan: StudioPlan): StudioPlan {
  return JSON.parse(JSON.stringify(plan)) as StudioPlan;
}

export function nextTableNo(plan: StudioPlan): string {
  let max = 0;
  for (const floor of plan.floors) {
    for (const table of floor.tables) {
      const n = parseInt(table.no, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return String(max + 1);
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function sanitizeTiles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "string" || !TILE_KEY.test(entry)) continue;
    seen.add(entry);
    if (seen.size >= 2400) break;
  }
  return Array.from(seen);
}

function sanitizeShape(value: unknown, fallback: StudioTableShape): StudioTableShape {
  return typeof value === "string" && SHAPE_IDS.has(value as StudioTableShape)
    ? (value as StudioTableShape)
    : fallback;
}

function sanitizeStatus(value: unknown): StudioTableStatus {
  return value === "closed" || value === "out" ? "closed" : "open";
}

function sanitizeTable(raw: unknown): StudioTable | null {
  const obj = asObj(raw);
  const id = asStr(obj.id, "", 48);
  const no = asStr(obj.no, "", 16);
  if (!id || !no) return null;
  const preset = TABLE_PRESETS.find((p) => p.id === asStr(obj.typeId, "", 8)) ?? TABLE_PRESETS[1];
  return {
    id,
    no,
    x: asInt(obj.x, 0, -80, 80),
    y: asInt(obj.y, 0, -80, 80),
    seats: asInt(obj.seats, preset?.seats ?? 4, 1, 30),
    w: asInt(obj.w, preset?.w ?? 2, 1, 14),
    h: asInt(obj.h, preset?.h ?? 2, 1, 14),
    shape: sanitizeShape(obj.shape, preset?.shape ?? "square"),
    status: sanitizeStatus(obj.status),
    color: sanitizePlanColor(obj.color),
  };
}

function sanitizeItem(raw: unknown): StudioItem | null {
  const obj = asObj(raw);
  const id = asStr(obj.id, "", 48);
  const kind = asStr(obj.kind, "", 32);
  if (!id || !kind) return null;
  const def = itemOf(ITEM_IDS.has(kind) ? kind : kind);
  return {
    id,
    kind,
    x: asInt(obj.x, 0, -80, 80),
    y: asInt(obj.y, 0, -80, 80),
    w: asInt(obj.w, def.w, 1, 20),
    h: asInt(obj.h, def.h, 1, 20),
    color: sanitizePlanColor(obj.color),
  };
}

function sanitizeFloor(raw: unknown, index: number): StudioFloor {
  const obj = asObj(raw);
  let tiles = sanitizeTiles(obj.tiles);
  if (tiles.length === 0) {
    const cols = asInt(obj.cols, 12, 4, 40);
    const rows = asInt(obj.rows, 8, 4, 40);
    const set = new Set(rectTiles(0, 0, cols, rows));
    if (Array.isArray(obj.voids)) {
      for (const v of obj.voids) {
        if (typeof v === "string") set.delete(v);
      }
    }
    tiles = Array.from(set);
  }
  const tables: StudioTable[] = [];
  if (Array.isArray(obj.tables)) {
    for (const row of obj.tables) {
      const table = sanitizeTable(row);
      if (table) tables.push(table);
      if (tables.length >= 200) break;
    }
  }
  const items: StudioItem[] = [];
  if (Array.isArray(obj.items)) {
    for (const row of obj.items) {
      const item = sanitizeItem(row);
      if (item) items.push(item);
      if (items.length >= 160) break;
    }
  }
  return {
    id: asStr(obj.id, `fl${index + 1}`, 48),
    name: asStr(obj.name, `Floor ${index + 1}`, 80),
    tiles,
    items,
    tables,
  };
}

export function normalizePlan(raw: unknown): StudioPlan {
  const obj = asObj(raw);
  const floors: StudioFloor[] = [];
  if (Array.isArray(obj.floors)) {
    for (const row of obj.floors) {
      floors.push(sanitizeFloor(row, floors.length));
      if (floors.length >= 12) break;
    }
  }
  return { floors: floors.length > 0 ? floors : emptyPlan().floors };
}

export type LegacyGuestTable = {
  id: string;
  no: string;
  seats: number;
  bookable: boolean;
  status: "open" | "out";
};

function footprintForSeats(seats: number): { w: number; h: number; shape: StudioTableShape } {
  if (seats <= 2) return { w: 1, h: 1, shape: "round" };
  if (seats <= 4) return { w: 2, h: 2, shape: "square" };
  if (seats <= 6) return { w: 3, h: 2, shape: "rect" };
  if (seats <= 8) return { w: 4, h: 2, shape: "rect" };
  return { w: 6, h: 2, shape: "rect" };
}

export function planFromLegacyTables(name: string, tables: LegacyGuestTable[]): StudioPlan {
  if (tables.length === 0) return emptyPlan(name || "Ground floor");
  const placed: StudioTable[] = [];
  let x = 1;
  let y = 1;
  const colLimit = 12;
  for (const table of tables) {
    const foot = footprintForSeats(table.seats);
    if (x + foot.w > colLimit - 1) {
      x = 1;
      y += 3;
    }
    placed.push({
      id: table.id,
      no: table.no,
      x,
      y,
      seats: table.seats,
      w: foot.w,
      h: foot.h,
      shape: foot.shape,
      status: table.status === "out" || !table.bookable ? "closed" : "open",
    });
    x += foot.w + 1;
  }
  const maxX = Math.max(12, ...placed.map((t) => t.x + t.w + 1));
  const maxY = Math.max(8, ...placed.map((t) => t.y + t.h + 1));
  return {
    floors: [
      {
        id: "ground",
        name: name || "Ground floor",
        tiles: rectTiles(0, 0, maxX, maxY),
        items: [],
        tables: placed,
      },
    ],
  };
}

export type GuestFloorTable = LegacyGuestTable & {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: StudioTableShape;
  floorId: string;
};

export function flattenGuestTables(plan: StudioPlan): GuestFloorTable[] {
  return plan.floors.flatMap((floor) =>
    floor.tables.map((table) => ({
      id: table.id,
      no: table.no,
      seats: table.seats,
      bookable: table.status !== "closed",
      status: table.status === "closed" ? ("out" as const) : ("open" as const),
      x: table.x,
      y: table.y,
      w: table.w,
      h: table.h,
      shape: table.shape,
      floorId: floor.id,
    })),
  );
}

export function planStats(plan: StudioPlan): { floors: number; tables: number; covers: number; area: number } {
  return {
    floors: plan.floors.length,
    tables: plan.floors.reduce((n, floor) => n + floor.tables.length, 0),
    covers: plan.floors.reduce((n, floor) => n + covers(floor), 0),
    area: plan.floors.reduce((n, floor) => n + areaOf(floor), 0),
  };
}

export function accentShadow(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 6px 16px rgba(25,20,17,0.22)";
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `0 6px 16px rgba(${r},${g},${b},0.32)`;
}

export type FloorLayoutPreset = {
  id: string;
  label: string;
  blurb: string;
  build: () => StudioFloor;
};

function layoutTable(no: string, x: number, y: number, presetId: string): StudioTable {
  const p = TABLE_PRESETS.find((t) => t.id === presetId) ?? TABLE_PRESETS[1]!;
  return {
    id: newId("t"),
    no,
    x,
    y,
    seats: p.seats,
    w: p.w,
    h: p.h,
    shape: p.shape,
    status: "open",
  };
}

function layoutItem(kind: string, x: number, y: number): StudioItem {
  const def = itemOf(kind);
  return { id: newId("i"), kind: def.id, x, y, w: def.w, h: def.h };
}

function buildCafeFloor(): StudioFloor {
  return {
    id: "preset-cafe",
    name: "Cafe",
    tiles: rectTiles(0, 0, 8, 6),
    items: [
      layoutItem("entrance", 0, 0),
      layoutItem("planters", 2, 0),
      layoutItem("bar", 3, 0),
      layoutItem("cashier", 6, 1),
      layoutItem("planters", 7, 5),
    ],
    tables: [
      layoutTable("1", 1, 2, "t2"),
      layoutTable("2", 3, 2, "t2"),
      layoutTable("3", 5, 2, "t4"),
      layoutTable("4", 7, 2, "t2"),
      layoutTable("5", 0, 3, "t2"),
      layoutTable("6", 1, 4, "t4"),
      layoutTable("7", 4, 4, "t4"),
      layoutTable("8", 7, 4, "t2"),
    ],
  };
}

function buildBistroFloor(): StudioFloor {
  return {
    id: "preset-bistro",
    name: "Bistro",
    tiles: rectTiles(0, 0, 12, 8),
    items: [
      layoutItem("kitchen", 0, 0),
      layoutItem("host", 4, 0),
      layoutItem("entrance", 5, 0),
      layoutItem("window", 6, 0),
      layoutItem("planters", 8, 0),
      layoutItem("restroom", 10, 0),
      layoutItem("waiter", 11, 6),
      layoutItem("planters", 11, 7),
    ],
    tables: [
      layoutTable("1", 0, 3, "b4"),
      layoutTable("2", 0, 6, "b4"),
      layoutTable("3", 3, 3, "t4"),
      layoutTable("4", 6, 3, "t4"),
      layoutTable("5", 9, 3, "t4"),
      layoutTable("6", 3, 6, "t4"),
      layoutTable("7", 6, 6, "t4"),
      layoutTable("8", 9, 6, "t4"),
    ],
  };
}

function buildDiningHallFloor(): StudioFloor {
  return {
    id: "preset-hall",
    name: "Dining hall",
    tiles: rectTiles(0, 0, 14, 10),
    items: [
      layoutItem("kitchen", 0, 0),
      layoutItem("prep", 4, 0),
      layoutItem("fridge", 7, 0),
      layoutItem("entrance", 9, 0),
      layoutItem("waiter", 11, 0),
      layoutItem("window", 12, 0),
      layoutItem("wall", 0, 9),
      layoutItem("window", 4, 9),
      layoutItem("window", 7, 9),
      layoutItem("wall", 11, 9),
    ],
    tables: [
      layoutTable("1", 1, 3, "t4"),
      layoutTable("2", 4, 3, "t4"),
      layoutTable("3", 7, 3, "t4"),
      layoutTable("4", 10, 3, "t4"),
      layoutTable("5", 1, 6, "t4"),
      layoutTable("6", 4, 6, "t4"),
      layoutTable("7", 7, 6, "t4"),
      layoutTable("8", 10, 6, "t4"),
      layoutTable("9", 13, 3, "t2"),
      layoutTable("10", 13, 5, "t2"),
    ],
  };
}

export const FLOOR_LAYOUT_PRESETS: readonly FloorLayoutPreset[] = [
  { id: "cafe", label: "Cafe", blurb: "8×6 · 8 tables, bar, door", build: buildCafeFloor },
  { id: "bistro", label: "Bistro", blurb: "12×8 · booths, kitchen, WC", build: buildBistroFloor },
  { id: "hall", label: "Dining hall", blurb: "14×10 · grid, kitchen, station", build: buildDiningHallFloor },
];

/** Replace one floor's tiles/items/tables. Keeps id and name. Renumbers from `tableStart`. */
export function applyLayoutPreset(
  floor: StudioFloor,
  preset: FloorLayoutPreset,
  tableStart = 1,
): void {
  const built = preset.build();
  floor.tiles = built.tiles;
  floor.items = built.items;
  floor.tables = built.tables.map((table, index) => ({
    ...table,
    no: String(tableStart + index),
  }));
}

export function nextTableStart(plan: StudioPlan, skipFloorId?: string): number {
  let max = 0;
  for (const floor of plan.floors) {
    if (skipFloorId && floor.id === skipFloorId) continue;
    for (const table of floor.tables) {
      const n = parseInt(table.no, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}
