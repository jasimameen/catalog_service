import type { ItemOptionGroup, ItemOptionValue, SelectedOption } from "@/lib/supabase/types";

function asName(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asDelta(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function parseItemOptions(raw: unknown): ItemOptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: ItemOptionGroup[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const name = asName(obj.name);
    if (!name) continue;
    const type = obj.type === "multi" ? "multi" : "single";
    const values: ItemOptionValue[] = [];
    if (Array.isArray(obj.values)) {
      for (const v of obj.values) {
        if (!v || typeof v !== "object" || Array.isArray(v)) continue;
        const row = v as Record<string, unknown>;
        const valueName = asName(row.name);
        if (!valueName) continue;
        values.push({ name: valueName, price_delta: asDelta(row.price_delta) });
      }
    }
    groups.push({
      name,
      type,
      required: Boolean(obj.required),
      values,
    });
  }
  return groups;
}

export function hasItemOptions(item: { options?: ItemOptionGroup[] | unknown } | null | undefined): boolean {
  return parseItemOptions(item?.options).some((group) => group.values.length > 0);
}

/** Short storefront cue so variant items never look like a single SKU. */
export function optionsCue(item: { options?: ItemOptionGroup[] | unknown } | null | undefined): string | null {
  const groups = parseItemOptions(item?.options).filter((group) => group.values.length > 0);
  if (groups.length === 0) return null;
  const count = groups.reduce((sum, group) => sum + group.values.length, 0);
  if (groups.length === 1) {
    const name = groups[0]!.name;
    return count > 1 ? `${name} · ${count} options` : name;
  }
  return `${count} options`;
}

export function optionsKey(options: SelectedOption[]): string {
  if (!options.length) return "";
  return options
    .map((group) => {
      const names = group.values.map((v) => v.name).sort().join("+");
      return `${group.group}=${names}`;
    })
    .sort()
    .join("|");
}

export function lineKey(code: string, options: SelectedOption[]): string {
  const key = optionsKey(options);
  return key ? `${code}::${key}` : code;
}

export function formatSelectedOptions(options: SelectedOption[]): string {
  return options
    .map((group) => {
      const names = group.values.map((v) => v.name).join(", ");
      return names ? `${group.group}: ${names}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

export function unitPriceWithOptions(base: number, options: SelectedOption[]): number {
  let total = Number(base) || 0;
  for (const group of options) {
    for (const value of group.values) {
      total += Number(value.price_delta) || 0;
    }
  }
  return Math.round(total * 100) / 100;
}

/** Recompute selected option deltas from the catalog item — never trust the client. */
export function resolveSelectedOptions(
  groups: ItemOptionGroup[],
  requested: unknown,
): { options: SelectedOption[]; error?: string } {
  const incoming = Array.isArray(requested) ? requested : [];
  const byGroup = new Map<string, string[]>();
  for (const entry of incoming) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const groupName = asName(obj.group);
    if (!groupName) continue;
    const names: string[] = [];
    if (Array.isArray(obj.values)) {
      for (const v of obj.values) {
        if (typeof v === "string") {
          const name = asName(v);
          if (name) names.push(name);
          continue;
        }
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const name = asName((v as Record<string, unknown>).name);
          if (name) names.push(name);
        }
      }
    }
    byGroup.set(groupName, names);
  }

  const options: SelectedOption[] = [];
  for (const group of groups) {
    if (group.values.length === 0) continue;
    const picked = byGroup.get(group.name) ?? [];
    const unique = Array.from(new Set(picked));
    const values: ItemOptionValue[] = [];
    for (const name of unique) {
      const found = group.values.find((v) => v.name === name);
      if (found) values.push({ name: found.name, price_delta: found.price_delta });
    }
    if (group.type === "single" && values.length > 1) {
      values.splice(1);
    }
    if (group.required && values.length === 0) {
      return { options: [], error: `Choose ${group.name}.` };
    }
    if (values.length > 0) {
      options.push({ group: group.name, values });
    }
  }
  return { options };
}

export function parseOptionsFromForm(raw: unknown): ItemOptionGroup[] {
  if (typeof raw === "string") {
    try {
      return parseItemOptions(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return parseItemOptions(raw);
}
