import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

const UPDATED_AT = new Date("2026-09-04T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return [
    {
      url: siteUrl.href,
      lastModified: UPDATED_AT,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/extension", siteUrl).href,
      lastModified: UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: new URL("/privacy", siteUrl).href,
      lastModified: UPDATED_AT,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
