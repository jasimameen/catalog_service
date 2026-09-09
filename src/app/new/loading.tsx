export default function NewCatalogLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#e8e8ed] px-4 sm:px-6">
        <div className="h-3 w-20 animate-pulse rounded bg-[#f0f0f4]" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-[#f0f0f4]" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-[#f0f0f4]" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-[#f0f0f4]" />
        </div>
        <div className="h-3 w-16 animate-pulse rounded bg-[#f0f0f4]" />
      </div>
      <div className="grid flex-1 gap-6 p-4 sm:p-8 lg:grid-cols-2">
        <div className="h-[420px] animate-pulse rounded-2xl bg-[#f5f5f7]" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-[#f5f5f7]" />
      </div>
    </div>
  );
}
