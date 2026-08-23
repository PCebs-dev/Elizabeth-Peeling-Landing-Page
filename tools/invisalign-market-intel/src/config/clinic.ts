/**
 * Clinic constants aligned with the landing page (src/config/links.ts).
 */
export const clinic = {
  doctorName: "Dr. Elizabeth Peeling",
  doctorNameFr: "Dre Elizabeth Peeling",
  practiceName: "LE 32 Clinique Dentaire",
  phoneDisplay: "(450) 424-5332",
  phoneE164: "+14504245332",
  bookingUrl: "https://www.le32.ca/en/contact-us",
  smileViewUrl:
    "https://cus-invisalign-starter-use-prd.herokuapp.com/sv/1752134",
  financingNote: "Beautifi financing available",
  financingNoteFr: "Financement Beautifi disponible",
  instagram: "@dr.elizabeth.peeling",
  address: {
    street: "22800 Chemin Dumberry, Suite 1C",
    city: "Vaudreuil-Dorion",
    province: "QC",
    postal: "J7V 0M8",
    country: "CA",
  },
  /** Approximate clinic coordinates for Places / Meta radius */
  lat: 45.3994,
  lng: -74.0276,
  /** Default Meta / Google radius targeting (km) */
  radiusKm: 35,
} as const;
