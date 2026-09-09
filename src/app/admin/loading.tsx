export default function AdminLoading() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[5] border-b border-[var(--cat-border)] bg-white/85 px-5 py-3.5 sm:px-8">
        <div className="h-5 w-36 animate-pulse rounded bg-[#f0f0f4]" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-[#f0f0f4]" />
      </div>
      <div className="grid grid-cols-1 gap-[18px] p-4 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[18px] border border-[var(--cat-border)]">
            <div className="aspect-[16/10] animate-pulse bg-[var(--cat-photo-bg)]" />
            <div className="flex flex-col gap-2 p-[18px] pt-4">
              <div className="h-3 w-12 animate-pulse rounded bg-[#f0f0f4]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-[#f0f0f4]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#f0f0f4]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
