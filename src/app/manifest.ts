import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dr. Elizabeth Peeling",
    short_name: "Dr. Peeling",
    description:
      "Invisalign and cosmetic dentistry with Dr. Elizabeth Peeling in Vaudreuil-Dorion.",
    start_url: "/en",
    display: "browser",
    background_color: "#FAF7F5",
    theme_color: "#595448",
    icons: [
      {
        src: "/elizabeth-hero.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
