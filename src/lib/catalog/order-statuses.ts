export const ORDER_STATUSES_SQL_HINT =
  "Run supabase/order-statuses.sql in the Supabase SQL editor, then try again.";

export const DUPLICATE_WINDOW_MS = 48 * 60 * 60 * 1000;

export type OrderStatusDef = {
  id: string;
  label: string;
  color?: string;
  sort: number;
  is_done: boolean;
};

export const DEFAULT_ORDER_STATUSES: OrderStatusDef[] = [
  { id: "new", label: "New", sort: 0, is_done: false, color: "#5b8def" },
  { id: "preparing", label: "Preparing", sort: 1, is_done: false, color: "#e3a008" },
  { id: "ready", label: "Ready for collection", sort: 2, is_done: false, color: "#0f9d58" },
  { id: "out_for_delivery", label: "Gone for delivery", sort: 3, is_done: false, color: "#7c3aed" },
  { id: "done", label: "Done", sort: 4, is_done: true, color: "#86868b" },
];

export const DEFAULT_ORDER_STATUS_ID = "new";

export type OrderStatusTemplate = {
  id: string;
  label: string;
  defaultId: string;
  statuses: OrderStatusDef[];
};

export const ORDER_STATUS_TEMPLATES: OrderStatusTemplate[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    defaultId: "new",
    statuses: DEFAULT_ORDER_STATUSES.map((row) => ({ ...row })),
  },
  {
    id: "pickup",
    label: "Pickup",
    defaultId: "new",
    statuses: [
      { id: "new", label: "New", sort: 0, is_done: false, color: "#5b8def" },
      { id: "preparing", label: "Preparing", sort: 1, is_done: false, color: "#e3a008" },
      { id: "ready", label: "Ready for pickup", sort: 2, is_done: false, color: "#0f9d58" },
      { id: "collected", label: "Collected", sort: 3, is_done: true, color: "#86868b" },
    ],
  },
  {
    id: "trade",
    label: "Trade / wholesale",
    defaultId: "new",
    statuses: [
      { id: "new", label: "New", sort: 0, is_done: false, color: "#5b8def" },
      { id: "confirmed", label: "Confirmed", sort: 1, is_done: false, color: "#0b5fce" },
      { id: "packed", label: "Packed", sort: 2, is_done: false, color: "#e3a008" },
      { id: "shipped", label: "Shipped", sort: 3, is_done: false, color: "#7c3aed" },
      { id: "done", label: "Done", sort: 4, is_done: true, color: "#86868b" },
    ],
  },
  {
    id: "simple",
    label: "Simple",
    defaultId: "new",
    statuses: [
      { id: "new", label: "New", sort: 0, is_done: false, color: "#5b8def" },
      { id: "in_progress", label: "In progress", sort: 1, is_done: false, color: "#e3a008" },
      { id: "done", label: "Done", sort: 2, is_done: true, color: "#86868b" },
    ],
  },
  {
    id: "services",
    label: "Services",
    defaultId: "new",
    statuses: [
      { id: "new", label: "New", sort: 0, is_done: false, color: "#5b8def" },
      { id: "scheduled", label: "Scheduled", sort: 1, is_done: false, color: "#0b5fce" },
      { id: "in_progress", label: "In progress", sort: 2, is_done: false, color: "#e3a008" },
      { id: "complete", label: "Complete", sort: 3, is_done: true, color: "#86868b" },
    ],
  },
];

export const EXTRA_STATUS_PRESETS: OrderStatusDef[] = [
  { id: "on_hold", label: "On hold", sort: 0, is_done: false, color: "#c27c0e" },
  { id: "cancelled", label: "Cancelled", sort: 0, is_done: true, color: "#b42318" },
  { id: "refunded", label: "Refunded", sort: 0, is_done: true, color: "#6941c6" },
  { id: "out_for_delivery", label: "Out for delivery", sort: 0, is_done: false, color: "#7c3aed" },
];

export const ORDER_FILTER_INCLUDE_EVENT = "catalog-order-filter-include";

export type OrderFilterIncludeDetail = {
  ids: string[];
  extras?: OrderStatusDef[];
};

export function includeStatusesInFilter(ids: string[], extras: OrderStatusDef[] = []) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OrderFilterIncludeDetail>(ORDER_FILTER_INCLUDE_EVENT, {
      detail: { ids, extras },
    }),
  );
}

export function applyStatusTemplate(
  template: OrderStatusDef[],
  current: OrderStatusDef[],
  usedCounts: Record<string, number>,
): OrderStatusDef[] {
  const templateIds = new Set(template.map((row) => row.id));
  const kept = current.filter((row) => (usedCounts[row.id] ?? 0) > 0 && !templateIds.has(row.id));
  return [...template.map((row) => ({ ...row })), ...kept.map((row) => ({ ...row }))].map(
    (row, sort) => ({ ...row, sort }),
  );
}

