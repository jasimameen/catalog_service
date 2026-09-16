import type { ReactNode } from "react";

/** Category chips + featured strip, always after the store header. */
export function CatalogSlots({
  filters,
  featured,
}: {
  filters?: ReactNode;
  featured?: ReactNode;
}) {
  return (
    <>
      {filters ? (
        <div className="border-b border-[var(--cat-border)] bg-white print:hidden">
          <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6">{filters}</div>
        </div>
      ) : null}
      {featured}
    </>
  );
}
