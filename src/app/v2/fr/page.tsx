import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { getContent } from "@/content";

export const metadata: Metadata = {
  title: getContent("fr").meta.title,
  description: getContent("fr").meta.description,
  robots: { index: false, follow: true },
};

export default function FrenchV2Page() {
  return <LandingPage content={getContent("fr")} theme="teal" basePath="/v2" />;
}
