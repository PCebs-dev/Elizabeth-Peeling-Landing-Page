import { links } from "@/config/links";
import type { SiteContent } from "./types";

export const en: SiteContent = {
  locale: "en",
  alternateLocale: "fr",
  meta: {
    title: "Dr. Elizabeth Peeling | Invisalign & Cosmetic Dentistry | Vaudreuil-Dorion",
    description:
      "Book an Invisalign or cosmetic dentistry consultation with Dr. Elizabeth Peeling, D.M.D. at LE 32 Clinique Dentaire in Vaudreuil-Dorion, Quebec. Clear aligners, smile design, whitening & financing available.",
    keywords: [
      "Invisalign Vaudreuil",
      "cosmetic dentist Vaudreuil-Dorion",
      "clear aligners Quebec",
      "Elizabeth Peeling dentist",
      "LE 32 Clinique Dentaire",
    ],
  },
  hero: {
    name: "Dr. Elizabeth Peeling",
    credentials: "D.M.D.",
    location: "Vaudreuil-Dorion // West Island, QC",
    tagline: "Invisalign & cosmetic dentistry tailored to your smile",
    bio: "Preferred Invisalign Provider and Fellow of the International Congress of Oral Implantologists (ICOI). Dr. Peeling offers gentle, evidence-based cosmetic care including clear aligners, smile design, whitening, and aesthetic consultations at LE 32 Clinique Dentaire.",
  },
  ctas: [
    {
      id: "book",
      title: "New Patients",
      subtitle: "Schedule your consultation online or call the clinic",
      href: links.booking,
      external: true,
      primary: true,
      trackEvent: "cta_book_online",
    },
    {
      id: "financing",
      title: "Patient Financing",
      subtitle: "Apply with Beautifi — instant decision, no credit score impact",
      href: links.financing,
      external: true,
      trackEvent: "cta_financing",
    },
    {
      id: "smile",
      title: "Smile Simulation",
      subtitle: "Preview your smile with Invisalign SmileView",
      href: links.smileSimulation,
      external: true,
      trackEvent: "cta_smile_simulation",
    },
    {
      id: "instagram",
      title: "Follow on Instagram",
      subtitle: `Real Invisalign & smile transformations ${links.instagramHandle}`,
      href: links.instagram,
      external: true,
      trackEvent: "cta_instagram",
    },
  ],
  trust: [
    "Ordre des dentistes du Québec (ODQ)",
    "Association des chirurgiens dentistes du Québec (ACDQ)",
    "American Academy of Clear Aligners (AACA)",
    "ICOI Fellow",
    "LE 32 Clinique Dentaire",
  ],
  services: {
    heading: "Cosmetic & Invisalign Services",
    items: [
      {
        title: "Invisalign",
        description:
          "Discreet orthodontic treatment for teens and adults. Personalized treatment plans with digital scanning and ongoing monitoring.",
      },
      {
        title: "Smile Design & Cosmetic Consults",
        description:
          "Comprehensive evaluations to align your smile goals with a thoughtful, phased treatment approach.",
      },
      {
        title: "Implants",
        description:
          "Permanent, natural-looking solutions to replace missing teeth and restore confidence in your smile.",
      },
      {
        title: "Veneers & Aesthetic Restorations",
        description:
          "Custom veneers and aesthetic restorations to refine shape, shade, and symmetry for a naturally beautiful smile.",
      },
      {
        title: "Therapeutic & Aesthetic Botox®",
        description:
          "Neuromodulator treatments offered in accordance with ODQ training and clinic protocols.",
      },
    ],
  },
  press: {
    label: "Read Dr. Peeling's feature article in Le Journal de Montréal",
    href: links.journalDeMontreal,
  },
  faq: {
    heading: "Frequently Asked Questions",
    items: [
      {
        question: "Am I a candidate for Invisalign?",
        answer:
          "Many alignment concerns can be addressed with clear aligners, but candidacy depends on your clinical exam. A consultation with Dr. Peeling includes a personalized assessment and treatment options.",
      },
      {
        question: "How long does Invisalign treatment take?",
        answer:
          "Treatment length varies based on complexity. Mild cases may take several months, while more involved cases can take longer. Your timeline is reviewed during your consult.",
      },
      {
        question: "Do you offer financing?",
        answer:
          "Yes. LE 32 offers financing through Beautifi with flexible monthly payment plans. You can apply online in under two minutes and get an instant decision with no impact to your credit score.",
      },
      {
        question: "Is care available in English and French?",
        answer:
          "Yes. Dr. Peeling and the LE 32 team provide bilingual care for patients in Vaudreuil-Dorion and the greater Montreal area.",
      },
      {
        question: "Where is the clinic located?",
        answer:
          "LE 32 Clinique Dentaire is at 22800 Chemin Dumberry, Suite 1C, Vaudreuil-Dorion, QC J7V 0M8.",
      },
      {
        question: "What should I expect at my first cosmetic consult?",
        answer:
          "Your visit includes a review of your goals, a clinical evaluation, imaging as needed, and a discussion of treatment options, timelines, and costs.",
      },
    ],
  },
  chat: {
    title: "Ask a Question",
    bubblePrompt: "Ready to start your consult with Dr. Peeling?",
    greeting:
      "Hi! I can help with booking, financing, smile simulation, and common questions about Invisalign and cosmetic dentistry. I cannot provide medical diagnoses.",
    placeholder: "Type a question or choose a topic below…",
    privacyNote:
      "Please do not share personal health information in this chat. For clinical questions, book a consultation.",
    faqs: [
      {
        question: "How do I book an appointment?",
        answer: "You can request an appointment online or call the clinic directly.",
        action: {
          label: "Book online",
          href: links.booking,
          trackEvent: "chat_book",
        },
      },
      {
        question: "Is financing available?",
        answer:
          "Yes — Beautifi offers flexible monthly payment plans with an instant decision and no credit score impact. You can start your application online.",
        action: {
          label: "Apply for financing",
          href: links.financing,
          trackEvent: "chat_financing",
        },
      },
      {
        question: "Can I preview my smile?",
        answer:
          "Try the Invisalign SmileView tool for a quick simulation, then book a consult for a clinical assessment.",
        action: {
          label: "Open smile simulation",
          href: links.smileSimulation,
          trackEvent: "chat_smile",
        },
      },
      {
        question: "What services does Dr. Peeling offer?",
        answer:
          "Invisalign, smile design, implants, veneers, and aesthetic consultations. Botox is offered per ODQ training and clinic protocols.",
      },
      {
        question: "Where is the clinic?",
        answer:
          "22800 Chemin Dumberry, Suite 1C, Vaudreuil-Dorion, QC. Parking is available on site.",
        action: {
          label: "Get directions",
          href: links.googleReviews,
          trackEvent: "chat_directions",
        },
      },
    ],
    quickActions: [
      { label: "Book consult", href: links.booking, trackEvent: "chat_quick_book" },
      { label: "Financing", href: links.financing, trackEvent: "chat_quick_financing" },
      { label: "Smile sim", href: links.smileSimulation, trackEvent: "chat_quick_smile" },
    ],
  },
  footer: {
    disclaimer:
      "Information on this page is for general purposes only and does not replace a clinical examination. Treatment suitability, timelines, and costs vary. Financing subject to credit approval.",
    copyright: `© ${new Date().getFullYear()} Dr. Elizabeth Peeling. All rights reserved.`,
    clinicNote: "Practicing at LE 32 Clinique Dentaire, Vaudreuil-Dorion, Quebec.",
  },
  stickyCta: "Book Consultation",
  langToggle: { label: "FR", switchTo: "Français" },
};
