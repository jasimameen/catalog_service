export function PausedNote({ message }: { message: string }) {
  return (
    <p className="min-h-11 rounded-[9px] bg-[#f5f5f7] px-3 py-2 text-center text-sm text-[var(--cat-muted)]">
      {message}
    </p>
  );
}
