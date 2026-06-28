import { links } from "@/config/links";
import type { SiteContent } from "@/content/types";

export function buildJsonLd(content: SiteContent) {
  const { address } = links;

  const dentist = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: content.hero.name,
    description: content.meta.description,
    url: content.locale === "en" ? "https://elizabethpeeling.ca/en" : "https://elizabethpeeling.ca/fr",
    telephone: links.phoneDisplay,
    email: "info@le32.ca",
    image: "https://elizabethpeeling.ca/og-image.jpg",
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.province,
      postalCode: address.postal,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 45.4001,
      longitude: -74.0324,
    },
    areaServed: {
      "@type": "City",
      name: "Vaudreuil-Dorion",
    },
    medicalSpecialty: "Cosmetic Dentistry",
    memberOf: [
      { "@type": "Organization", name: "Ordre des dentistes du Québec" },
      { "@type": "Organization", name: "American Academy of Clear Aligners" },
    ],
    worksFor: {
      "@type": "Dentist",
      name: "LE 32 Clinique Dentaire",
      url: links.clinicWebsite,
      address: {
        "@type": "PostalAddress",
        streetAddress: address.street,
        addressLocality: address.city,
        addressRegion: address.province,
        postalCode: address.postal,
        addressCountry: address.country,
      },
    },
    sameAs: [
      links.luminoReviews,
      links.aacaProfile,
      links.le32Team,
      links.instagram,
      links.facebook,
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const aggregateRating = {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: "4.8",
    bestRating: "5",
    ratingCount: "21",
    itemReviewed: {
      "@type": "Dentist",
      name: content.hero.name,
    },
  };

  return [dentist, faqPage, aggregateRating];
}
