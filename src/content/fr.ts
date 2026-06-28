import { links } from "@/config/links";
import { verifiedGoogleReviewsFr } from "@/data/verified-reviews";
import type { SiteContent } from "./types";

export const fr: SiteContent = {
  locale: "fr",
  alternateLocale: "en",
  meta: {
    title:
      "Dre Elizabeth Peeling | Invisalign et dentisterie esthétique | Vaudreuil-Dorion",
    description:
      "Prenez rendez-vous pour une consultation Invisalign ou en dentisterie esthétique avec la Dre Elizabeth Peeling, D.M.D., à la clinique LE 32 à Vaudreuil-Dorion. Aligneurs transparents, design du sourire, blanchiment et financement.",
    keywords: [
      "Invisalign Vaudreuil",
      "dentiste esthétique Vaudreuil-Dorion",
      "aligneurs transparents Québec",
      "Elizabeth Peeling dentiste",
      "LE 32 Clinique Dentaire",
    ],
  },
  hero: {
    name: "Dre Elizabeth Peeling",
    credentials: "D.M.D.",
    location: "Vaudreuil-Dorion // West Island, QC",
    tagline: "Invisalign et dentisterie esthétique adaptés à votre sourire",
    bio: "Fournisseure Invisalign préférée et Fellow de l'International Congress of Oral Implantologists (ICOI). La Dre Peeling offre des soins esthétiques doux et fondés sur les données, incluant les aligneurs transparents, le design du sourire, le blanchiment et les consultations esthétiques à la clinique LE 32.",
  },
  ctas: [
    {
      id: "book",
      title: "Nouveaux patients",
      subtitle: "Prenez rendez-vous en ligne ou appelez la clinique",
      href: links.bookingFr,
      external: true,
      primary: true,
      trackEvent: "cta_book_online",
    },
    {
      id: "financing",
      title: "Financement patient",
      subtitle: "Faites une demande avec Beautifi — décision instantanée, sans impact sur votre crédit",
      href: links.financing,
      external: true,
      trackEvent: "cta_financing",
    },
    {
      id: "smile",
      title: "Simulation du sourire",
      subtitle: "Visualisez votre sourire avec Invisalign SmileView",
      href: links.smileSimulation,
      external: true,
      trackEvent: "cta_smile_simulation",
    },
    {
      id: "instagram",
      title: "Suivez sur Instagram",
      subtitle: `De vraies transformations Invisalign ${links.instagramHandle}`,
      href: links.instagram,
      external: true,
      trackEvent: "cta_instagram",
    },
  ],
  trust: [
    "Ordre des dentistes du Québec (ODQ)",
    "Association des chirurgiens dentistes du Québec (ACDQ)",
    "American Academy of Clear Aligners (AACA)",
    "Fellow ICOI",
    "LE 32 Clinique Dentaire",
  ],
  services: {
    heading: "Services esthétiques et Invisalign",
    items: [
      {
        title: "Invisalign",
        description:
          "Traitement orthodontique discret pour adolescents et adultes. Plans personnalisés avec numérisation et suivi continu.",
      },
      {
        title: "Design du sourire et consultations esthétiques",
        description:
          "Évaluations complètes pour harmoniser vos objectifs avec une approche de traitement réfléchie et progressive.",
      },
      {
        title: "Implants",
        description:
          "Solutions durables et naturelles pour remplacer des dents manquantes et restaurer la confiance en votre sourire.",
      },
      {
        title: "Facettes et restaurations esthétiques",
        description:
          "Facettes sur mesure et restaurations esthétiques pour affiner la forme, la teinte et la symétrie du sourire.",
      },
      {
        title: "Botox® thérapeutique et esthétique",
        description:
          "Traitements aux neuromodulateurs offerts conformément à la formation de l'ODQ et aux protocoles de la clinique.",
      },
    ],
  },
  reviews: {
    label: "Témoignages",
    heading: "Ce que disent les patients.",
    pressLink: {
      label: "Lisez l'article sur la Dre Peeling dans Le Journal de Montréal",
      href: links.journalDeMontreal,
    },
    initialCount: 4,
    showMore: "Voir plus d'avis",
    showLess: "Voir moins d'avis",
    viewAllLabel: "Voir tous les avis Google pour LE 32",
    items: verifiedGoogleReviewsFr,
    disclaimer:
      "Les avis affichés sont des avis Google vérifiés pour la clinique LE 32, où exerce la Dre Peeling. Seuls les avis de 4,5 étoiles et plus sont inclus (4 ou 5 étoiles sur Google). Les citations originales en anglais sont traduites en français; certains avis plus anciens n'affichent pas de nom public.",
  },
  faq: {
    heading: "Foire aux questions",
    items: [
      {
        question: "Suis-je candidat à Invisalign?",
        answer:
          "De nombreux problèmes d'alignement peuvent être traités avec des aligneurs transparents, mais l'éligibilité dépend de l'examen clinique. Une consultation inclut une évaluation personnalisée.",
      },
      {
        question: "Combien de temps dure un traitement Invisalign?",
        answer:
          "La durée varie selon la complexité. Les cas légers peuvent prendre quelques mois, tandis que les cas plus complexes peuvent être plus longs.",
      },
      {
        question: "Offrez-vous du financement?",
        answer:
          "Oui. LE 32 offre du financement via Beautifi avec des plans de paiement mensuels flexibles. Vous pouvez faire une demande en ligne en moins de deux minutes et obtenir une décision instantanée sans impact sur votre cote de crédit.",
      },
      {
        question: "Les soins sont-ils offerts en français et en anglais?",
        answer:
          "Oui. La Dre Peeling et l'équipe LE 32 offrent des soins bilingues à Vaudreuil-Dorion et dans la région de Montréal.",
      },
      {
        question: "Où se trouve la clinique?",
        answer:
          "LE 32 Clinique Dentaire est au 22800 chemin Dumberry, bureau 1C, Vaudreuil-Dorion, QC J7V 0M8.",
      },
      {
        question: "À quoi m'attendre lors d'une première consultation esthétique?",
        answer:
          "Votre visite comprend une revue de vos objectifs, une évaluation clinique, l'imagerie au besoin et une discussion des options, délais et coûts.",
      },
    ],
  },
  chat: {
    title: "Posez une question",
    bubblePrompt: "Prêt à commencer votre consultation avec la Dre Peeling?",
    greeting:
      "Bonjour! Je peux vous aider avec la prise de rendez-vous, le financement, la simulation du sourire et les questions courantes sur Invisalign. Je ne peux pas poser de diagnostic médical.",
    placeholder: "Écrivez une question ou choisissez un sujet ci-dessous…",
    privacyNote:
      "Veuillez ne pas partager d'informations médicales personnelles dans ce clavardage. Pour des questions cliniques, prenez rendez-vous.",
    faqs: [
      {
        question: "Comment prendre rendez-vous?",
        answer: "Vous pouvez demander un rendez-vous en ligne ou appeler la clinique.",
        action: {
          label: "Réserver en ligne",
          href: links.bookingFr,
          trackEvent: "chat_book",
        },
      },
      {
        question: "Le financement est-il disponible?",
        answer:
          "Oui — Beautifi offre des plans de paiement mensuels flexibles avec une décision instantanée et sans impact sur votre cote de crédit. Vous pouvez commencer votre demande en ligne.",
        action: {
          label: "Demander un financement",
          href: links.financing,
          trackEvent: "chat_financing",
        },
      },
      {
        question: "Puis-je prévisualiser mon sourire?",
        answer:
          "Essayez l'outil Invisalign SmileView, puis prenez rendez-vous pour une évaluation clinique.",
        action: {
          label: "Ouvrir la simulation",
          href: links.smileSimulation,
          trackEvent: "chat_smile",
        },
      },
      {
        question: "Quels services offre la Dre Peeling?",
        answer:
          "Invisalign, design du sourire, implants, facettes et consultations esthétiques. Le Botox est offert selon la formation de l'ODQ et les protocoles de la clinique.",
      },
      {
        question: "Où est la clinique?",
        answer:
          "22800 chemin Dumberry, bureau 1C, Vaudreuil-Dorion, QC. Stationnement sur place.",
        action: {
          label: "Obtenir l'itinéraire",
          href: links.googleReviews,
          trackEvent: "chat_directions",
        },
      },
    ],
    quickActions: [
      { label: "Réserver", href: links.bookingFr, trackEvent: "chat_quick_book" },
      { label: "Financement", href: links.financing, trackEvent: "chat_quick_financing" },
      { label: "Simulation", href: links.smileSimulation, trackEvent: "chat_quick_smile" },
    ],
  },
  footer: {
    disclaimer:
      "Les informations sur cette page sont à titre informatif seulement et ne remplacent pas un examen clinique. L'éligibilité, les délais et les coûts varient. Financement sous réserve d'approbation de crédit.",
    copyright: `© ${new Date().getFullYear()} Dre Elizabeth Peeling. Tous droits réservés.`,
    clinicNote:
      "Exerce à la clinique LE 32, Vaudreuil-Dorion, Québec.",
  },
  stickyCta: "Prendre rendez-vous",
  langToggle: { label: "EN", switchTo: "English" },
};