const LEGACY_DONE = new Set(["done", "confirmed", "cancelled"]);

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 48);
}

function cleanColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  return COLOR_RE.test(color) ? color : undefined;
}

function cleanId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 40);
}

export function slugifyStatusId(label: string, used: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "status";
  let id = base;
  let n = 2;
  while (used.has(id) || !ID_RE.test(id)) {
    const suffix = `_${n}`;
    id = `${base.slice(0, Math.max(1, 40 - suffix.length))}${suffix}`;
    n += 1;
    if (n > 99) {
      id = `status_${crypto.randomUUID().slice(0, 8)}`;
      break;
    }
  }
  return id;
}

export function parseOrderStatuses(value: unknown): OrderStatusDef[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_ORDER_STATUSES.map((row) => ({ ...row }));
  }

  const seen = new Set<string>();
  const rows: OrderStatusDef[] = [];

  for (const entry of value) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const id = cleanId(rec.id);
    if (!ID_RE.test(id) || seen.has(id)) continue;
    const label = cleanLabel(rec.label) || id;
    const color = cleanColor(rec.color);
    const sort = Number.isFinite(Number(rec.sort)) ? Number(rec.sort) : rows.length;
    rows.push({
      id,
      label,
      ...(color ? { color } : {}),
      sort,
      is_done: rec.is_done === true,
    });
    seen.add(id);
  }

  if (rows.length === 0) {
    return DEFAULT_ORDER_STATUSES.map((row) => ({ ...row }));
  }

  rows.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
  return rows.map((row, index) => ({ ...row, sort: index }));
}

export function parseDefaultOrderStatus(value: unknown, statuses: OrderStatusDef[]): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (id && statuses.some((row) => row.id === id)) return id;
  if (statuses.some((row) => row.id === DEFAULT_ORDER_STATUS_ID)) return DEFAULT_ORDER_STATUS_ID;
  return statuses[0]?.id ?? DEFAULT_ORDER_STATUS_ID;
}

export function resolveIncomingOrderStatus(catalog: {
  order_statuses?: unknown;
  default_order_status?: string | null;
}): string {
  const statuses = parseOrderStatuses(catalog.order_statuses);
  return parseDefaultOrderStatus(catalog.default_order_status, statuses);
}

export function statusById(statuses: OrderStatusDef[], id: string): OrderStatusDef | undefined {
  return statuses.find((row) => row.id === id);
}

export function statusLabel(statuses: OrderStatusDef[], id: string): string {
  const match = statusById(statuses, id);
  if (match) return match.label;
  if (id === "confirmed") return "Confirmed";
  if (id === "cancelled") return "Cancelled";
  return id.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) || "Unknown";
}

export function isTerminalStatus(id: string, statuses: OrderStatusDef[]): boolean {
  const match = statusById(statuses, id);
  if (match) return match.is_done;
  return LEGACY_DONE.has(id);
}

export function normalizeStatuses(rows: OrderStatusDef[]): OrderStatusDef[] {
  return rows.map((row, index) => ({
    id: row.id,
    label: cleanLabel(row.label) || row.id,
    ...(cleanColor(row.color) ? { color: cleanColor(row.color) } : {}),
    sort: index,
    is_done: row.is_done === true,
  }));
}

export function validateStatuses(
  rows: OrderStatusDef[],
  defaultId: string,
): { ok: true; statuses: OrderStatusDef[]; defaultId: string } | { ok: false; error: string } {
  if (rows.length === 0) return { ok: false, error: "Add at least one status." };
  const seen = new Set<string>();
  for (const row of rows) {
    if (!ID_RE.test(row.id)) return { ok: false, error: "Each status needs a stable id." };
    if (seen.has(row.id)) return { ok: false, error: "Status ids must be unique." };
    if (!cleanLabel(row.label)) return { ok: false, error: "Every status needs a label." };
    seen.add(row.id);
  }
  const statuses = normalizeStatuses(rows);
  const resolvedDefault = parseDefaultOrderStatus(defaultId, statuses);
  return { ok: true, statuses, defaultId: resolvedDefault };
}

export function itemSetKey(lines: { code: string; qty: number }[]): string {
  const qtyByCode = new Map<string, number>();
  for (const line of lines) {
    const code = typeof line.code === "string" ? line.code.trim() : "";
    const qty = Math.floor(Number(line.qty));
    if (!code || !Number.isFinite(qty) || qty <= 0) continue;
    qtyByCode.set(code, (qtyByCode.get(code) ?? 0) + qty);
  }
  if (qtyByCode.size === 0) return "";
  return [...qtyByCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, qty]) => `${code}:${qty}`)
    .join("|");
}

