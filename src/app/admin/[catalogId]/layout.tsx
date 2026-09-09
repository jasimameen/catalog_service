import { getCatalogOrNotFound } from "@/app/admin/_lib/data";

export default async function CatalogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
  // RLS scopes the query to the signed-in account; a catalog belonging to
  // someone else (or a bad id) comes back as no rows, which we treat as a
  // real 404 rather than leaking existence.
  await getCatalogOrNotFound(catalogId);

  return children;
}
