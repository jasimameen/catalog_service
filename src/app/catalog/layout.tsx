import type { Metadata } from "next";
import { CartProvider } from "@/lib/catalog/cart-context";

export const metadata: Metadata = {
  title: "Kleaner Catalogue — Order Cleaning Supplies",
  description:
    "Browse the Kleaner cleaning products catalogue and place your order in a few taps.",
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen cursor-auto bg-slate-50 text-slate-900">
      <CartProvider>{children}</CartProvider>
    </div>
  );
}
