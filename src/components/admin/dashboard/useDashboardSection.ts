"use client";

import { useEffect, useState } from "react";

/**
 * Mobile accordion state. Desktop always shows the body via `hidden md:block`.
 * Starts closed so phones do not flash the long Look / Ordering forms.
 */
export function useDashboardSection(id: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const apply = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [id]);

  return [open, setOpen] as const;
}
