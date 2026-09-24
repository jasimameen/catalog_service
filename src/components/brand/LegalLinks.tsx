import Link from "next/link";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <span className={className}>
      <Link href="/terms" className="hover:underline">
        Terms
      </Link>
      <span aria-hidden> · </span>
      <Link href="/privacy" className="hover:underline">
        Privacy
      </Link>
    </span>
  );
}
