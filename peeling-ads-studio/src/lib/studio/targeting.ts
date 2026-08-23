import type { MetaTargetingBrief, StudioCategoryId } from "./ad-types";
import { getCategory } from "./categories";

export const STUDIO_CLINIC = {
  doctorName: "Dr. Elizabeth Peeling",
  doctorNameFr: "Dre Elizabeth Peeling",
  practiceName: "Clinique LE 32",
  practiceNameLong: "Clinique LE 32 (LE 32 Clinique Dentaire)",
  phoneDisplay: "(450) 424-5332",
  phoneE164: "+14504245332",
  bookingUrl: "https://www.le32.ca/en/contact-us",
  smileViewUrl:
    "https://cus-invisalign-starter-use-prd.herokuapp.com/sv/1752134",
  financingNote: "Beautifi financing available",
  financingNoteFr: "Financement Beautifi disponible",
  instagram: "@dr.elizabeth.peeling",
  facebook: "https://www.facebook.com/le32cliniquedentaire",
  landingUrl: "https://elizabethpeeling.ca",
  address: {
    street: "22800 Chemin Dumberry, Suite 1C",
    city: "Vaudreuil-Dorion",
    province: "QC",
    postal: "J7V 0M8",
    country: "CA",
  },
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
      "Set destination URL to the landing page or booking link with UTMs",
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
