import { links } from "@/config/links";
import type { Testimonial } from "@/content/types";

/**
 * Verified Google reviews for LE 32 Clinique Dentaire
 * (where Dr. Elizabeth Peeling practices).
 * Sourced from public Google review listings (Birdeye, mappca.com).
 * Only reviews rated 4.5★ or higher are included (4 or 5 stars on Google).
 * Do not add fabricated or unverified testimonials.
 */
export const verifiedGoogleReviews: Testimonial[] = [
  {
    quote:
      "Amazing experience, staff confident and professional, state of the art tools and technology!",
    name: "Amanda Amoroso",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "I had three fillings completed today, and it was one of the easiest appointments I have experienced. The care was gentle, with clear and effective communication throughout. I was in and out in under an hour. While I generally approach dental appointments with reluctance, this visit was comfortable and reassuring. Thank you !",
    name: "A Love",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "Great overall experience! Staff is very friendly, clinic is very clean and equipment appears very modern and efficient. They did a great job with my cleaning and were careful around any sensitive tooth areas.",
    name: "Paul Cebula",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "I'm so glad I found this place. Beautiful office, wonderful staff and best of all, the tooth I have been dreading to fix for a long time was fixed quickly using their laser. I didn't even have to be frozen and it didn't hurt at all! Dr. Seidler is really great at explaining everything and takes a lot of time to make sure you're comfortable. I highly recommend.",
    name: "Google reviewer",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "I never liked going to the dentist before but at 32 dentaire they make it so pain free. I could fall asleep while I get my teeth cleaned.",
    name: "Google reviewer",
    rating: 5,
    source: "Google",
  },
];

/** French translations of verifiedGoogleReviews for the /fr landing page. */
export const verifiedGoogleReviewsFr: Testimonial[] = [
  {
    quote:
      "Expérience formidable, personnel confiant et professionnel, outils et technologies de pointe!",
    name: "Amanda Amoroso",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "J'ai eu trois obturations aujourd'hui, et ce fut l'un des rendez-vous les plus faciles que j'aie vécus. Les soins ont été doux, avec une communication claire et efficace tout au long. Je suis entré et sorti en moins d'une heure. Bien que j'aborde généralement les rendez-vous dentaires avec réticence, cette visite a été confortable et rassurante. Merci!",
    name: "A Love",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "Excellente expérience globale! Le personnel est très accueillant, la clinique est très propre et l'équipement semble très moderne et efficace. Ils ont très bien fait mon nettoyage et ont été attentifs aux zones sensibles.",
    name: "Paul Cebula",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "Je suis tellement content d'avoir trouvé cet endroit. Beau bureau, personnel merveilleux et surtout, la dent que je redoutais de faire réparer depuis longtemps a été réparée rapidement avec leur laser. Je n'ai même pas eu besoin d'anesthésie et ça n'a pas fait mal du tout! La Dre Seidler est vraiment excellente pour tout expliquer et prend beaucoup de temps pour s'assurer que vous êtes à l'aise. Je recommande fortement.",
    name: "Patient Google",
    rating: 5,
    source: "Google",
  },
  {
    quote:
      "Je n'aimais jamais aller chez le dentiste avant, mais chez LE 32 dentaire, c'est tellement indolore. Je pourrais m'endormir pendant le nettoyage de mes dents.",
    name: "Patient Google",
    rating: 5,
    source: "Google",
  },
];

export const googleReviewsUrl = links.googleReviews;
