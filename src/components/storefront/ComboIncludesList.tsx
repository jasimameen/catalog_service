import type { StorefrontComboLine } from "@/lib/catalog/types";
import { ComboIncludes } from "./ComboIncludes";

/** Grid / modal alias — same includes stack, no child prices. */
export function ComboIncludesList({
  lines,
  size = "sm",
  layout = "wrap",
  className = "",
}: {
  lines: StorefrontComboLine[];
  size?: "sm" | "md";
  layout?: "wrap" | "list";
  className?: string;
}) {
  return <ComboIncludes lines={lines} size={size} layout={layout} className={className} />;
}
