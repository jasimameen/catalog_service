export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  // Auth + 404 live on the page (requireAccount / getCatalogOrNotFound).
  // Keeping this layout free of data fetches lets loading.tsx show immediately
  // when switching Dashboard / Items / Orders / Domains.
  return children;
}
