import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data";
import { developerPath, siteUrl, wishPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/wishes`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/principles`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/features`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/developers`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];
  const entries = await getSitemapEntries().catch(() => null);
  if (!entries) return staticPages;
  return [
    ...staticPages,
    ...entries.wishes.map((w) => ({ url: `${base}${wishPath(w.id)}`, lastModified: w.updated_at, priority: 0.7 })),
    ...entries.developers.map((d) => ({
      url: `${base}${developerPath(d.handle)}`,
      ...(d.updated_at && { lastModified: d.updated_at }),
      priority: 0.4,
    })),
  ];
}
