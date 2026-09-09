export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function generateOrderReference(catalogSlug: string, orderPrefix = ""): string {
  const custom = orderPrefix.trim().replace(/-+$/, "");
  const prefix = custom || (catalogSlug.slice(0, 2) || "cl").toUpperCase();
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}
