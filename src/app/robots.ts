import type { MetadataRoute } from "next";
import { PRODUCT_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/live", "/setup", "/auth/sign-up", "/templates", "/llms.txt"],
        disallow: ["/admin", "/api/", "/new", "/reset-password", "/auth/callback", "/auth/verify", "/auth/sign-in", "/s/"],
      },
    ],
    sitemap: `${PRODUCT_URL}/sitemap.xml`,
    host: PRODUCT_URL,
  };
}
