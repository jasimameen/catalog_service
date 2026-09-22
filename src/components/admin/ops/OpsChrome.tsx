import type { ReactNode } from "react";
import type { WorkflowLaneId } from "@/lib/catalog/order-statuses";
import { LANE_TONE, orderIdentity } from "@/lib/catalog/order-identity";
import { TypeMark } from "@/components/orders/FulfillmentTypeBadge";
import type { OrderRow } from "@/lib/supabase/types";

export function OpsSegmented({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-[11px] bg-black/[0.04] p-[3px]"
    >
      {children}
    </div>
  );
}

export function OpsSegment({
  selected,
  onClick,
  children,
  href,
}: {
  selected: boolean;
  onClick?: () => void;
  children: ReactNode;
  href?: string;
}) {
  const className = `ops-press inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium no-underline ${
    selected
      ? "bg-[var(--cat-accent)] text-white"
      : "bg-transparent text-[#5a6472]"
  }`;
  if (href) {
    return (
      <a href={href} className={className} aria-current={selected ? "page" : undefined}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={className}>
      {children}
    </button>
  );
}

export function OpsPrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  pill = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  pill?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ops-press inline-flex min-h-10 min-w-[4.5rem] cursor-pointer items-center justify-center bg-[var(--cat-accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--cat-accent-dark)] ${
        pill ? "rounded-full" : "rounded-[10px]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function OpsGhostButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ops-press inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-[10px] px-2.5 text-[13px] font-medium text-[#5a6472] hover:bg-black/[0.04] hover:text-[var(--cat-ink)] ${className}`}
    >
      {children}
    </button>
  );
}

export function StatusCue({
  lane,
  label,
}: {
  lane: WorkflowLaneId;
  label: string;
}) {
  const tone = LANE_TONE[lane];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#5a6472]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.ink }} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function OrderHero({
  order,
  size = "row",
}: {
  order: Pick<OrderRow, "fulfillment" | "table_no" | "location"> & { shop_name?: string | null };
  size?: "row" | "display";
}) {
  const id = orderIdentity(order);
  const dineIn = id.kind === "dine_in";
  return (
    <span className="flex min-w-0 items-start gap-2">
      <span
        className={`mt-0.5 shrink-0 ${dineIn ? "text-[var(--cat-accent)]" : "text-[#9aa3af]"}`}
        aria-hidden
      >
        <TypeMark kind={id.kind} size={size === "display" ? 18 : 15} />
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate font-semibold tracking-tight text-[var(--cat-ink)] ${
            size === "display" ? "text-[1.375rem] leading-[1.1] tracking-[-0.02em]" : "text-[15px] leading-tight"
          }`}
        >
          {id.title}
        </span>
        <span className={`mt-0.5 block truncate text-[12px] ${dineIn ? "text-[#86868b]" : "text-[#9aa3af]"}`}>
          {id.meta}
        </span>
      </span>
    </span>
  );
}

export function TypeCue({
  order,
}: {
  order: Pick<OrderRow, "fulfillment" | "table_no" | "location"> & { shop_name?: string | null };
}) {
  const id = orderIdentity(order);
  if (id.kind === "dine_in") return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[#9aa3af]">
      <TypeMark kind={id.kind} size={13} />
      {id.meta}
    </span>
  );
}
