import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { getContent } from "@/content";

export const metadata: Metadata = {
  title: getContent("en").meta.title,
  description: getContent("en").meta.description,
  robots: { index: false, follow: true },
};

export default function EnglishV2Page() {
  return <LandingPage content={getContent("en")} theme="teal" basePath="/v2" />;
}
