import type { MetadataRoute } from "next";

export default function studioManifest(): MetadataRoute.Manifest {
  return {
    name: "Peeling Ads Studio",
    short_name: "Peeling Studio",
    description:
      "Private Instagram and Facebook studio for Dr. Elizabeth Peeling.",
    start_url: "/studio",
    scope: "/studio",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F5",
    theme_color: "#595448",
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
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
