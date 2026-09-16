import type { StatusIconKind } from "@/lib/catalog/order-statuses";

export function StatusIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: StatusIconKind;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (kind === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg {...common}>
        <path d="M4 12.5 9.5 18 20 6.5" />
      </svg>
    );
  }
  if (kind === "truck") {
    return (
      <svg {...common}>
        <path d="M2.5 6.5h10v10H2.5z" />
        <path d="M12.5 10.5h4L20.5 14v2.5h-8" />
        <circle cx="6" cy="17.9" r="1.6" />
        <circle cx="17" cy="17.9" r="1.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}
