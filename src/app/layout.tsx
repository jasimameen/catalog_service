import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import { CartProvider } from "@/lib/catalog/cart-context";
import "./globals.css";

const archivo = Archivo({
  variable: "--kl-font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--kl-font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const title = "Kleaner Catalogue — Order Cleaning Supplies";
const description =
  "Browse the full Kleaner cleaning products catalogue — mops, brooms, brushes, scourers, cloths and more. Add items to your order and we'll call to confirm stock and delivery.";

const ogImage = "/catalog/brand/og-cover.jpg";
const ogImageAlt =
  "Flat-lay of Kleaner cleaning supplies — microfiber flat mop, folded microfiber cloths, scrub brush, sponges and squeegee.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Kleaner",
    "cleaning supplies Qatar",
    "cleaning products catalogue",
    "wholesale cleaning supplies",
    "mops and brooms",
    "Citadel Trading",
  ],
  applicationName: "Kleaner Catalogue",
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_QA",
    siteName: "Kleaner Catalogue",
    images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: ogImage, alt: ogImageAlt }],
  },
};

export const viewport = {
  themeColor: "#0b5fce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexSans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
