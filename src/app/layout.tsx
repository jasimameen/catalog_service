import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import { HOME_DESCRIPTION, HOME_TITLE, SEO_PRODUCT } from "@/lib/seo/marketing";
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
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://catalog.hevyf.com"),
  title: {
    default: HOME_TITLE,
    template: "%s",
  },
  description: HOME_DESCRIPTION,
  applicationName: SEO_PRODUCT,
  robots: { index: true, follow: true },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    siteName: SEO_PRODUCT,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#0b5fce",
  viewportFit: "cover" as const,
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
