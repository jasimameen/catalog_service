export default function CatalogLoading() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[5] border-b border-[var(--cat-border)] bg-white/85 px-5 py-3.5 sm:px-8">
        <div className="h-5 w-40 animate-pulse rounded bg-[#f0f0f4]" />
        <div className="mt-2 h-3 w-52 animate-pulse rounded bg-[#f0f0f4]" />
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-8">
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--cat-photo-bg)]" />
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--cat-photo-bg)]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--cat-border)] bg-white" />
      </div>
    </div>
  );
}
