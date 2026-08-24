/**
 * External integration URLs — update these when final links are confirmed.
 */
export const links = {
  booking: "https://www.le32.ca/en/contact-us",
  bookingFr: "https://www.le32.ca/fr/nous-contacter",
  phone: "tel:+14504245332",
  phoneDisplay: "(450) 424-5332",
  email: "mailto:info@le32.ca",
  clinicWebsite: "https://www.le32.ca/en/home",
  clinicWebsiteFr: "https://www.le32.ca/fr/accueil",
  financing:
    "https://beautifi-v2.vercel.app/auth/sign-in?callbackUrl=https%3A%2F%2Fbeautifi-v2.vercel.app%2Fapplications%2Fle-32-clinique-dentaire%2Fapply%3Futm_medium%3Dportal_qr_code%26utm_source%3Dclinic%26utm_campaign%3Dle-32-clinique-dentaire%26utm_content%3Dapplication",
  financingProvider: "https://beautifi.com/",
  smileSimulation:
    "https://cus-invisalign-starter-use-prd.herokuapp.com/sv/1752134?utm_source=ig&utm_medium=social&utm_content=link_in_bio&utm_id=97760_v0_s00_e0_tv3",
  luminoReviews:
    "https://luminohealth.sunlife.ca/en/health-care-provider-profile/family-dentist/le-32-clinique-dentaire/elizabeth-peeling-560541-617704/",
  googleReviews:
    "https://www.google.com/maps/search/?api=1&query=LE+32+Clinique+Dentaire+Vaudreuil-Dorion",
  healthDoc: "https://www.healthdoc.ca/listing/dr-elizabeth-peeling-09d300",
  aacaProfile: "https://www.aacaligners.com/contributor/elizabeth-peeling",
  le32Team: "https://www.le32.ca/en/team",
  journalDeMontreal:
    "https://www.journaldemontreal.com/2025/10/04/dents-caries-et-botox--le-nouveau-forfait-offert-par-les-dentistes-du-quebec",
  radioCanadaBotox:
    "https://ici.radio-canada.ca/nouvelle/2192715/dentiste-droit-botox-agent-de-comblement",
  instagram: "https://www.instagram.com/dr.elizabeth.peeling/",
  instagramHandle: "@dr.elizabeth.peeling",
  instagramClinic: "https://www.instagram.com/le32cliniquedentaire/",
  facebook: "https://www.facebook.com/le32cliniquedentaire",
  heroPhoto: "/elizabeth-hero.png",
  chatAvatar: "/chat-avatar.png",
  address: {
    street: "22800 Chemin Dumberry, Suite 1C",
    city: "Vaudreuil-Dorion",
    province: "QC",
    postal: "J7V 0M8",
    country: "CA",
  },
} as const;

export const analytics = {
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "",
} as const;
