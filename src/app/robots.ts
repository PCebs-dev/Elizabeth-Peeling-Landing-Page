import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/studio/", "/api/studio"],
    },
    sitemap: "https://elizabethpeeling.ca/sitemap.xml",
  };
}
