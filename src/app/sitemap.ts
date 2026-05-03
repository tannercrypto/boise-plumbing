// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url:              BASE_URL,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/emergency-plumber-boise`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.9,
    },
    {
      url:              `${BASE_URL}/drain-cleaning-boise`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.8,
    },
    {
      url:              `${BASE_URL}/water-heater-repair-boise`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.8,
    },
    {
      url:              `${BASE_URL}/contact`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.7,
    },
  ];
}
