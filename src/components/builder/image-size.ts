/** ~200KB cap on a data: URL persisted to `catalog_items.image` (a plain
 *  `text` column, not object storage) — see StepItems.tsx's photo-handling
 *  comment for the full rationale. */
export const MAX_IMAGE_BYTES = 200 * 1024;

/** Rough decoded byte size of a base64 data: URL (good enough for a soft cap). */
export function approxImageBytes(dataUrlOrUrl: string): number {
  if (!dataUrlOrUrl.startsWith("data:")) return 0; // a plain URL string is tiny
  const commaIndex = dataUrlOrUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? dataUrlOrUrl.slice(commaIndex + 1) : dataUrlOrUrl;
  return Math.floor((base64.length * 3) / 4);
}
