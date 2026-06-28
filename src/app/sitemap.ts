import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://elizabethpeeling.ca";
  return [
    { url: `${base}/en`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${base}/fr`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
  ];
}
