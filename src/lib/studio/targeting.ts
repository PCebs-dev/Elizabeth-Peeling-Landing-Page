import { links } from "@/config/links";
import type { MetaTargetingBrief, StudioCategoryId } from "./types";
import { getCategory } from "./categories";

export const STUDIO_CLINIC = {
  doctorName: "Dr. Elizabeth Peeling",
  doctorNameFr: "Dre Elizabeth Peeling",
  /** Spoken / social brand form */
  practiceName: "Clinique LE 32",
  /** Longer clinic name when needed */
  practiceNameLong: "Clinique LE 32 (LE 32 Clinique Dentaire)",
  phoneDisplay: links.phoneDisplay,
  phoneE164: "+14504245332",
  bookingUrl: links.booking,
  bookingUrlFr: links.bookingFr,
  smileViewUrl: links.smileSimulation,
  financingNote: "Beautifi financing available",
  financingNoteFr: "Financement Beautifi disponible",
  instagram: links.instagramHandle,
  facebook: links.facebook,
  landingUrl: "https://elizabethpeeling.ca",
  address: links.address,
  lat: 45.3994,
  lng: -74.0276,
  radiusKm: 35,
} as const;

const PRIMARY_CITIES = [
  "Vaudreuil-Dorion",
  "Saint-Lazare",
  "Hudson",
  "Pincourt",
  "L'Île-Perrot",
  "Notre-Dame-de-l'Île-Perrot",
];

const SECONDARY_CITIES = [
  "Pointe-Claire",
  "Kirkland",
  "Beaconsfield",
  "Dollard-des-Ormeaux",
  "Dorval",
  "Pierrefonds",
  "Sainte-Anne-de-Bellevue",
  "Baie-d'Urfé",
];

export function buildMetaTargetingBrief(
  categoryId: StudioCategoryId
): MetaTargetingBrief {
  const category = getCategory(categoryId);

  return {
    radiusKm: STUDIO_CLINIC.radiusKm,
    ageMin: 25,
    ageMax: 54,
    primaryCities: PRIMARY_CITIES,
    secondaryCities: SECONDARY_CITIES,
    interests: category.defaultInterests,
    placements: [
      "Instagram Feed",
      "Instagram Stories",
      "Instagram Reels",
      "Facebook Feed",
      "Facebook Stories",
    ],
    checklist: [
      "Create a Traffic or Leads campaign in Meta Ads Manager",
      "Set location: people living in or recently in the area — pin clinic address with 35 km radius, or add primary cities listed below",
      "Age 25–54 (adjust if needed for the treatment)",
      "Add detailed targeting interests from the list below (or use Advantage+ and let Meta optimize)",
      "Upload your selected photo(s) as the creative",
      "Paste primary text, headline, and description from the export",
      "Set destination URL to the LE 32 reservation page (le32.ca contact / appointment request) with UTMs",
      "Start with a modest daily budget ($15–$40 CAD) and review after 3–5 days",
      "Add French creative if you selected bilingual output",
    ],
  };
}

export function utmUrl(
  base: string,
  opts: { source: string; medium: string; campaign: string; content: string }
): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", opts.source);
  url.searchParams.set("utm_medium", opts.medium);
  url.searchParams.set("utm_campaign", opts.campaign);
  url.searchParams.set("utm_content", opts.content);
  return url.toString();
}

const BOOKING_URL_RE =
  /le32\.ca\/(?:en\/contact-us|fr\/nous-contacter)/i;

const LINK_IN_BIO_RE = /link in bio|lien dans la bio/i;

export function clinicBookingUrl(french: boolean): string {
  return french ? links.bookingFr : links.booking;
}

export function instagramLinkInBioLine(french: boolean): string {
  return french
    ? "Prenez rendez-vous à la Clinique LE 32 - lien dans la bio."
    : "Book at Clinique LE 32 - link in bio.";
}

function stripBookingUrls(caption: string): string {
  return caption
    .replace(
      /\n*https?:\/\/(?:www\.)?le32\.ca\/(?:en\/contact-us|fr\/nous-contacter)\S*/gi,
      ""
    )
    .trim();
}

/**
 * Instagram feed captions do not have a tappable booking button, so organic IG
 * copy uses "link in bio". Facebook captions also get the live LE 32 URL.
 */
export function withClinicBookingLink(
  caption: string,
  cta: string,
  french: boolean,
  opts?: { forFacebook?: boolean }
): string {
  let body = stripBookingUrls(caption.trim());
  const url = clinicBookingUrl(french);

  if (opts?.forFacebook) {
    const ctaLine = (
      cta.trim() ||
      (french ? "Prendre rendez-vous" : "Book your consultation")
    ).trim();
    if (BOOKING_URL_RE.test(body)) return body;
    return `${body}\n\n${ctaLine}\n${url}`;
  }

  if (!LINK_IN_BIO_RE.test(body)) {
    body = `${body}\n\n${instagramLinkInBioLine(french)}`;
  }
  return body;
}
