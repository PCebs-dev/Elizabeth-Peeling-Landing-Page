import type { SiteContent } from "@/content/types";
import { LanguageToggle } from "./LanguageToggle";
import { Hero } from "./Hero";
import { LinkCard } from "./LinkCard";
import { TrustStrip } from "./ServicesSection";
import { ServicesSection } from "./ServicesSection";
import { PressBanner } from "./PressBanner";
import { FaqSection } from "./FaqSection";
import { ChatWidget } from "./ChatWidget";
import { StickyCta } from "./StickyCta";
import { SchemaJsonLd } from "./SchemaJsonLd";

export type Theme = "default" | "teal";

interface LandingPageProps {
  content: SiteContent;
  theme?: Theme;
  basePath?: string;
}

export function LandingPage({
  content,
  theme = "default",
  basePath = "",
}: LandingPageProps) {
  const bookingHref = content.ctas.find((c) => c.id === "book")?.href ?? "#";

  return (
    <>
      <SchemaJsonLd content={content} />
      <div
        className={`${theme === "teal" ? "theme-teal " : ""}min-h-screen bg-gradient-to-b from-brand-50 via-white to-brand-50`}
      >
        <div className="mx-auto max-w-lg px-4 pb-28 pt-6 sm:pb-12 sm:pt-10">
          <div className="mb-6 flex justify-end">
            <LanguageToggle locale={content.locale} basePath={basePath} />
          </div>

          <Hero content={content} />

          <div className="mt-8 space-y-3">
            {content.ctas.map((cta) => (
              <LinkCard key={cta.id} link={cta} />
            ))}
          </div>

          <div className="mt-8">
            <TrustStrip items={content.trust} />
          </div>

          <div className="mt-12 space-y-12">
            <ServicesSection content={content} />
            <PressBanner content={content} />
            <FaqSection content={content} />
          </div>

          <footer className="mt-12 space-y-3 border-t border-brand-100 pt-8 text-center">
            <p className="text-xs leading-relaxed text-brand-500">{content.footer.disclaimer}</p>
            <p className="text-sm text-brand-600">{content.footer.clinicNote}</p>
            <p className="text-xs text-brand-400">{content.footer.copyright}</p>
          </footer>
        </div>

        <ChatWidget content={content} />
        <StickyCta content={content} bookingHref={bookingHref} />
      </div>
    </>
  );
}
