import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { getContent } from "@/content";

export const metadata: Metadata = {
  title: getContent("en").meta.title,
  description: getContent("en").meta.description,
  keywords: getContent("en").meta.keywords,
  alternates: {
    canonical: "/en",
    languages: {
      en: "/en",
      fr: "/fr",
    },
  },
  openGraph: {
    title: getContent("en").meta.title,
    description: getContent("en").meta.description,
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    type: "website",
    siteName: "Dr. Elizabeth Peeling",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Dr. Elizabeth Peeling" }],
  },
};

export default function EnglishPage() {
  return <LandingPage content={getContent("en")} />;
}