export function findDuplicateRefs(
  orders: { id: string; reference: string; status: string; created_at: string }[],
  itemsByOrder: Map<string, { code: string; qty: number }[]>,
  statuses: OrderStatusDef[],
  now = Date.now(),
): Map<string, string[]> {
  const cutoff = now - DUPLICATE_WINDOW_MS;
  const groups = new Map<string, { id: string; reference: string }[]>();

  for (const order of orders) {
    if (isTerminalStatus(order.status, statuses)) continue;
    const created = new Date(order.created_at).getTime();
    if (!Number.isFinite(created) || created < cutoff) continue;
    const key = itemSetKey(itemsByOrder.get(order.id) ?? []);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push({ id: order.id, reference: order.reference });
    groups.set(key, list);
  }

  const duplicates = new Map<string, string[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const order of group) {
      duplicates.set(
        order.id,
        group.filter((other) => other.id !== order.id).map((other) => other.reference),
      );
    }
  }
  return duplicates;
}

export function parseStatusFilterParam(
  raw: string | string[] | undefined,
  statuses: OrderStatusDef[],
): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  if (!value || !value.trim()) {
    return statuses.filter((row) => !row.is_done).map((row) => row.id);
  }
  const allowed = new Set(statuses.map((row) => row.id));
  const selected = value
    .split(",")
    .map((part) => part.trim())
    .filter((id) => allowed.has(id));
  return [...new Set(selected)];
}

export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const now = new Date();
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOrderTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export type WorkflowLaneId = "new" | "kitchen" | "ready" | "done";

export const WORKFLOW_LANES: { id: WorkflowLaneId; label: string }[] = [
  { id: "new", label: "New" },
  { id: "kitchen", label: "In kitchen" },
  { id: "ready", label: "Ready" },
  { id: "done", label: "Done" },
];

export function workflowLane(status: string, statuses: OrderStatusDef[]): WorkflowLaneId {
  const def = statusById(statuses, status);
  if (def?.is_done || LEGACY_DONE.has(status)) return "done";
  const hay = `${status} ${def?.label ?? ""}`.toLowerCase();
  if (/(ready|collect|out_for|gone|deliver|ship)/.test(hay)) return "ready";
  if (/(new|pending|receiv|hold|wait)/.test(hay)) return "new";
  if (/(prepar|kitchen|progress|confirm|pack|schedul)/.test(hay)) return "kitchen";
  const open = statuses.filter((row) => !row.is_done);
  const idx = open.findIndex((row) => row.id === status);
  if (idx <= 0) return "new";
  if (idx === open.length - 1) return "ready";
  return "kitchen";
}

export function statusesForLane(lane: WorkflowLaneId, statuses: OrderStatusDef[]): string[] {
  return statuses.filter((row) => workflowLane(row.id, statuses) === lane).map((row) => row.id);
}

export function nextWorkflowAction(
  status: string,
  statuses: OrderStatusDef[],
): { nextId: string; label: string } | null {
  const ordered = [...statuses].sort((a, b) => a.sort - b.sort);
  const idx = ordered.findIndex((row) => row.id === status);
  const next = idx >= 0 ? ordered[idx + 1] : ordered.find((row) => !row.is_done);
  if (!next) return null;
  return { nextId: next.id, label: nextActionLabel(status, next) };
}

function nextActionLabel(current: string, next: OrderStatusDef): string {
  const from = current.toLowerCase();
  const to = `${next.id} ${next.label}`.toLowerCase();
  if (/(new|pending|receiv|hold|wait)/.test(from)) return "Accept";
  if (/(prepar|kitchen|progress|confirm|pack|schedul)/.test(from)) {
    if (/(ready|collect)/.test(to) || next.is_done) return "Ready";
    return "Start";
  }
  if (/(ready|collect|out_for|gone|deliver)/.test(from) || next.is_done) return "Done";
  if (/(prepar|kitchen|progress)/.test(to)) return "Start";
  if (/(ready|collect)/.test(to)) return "Ready";
  if (next.is_done) return "Done";
  return next.label;
}

export type StatusIconKind = "clock" | "package" | "check" | "truck";

/** Pick a calm receipt icon from the status id or label. */
export function statusIconKind(id: string, label = ""): StatusIconKind {
  const hay = `${id} ${label}`.toLowerCase();
  if (/(deliver|ship|truck|out_for|gone)/.test(hay)) return "truck";
  if (/(done|complete|collect|ready|confirm)/.test(hay)) return "check";
  if (/(new|schedul|pending|hold|wait|receiv)/.test(hay)) return "clock";
  return "package";
}
