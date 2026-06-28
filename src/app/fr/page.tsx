import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { getContent } from "@/content";

export const metadata: Metadata = {
  title: getContent("fr").meta.title,
  description: getContent("fr").meta.description,
  keywords: getContent("fr").meta.keywords,
  alternates: {
    canonical: "/fr",
    languages: {
      en: "/en",
      fr: "/fr",
    },
  },
  openGraph: {
    title: getContent("fr").meta.title,
    description: getContent("fr").meta.description,
    locale: "fr_CA",
    alternateLocale: ["en_CA"],
    type: "website",
    siteName: "Dre Elizabeth Peeling",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Dre Elizabeth Peeling" }],
  },
};

export default function FrenchPage() {
  return <LandingPage content={getContent("fr")} />;
}
