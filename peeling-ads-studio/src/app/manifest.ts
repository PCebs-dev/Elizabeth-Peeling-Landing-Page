import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dr. Elizabeth Peeling Ads Studio",
    short_name: "Peeling Studio",
    description:
      "Private Instagram and Facebook creative studio for Dr. Elizabeth Peeling.",
    start_url: "/studio",
    scope: "/studio",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF7F5",
    theme_color: "#595448",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
