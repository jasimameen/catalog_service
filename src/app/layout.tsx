import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--kl-font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--kl-font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const title = "HV Instant Catalog — Your catalog, live in five minutes";
const description =
  "Add your items, pick a template, share the link. Customers browse, add quantities and send an order — straight to your inbox and dashboard. No storefront to build, no developer.";

export const metadata: Metadata = {
  metadataBase: new URL("https://catalog.hevyf.com"),
  title,
  description,
  applicationName: "HV Catalog",
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "HV Instant Catalog",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport = {
  themeColor: "#0b5fce",
};

// NOTE: this layout wraps the marketing site, /admin and /auth. Tenant
// storefronts (src/app/s/[host]/page.tsx) provide their own CartProvider
// scoped to their own catalog id — cart state must never be shared between
// two different tenants' storefronts in the same browser.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexSans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
