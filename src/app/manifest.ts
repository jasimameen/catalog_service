import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_NAME_LONG } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: PRODUCT_NAME_LONG,
    short_name: PRODUCT_NAME,
    description: "Kitchen ops — orders, reservations, and table help.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#0b5fce",
    categories: ["business", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
