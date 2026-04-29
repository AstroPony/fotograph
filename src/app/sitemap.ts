import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-04-28"),
      changeFrequency: "weekly",
      priority: 1.0,
      images: [`${SITE_URL}/fotograph-logo.png`],
    },
    { url: `${SITE_URL}/login`,       lastModified: new Date("2026-04-28"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`,     lastModified: new Date("2026-04-01"), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/voorwaarden`, lastModified: new Date("2026-04-01"), changeFrequency: "yearly",  priority: 0.3 },
  ];
}
