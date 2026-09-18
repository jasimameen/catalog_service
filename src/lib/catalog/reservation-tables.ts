import type { ReservationRow } from "@/lib/supabase/types";

export type ReservationTableRef = { id: string; no: string };

export function parseReservationTables(raw: unknown): ReservationTableRef[] {
  if (!Array.isArray(raw)) return [];
  const out: ReservationTableRef[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    let id = "";
    let no = "";
    if (typeof entry === "string") {
      no = entry.replace(/[\r\n]+/g, " ").trim().slice(0, 16);
      id = no;
    } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      id = typeof obj.id === "string" ? obj.id.replace(/[\r\n]+/g, " ").trim().slice(0, 40) : "";
      no = typeof obj.no === "string" ? obj.no.replace(/[\r\n]+/g, " ").trim().slice(0, 16) : "";
    }
    if (!id && !no) continue;
    const key = `${id || no}:${no || id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: id || no, no: no || id });
  }
  return out;
}

export function reservationTableRefs(
  row: Pick<ReservationRow, "table_id" | "table_no" | "table_ids">,
): ReservationTableRef[] {
  const parsed = parseReservationTables(row.table_ids);
  if (parsed.length > 0) return parsed;
  const no = typeof row.table_no === "string" ? row.table_no.trim() : "";
  if (!no) return [];
  const id = typeof row.table_id === "string" && row.table_id.trim() ? row.table_id.trim() : no;
  return [{ id, no }];
}

export function reservationTablesLabel(
  row: Pick<ReservationRow, "table_id" | "table_no" | "table_ids">,
): string {
  const refs = reservationTableRefs(row);
  if (refs.length === 0) return "No preference";
  return refs.map((t) => `Table ${t.no}`).join(" + ");
}

export function reservationHasTables(row: Pick<ReservationRow, "table_id" | "table_no" | "table_ids">): boolean {
  return reservationTableRefs(row).length > 0;
}

export function tableRefsOverlap(
  booked: ReservationTableRef[],
  wanted: ReservationTableRef[],
): ReservationTableRef[] {
  const ids = new Set(booked.map((t) => t.id).filter(Boolean));
  const nos = new Set(booked.map((t) => t.no).filter(Boolean));
  return wanted.filter((t) => (t.id && ids.has(t.id)) || (t.no && nos.has(t.no)));
}
