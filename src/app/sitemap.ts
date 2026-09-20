import type { MetadataRoute } from "next";
import { PRODUCT_URL } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] =
    [
      { path: "/", priority: 1, changeFrequency: "weekly" },
      { path: "/live", priority: 0.8, changeFrequency: "weekly" },
      { path: "/setup", priority: 0.8, changeFrequency: "monthly" },
      { path: "/auth/sign-up", priority: 0.7, changeFrequency: "monthly" },
      { path: "/templates", priority: 0.5, changeFrequency: "monthly" },
    ];

  return pages.map((page) => ({
    url: page.path === "/" ? PRODUCT_URL : `${PRODUCT_URL}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
