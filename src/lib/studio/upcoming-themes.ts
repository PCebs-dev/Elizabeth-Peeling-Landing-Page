import type {
  CalendarFormat,
  CalendarPost,
} from "./saved-types";
import type { StudioCategoryId, SubjectMode } from "./types";

export type ThemeAngle =
  | "myth-bust"
  | "question-hook"
  | "social-proof"
  | "local-trust"
  | "seasonal"
  | "confidence"
  | "soft-cta"
  | "behind-the-scenes"
  | "financing-friendly"
  | "transformation"
  | "education";

export interface ThemeTemplate {
  id: string;
  categoryId: StudioCategoryId;
  pillar: string;
  funnel: "tof" | "mof" | "bof";
  angle: ThemeAngle;
  format: CalendarFormat;
  hook: string;
  /** Why this theme drives saves, comments, DMs, or consults */
  engagementWhy: string;
  notes: string;
  cta: string;
  imageHints: string[];
  subjectMode: SubjectMode;
  compliance: string[];
}

export interface UpcomingThemeRow extends ThemeTemplate {
  date: string;
  day: string;
  weekBucket: number;
  platforms: string[];
  language: "both";
  channel: "organic";
  production: "ai-image";
}

export interface UpcomingThemesFile {
  meta: {
    practice: string;
    dentist: string;
    geo: string;
    minDaysAhead: number;
    generatedAt: string;
    horizonStart: string;
    horizonEnd: string;
    note: string;
  };
  themes: UpcomingThemeRow[];
}

/** Prefer high-intent cosmetic categories that typically book consults. */
const CATEGORY_WEIGHTS: { id: StudioCategoryId; weight: number }[] = [
  { id: "invisalign", weight: 22 },
  { id: "smile-makeover", weight: 16 },
  { id: "veneers", weight: 14 },
  { id: "whitening", weight: 12 },
  { id: "implants", weight: 12 },
  { id: "botox", weight: 14 },
  { id: "crowns", weight: 10 },
];

/**
 * Curated engagement-first theme bank for LE 32 / Dr. Elizabeth Peeling.
 * Local Vaudreuil–West Island focus, bilingual-ready, no outcome guarantees.
 */
export const THEME_BANK: ThemeTemplate[] = [
  // —— Invisalign ——
  {
    id: "inv-myth-teens-only",
    categoryId: "invisalign",
    pillar: "education",
    funnel: "tof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: Invisalign is only for teens.",
    engagementWhy:
      "Myth-bust posts stop scrolls and invite adult professionals who assumed braces were their only option.",
    notes:
      "Bust the teen-only myth gently. Focus on discreet trays for work meetings and photos. Invite SmileView or a consult — no timelines or guaranteed straight teeth.",
    cta: "Try SmileView or book an Invisalign consult at LE 32",
    imageHints: [
      "adult hand holding clear aligners, soft clinic light, no identifiable face",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises", "no-guaranteed-results"],
  },
  {
    id: "inv-zoom-camera-hide",
    categoryId: "invisalign",
    pillar: "transformations",
    funnel: "tof",
    angle: "confidence",
    format: "static",
    hook: "Still angling the laptop camera so your smile stays out of frame?",
    engagementWhy:
      "Relatable Zoom anxiety drives comments and shares among remote workers 30–50.",
    notes:
      "Empathy first, then soft education on clear aligners for mild crowding. Local LE 32 Vaudreuil-Dorion. No before/after claims.",
    cta: "Book a discreet smile consult",
    imageHints: [
      "professional at home desk soft window light, candid approachable expression, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results", "disclaimer-results-vary"],
  },
  {
    id: "inv-parent-teen-poll",
    categoryId: "invisalign",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Teen asking about braces this year? Clear aligners, metal, or not sure yet?",
    engagementWhy:
      "Parent-targeted poll stickers boost Story replies and DM consults.",
    notes:
      "Supportive tone for parents. Only a consult determines fit. Bilingual sticker text when possible.",
    cta: "Book a family-friendly Invisalign consult",
    imageHints: [
      "clear aligners flat-lay, youthful but not childish props, soft daylight",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises", "no-guaranteed-results"],
  },
  {
    id: "inv-work-week-discreet",
    categoryId: "invisalign",
    pillar: "social-proof",
    funnel: "mof",
    angle: "social-proof",
    format: "static",
    hook: "Clear aligners that fit a full work week — not a lifestyle pause.",
    engagementWhy:
      "Lifestyle benefit framing converts busy professionals without medical hard-sell.",
    notes:
      "Composite of themes patients share — do not invent named reviews or star counts. End with Dr. Peeling / LE 32.",
    cta: "Book a consult or try SmileView",
    imageHints: [
      "clear aligner case beside laptop and coffee, modern desk, warm daylight",
    ],
    subjectMode: "service",
    compliance: ["no-invented-reviews", "no-guaranteed-results"],
  },
  {
    id: "inv-first-visit-bts",
    categoryId: "invisalign",
    pillar: "bts",
    funnel: "tof",
    angle: "behind-the-scenes",
    format: "static",
    hook: "What actually happens at a first Invisalign visit.",
    engagementWhy:
      "Process transparency reduces booking anxiety and increases saves.",
    notes:
      "Welcome → photos/scan vibe → options talk, no pressure. Empty chair / staff hands / tablet — no distressed patients.",
    cta: "Book a first visit or try SmileView",
    imageHints: [
      "modern operatory, scanner or tablet in hand, calm lighting, no distressed patient",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises", "no-guaranteed-results"],
  },
  {
    id: "inv-mild-crowding-q",
    categoryId: "invisalign",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "static",
    hook: "Mild crowding bothering you in photos — but not enough for 'braces drama'?",
    engagementWhy:
      "Names a common hesitation; drives saves from people who feel 'not crooked enough.'",
    notes:
      "Validate the middle ground. Consult explores options. No guarantees.",
    cta: "Ask your questions in a consult at LE 32",
    imageHints: [
      "natural smile close crop, soft outdoor light, non-identifiable adult",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "inv-west-island-local",
    categoryId: "invisalign",
    pillar: "local",
    funnel: "tof",
    angle: "local-trust",
    format: "static",
    hook: "Clear aligner care without the downtown trek — Vaudreuil-Dorion & West Island.",
    engagementWhy:
      "Geo pride + convenience outperforms generic Invisalign ads locally.",
    notes:
      "Neighbourly voice. Geotag LE 32. No invented awards.",
    cta: "Save this post or book when you're ready",
    imageHints: [
      "Vaudreuil-Dorion streetscape or clinic-area atmosphere in warm daylight",
    ],
    subjectMode: "service",
    compliance: ["no-invented-reviews"],
  },
  {
    id: "inv-removable-dining",
    categoryId: "invisalign",
    pillar: "education",
    funnel: "mof",
    angle: "education",
    format: "static",
    hook: "Lunch meetings, coffee dates, family dinners — trays out, life continues.",
    engagementWhy:
      "Practical benefit content earns shares from foodies and busy parents.",
    notes:
      "Emphasize removability for meals; wear-time education without scare tactics. Compliance: no timeline promises.",
    cta: "See if clear aligners fit your routine",
    imageHints: [
      "cafe table lifestyle still with aligner case subtly in frame, warm window light",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises"],
  },

  // —— Smile makeover ——
  {
    id: "sm-screenshot-folder",
    categoryId: "smile-makeover",
    pillar: "conversion",
    funnel: "bof",
    angle: "soft-cta",
    format: "static",
    hook: "If you've been screenshotting smile ideas for months — this is your sign to ask real questions.",
    engagementWhy:
      "Calls out saved-folder behaviour; high intent soft conversion without fake urgency.",
    notes:
      "Invite a comprehensive consult (aligners, veneers/whitening, implants as relevant). No limited-spots pressure.",
    cta: "Book online or call LE 32",
    imageHints: [
      "phone mood-board aesthetic with soft clinic neutrals, no celebrity faces",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results", "no-fake-urgency"],
  },
  {
    id: "sm-camera-ready-event",
    categoryId: "smile-makeover",
    pillar: "transformations",
    funnel: "tof",
    angle: "seasonal",
    format: "static",
    hook: "Wedding season, reunions, headshots — planning a smile refresh before the big photos?",
    engagementWhy:
      "Seasonal planning hooks convert event-driven searches into consults.",
    notes:
      "Keep paths open (whitening, aligners, veneers). Results vary. Local LE 32.",
    cta: "Book a smile assessment",
    imageHints: [
      "elegant lifestyle portrait energy, soft golden light, non-identifiable adult",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary", "no-guaranteed-results"],
  },
  {
    id: "sm-options-map",
    categoryId: "smile-makeover",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "carousel",
    hook: "Colour, chips, crowding, or gaps — which bothers you most in photos?",
    engagementWhy:
      "Interactive self-ID questions boost saves and carousel completion.",
    notes:
      "Educational consult-prep. Not a prescription. Soft CTA to LE 32.",
    cta: "Book a cosmetic consult with Dr. Peeling",
    imageHints: [
      "clean typography-friendly cover, soft greige clinic tones, subtle smile detail",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "sm-local-no-bridge",
    categoryId: "smile-makeover",
    pillar: "local",
    funnel: "tof",
    angle: "local-trust",
    format: "static",
    hook: "You shouldn't need to cross the bridge for thoughtful cosmetic care.",
    engagementWhy:
      "Local identity line performs strongly for West Island / Vaudreuil audiences.",
    notes:
      "Warm neighbourly voice. List services lightly. No invented reviews.",
    cta: "Save this post or book when ready",
    imageHints: [
      "clinic exterior or inviting reception, Vaudreuil daylight",
    ],
    subjectMode: "service",
    compliance: ["no-invented-reviews"],
  },
  {
    id: "sm-confidence-laugh",
    categoryId: "smile-makeover",
    pillar: "transformations",
    funnel: "mof",
    angle: "confidence",
    format: "static",
    hook: "The goal isn't a different face — it's laughing without covering your mouth.",
    engagementWhy:
      "Emotional benefit framing drives saves and DMs more than clinical jargon.",
    notes:
      "Tasteful, authentic. No Hollywood guarantees. Disclose AI imagery if used.",
    cta: "Start with a smile consult at LE 32",
    imageHints: [
      "candid natural laugh outdoors, warm light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results", "disclaimer-results-vary"],
  },

  // —— Veneers ——
  {
    id: "ven-4-questions",
    categoryId: "veneers",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "carousel",
    hook: "Thinking about veneers? Start with these 4 consult questions.",
    engagementWhy:
      "Prep lists get bookmarked; positions Dr. Peeling as the thoughtful guide.",
    notes:
      "Cover colour/chips/gaps/shape, enamel prep openness, natural-looking definition, soft CTA. No Hollywood smile guaranteed.",
    cta: "Book a cosmetic consult at LE 32",
    imageHints: [
      "clean carousel cover, soft clinic tones, subtle smile detail",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "ven-natural-not-fake",
    categoryId: "veneers",
    pillar: "education",
    funnel: "mof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: veneers always look fake.",
    engagementWhy:
      "Addresses the #1 aesthetic objection; high comment potential.",
    notes:
      "Discuss natural harmony and personalised design at consult. No outcome promises.",
    cta: "Ask about natural-looking options at LE 32",
    imageHints: [
      "soft portrait crop focusing on a natural smile, warm indoor light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "ven-chip-repair-story",
    categoryId: "veneers",
    pillar: "transformations",
    funnel: "tof",
    angle: "confidence",
    format: "static",
    hook: "One chipped front tooth can steal the whole smile in photos.",
    engagementWhy:
      "Specific problem → high relevance for people searching chip/repair aesthetics.",
    notes:
      "Empathy + consult invite. Options may include veneers or other restorative paths — don't prescribe on social.",
    cta: "Book a smile aesthetics consult",
    imageHints: [
      "lifestyle photo moment, soft focus smile, non-identifiable adult",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "ven-meeting-ready",
    categoryId: "veneers",
    pillar: "transformations",
    funnel: "mof",
    angle: "confidence",
    format: "static",
    hook: "Camera-ready for client meetings — without looking overdone.",
    engagementWhy:
      "Professional audience match for LE 32's 30–55 demographic.",
    notes:
      "Tasteful cosmetic dentistry tone. Results vary.",
    cta: "Explore veneer consult options at LE 32",
    imageHints: [
      "polished professional portrait energy, soft office window light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary"],
  },

  // —— Whitening ——
  {
    id: "wht-coffee-stain-q",
    categoryId: "whitening",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Coffee, tea, red wine — noticing stains more in selfies?",
    engagementWhy:
      "Habit-based hooks are highly shareable and poll-friendly in Stories.",
    notes:
      "Invite professional whitening consult. No 'whiter in 1 hour' claims.",
    cta: "Book a whitening consult at LE 32",
    imageHints: [
      "coffee cup and bright smile lifestyle still, morning light, non-graphic",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises", "no-guaranteed-results"],
  },
  {
    id: "wht-wedding-season",
    categoryId: "whitening",
    pillar: "transformations",
    funnel: "tof",
    angle: "seasonal",
    format: "static",
    hook: "Planning photos this season? A brighter smile starts with a real consult — not a strip kit guess.",
    engagementWhy:
      "Event timing + pro-vs-DIY contrast drives bookings.",
    notes:
      "Results vary; keep natural-looking messaging.",
    cta: "Book a whitening consult or smile assessment",
    imageHints: [
      "late-summer outdoor lifestyle, natural laugh, West Island light energy",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary", "no-guaranteed-results"],
  },
  {
    id: "wht-natural-bright",
    categoryId: "whitening",
    pillar: "education",
    funnel: "mof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: professional whitening always looks chalky.",
    engagementWhy:
      "Counters fear of unnatural results; builds trust for clinic whitening.",
    notes:
      "Emphasise tailored shade discussion at LE 32. No guaranteed shade numbers.",
    cta: "Talk shade goals in a whitening consult",
    imageHints: [
      "fresh natural smile, soft bathroom vanity light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "wht-interview-confidence",
    categoryId: "whitening",
    pillar: "transformations",
    funnel: "tof",
    angle: "confidence",
    format: "static",
    hook: "Job interviews, first dates, family photos — small brightness can feel like a big confidence shift.",
    engagementWhy:
      "Life-moment framing increases saves among career-focused adults.",
    notes:
      "Soft aspirational tone. Results vary.",
    cta: "Book a whitening consult at LE 32",
    imageHints: [
      "approachable professional headshot energy, warm lighting, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary"],
  },

  // —— Implants ——
  {
    id: "imp-vs-bridge-q",
    categoryId: "implants",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Missing a tooth? Implant vs bridge — which questions should you ask first?",
    engagementWhy:
      "Decision-stage education captures high-intent Story replies.",
    notes:
      "Fair questions (longevity, neighbouring teeth). Do not crown one option as always better. Invite consult.",
    cta: "DM IMPLANT or book a consult",
    imageHints: [
      "simple diagram-style still of implant concept, clean clinical aesthetic, no graphic surgery",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results", "no-timeline-promises"],
  },
  {
    id: "imp-chew-confidence",
    categoryId: "implants",
    pillar: "transformations",
    funnel: "mof",
    angle: "confidence",
    format: "static",
    hook: "Missing a tooth changes how you chew, speak, and smile in photos — quietly.",
    engagementWhy:
      "Names unspoken daily friction; strong DM driver for implant seekers.",
    notes:
      "Empathetic. Personalised assessment only. No surgery gore.",
    cta: "Book an implant consult at LE 32",
    imageHints: [
      "warm lifestyle dining moment, soft focus, non-identifiable adult",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "imp-adult-35-55",
    categoryId: "implants",
    pillar: "education",
    funnel: "tof",
    angle: "education",
    format: "static",
    hook: "Dental implants aren't only for 'later in life' — many adults 35–55 explore them after an unexpected loss.",
    engagementWhy:
      "Expands perceived eligibility; reduces stigma for younger implant patients.",
    notes:
      "Educational. Suitability only after exam. Local LE 32.",
    cta: "Start with an implant consult",
    imageHints: [
      "confident mid-adult lifestyle portrait, natural smile, soft daylight",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results", "no-timeline-promises"],
  },
  {
    id: "imp-local-consult",
    categoryId: "implants",
    pillar: "local",
    funnel: "bof",
    angle: "soft-cta",
    format: "static",
    hook: "Curious about implants? Start with clear answers in Vaudreuil-Dorion — not a sales pitch.",
    engagementWhy:
      "Trust + locality soft CTA converts searchers already considering implants.",
    notes:
      "Short GBP/Meta friendly. No financing rates unless approved separately.",
    cta: "Call or book a consult online",
    imageHints: [
      "warm clinic reception or exterior, inviting daylight",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },

  // —— Botox (dental aesthetics) ——
  {
    id: "btx-rested-not-frozen",
    categoryId: "botox",
    pillar: "education",
    funnel: "tof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: dental Botox always looks frozen.",
    engagementWhy:
      "Addresses the top aesthetic fear; positions LE 32 as natural-results focused.",
    notes:
      "Subtle, rested look messaging. Therapeutic + aesthetic context in dental practice. No overdone promises.",
    cta: "Ask about a natural refresh consult at LE 32",
    imageHints: [
      "calm rested expression portrait, soft focus, non-identifiable adult",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "btx-tmj-curiosity",
    categoryId: "botox",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Jaw tension, headache patterns, or clenching — ever wondered what a dental visit can explore?",
    engagementWhy:
      "Therapeutic angle differentiates from spa Botox and attracts dental-intent patients.",
    notes:
      "Educational curiosity only — not a diagnosis. Invite assessment with Dr. Peeling.",
    cta: "Book a consult to discuss options",
    imageHints: [
      "calm clinical consult vibe, soft neutrals, no needles in focus",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results", "no-diagnosis-claims"],
  },
  {
    id: "btx-self-care-reset",
    categoryId: "botox",
    pillar: "social-proof",
    funnel: "mof",
    angle: "confidence",
    format: "static",
    hook: "A subtle refresh that still looks like you on Monday morning.",
    engagementWhy:
      "Self-care framing performs well with professional women 35–55.",
    notes:
      "Natural aesthetics. Not overdone. Results vary.",
    cta: "Book a facial aesthetics consult at LE 32",
    imageHints: [
      "soft morning light vanity moment, approachable, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary"],
  },
  {
    id: "btx-gummy-smile-q",
    categoryId: "botox",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "static",
    hook: "Noticing more gum than you'd like when you smile wide in photos?",
    engagementWhy:
      "Specific aesthetic concern drives high-relevance engagement.",
    notes:
      "Mention that options can be discussed in consult — don't claim Botox is always the answer.",
    cta: "Ask about smile aesthetics options at LE 32",
    imageHints: [
      "natural wide smile lifestyle crop, soft outdoor light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results", "no-diagnosis-claims"],
  },

  // —— Crowns ——
  {
    id: "crn-chip-strength",
    categoryId: "crowns",
    pillar: "education",
    funnel: "tof",
    angle: "education",
    format: "static",
    hook: "A cracked or heavily filled tooth doesn't have to look 'patched' forever.",
    engagementWhy:
      "Restorative aesthetics content captures patients delaying treatment.",
    notes:
      "Natural-looking crown messaging. Personalised plan only after exam.",
    cta: "Book a restorative consult at LE 32",
    imageHints: [
      "clean restorative dentistry still, soft clinic light, no gore",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "crn-front-tooth-confidence",
    categoryId: "crowns",
    pillar: "transformations",
    funnel: "mof",
    angle: "confidence",
    format: "static",
    hook: "Front-tooth repairs that blend in — so you're not thinking about it in every photo.",
    engagementWhy:
      "Photo-anxiety angle converts aesthetic restorative seekers.",
    notes:
      "Tasteful. No before/after splits. Results vary.",
    cta: "Ask about natural-looking crowns at LE 32",
    imageHints: [
      "confident natural smile portrait, warm light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["disclaimer-results-vary"],
  },
  {
    id: "crn-myth-metal",
    categoryId: "crowns",
    pillar: "education",
    funnel: "tof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: crowns always look like obvious 'caps.'",
    engagementWhy:
      "Updates outdated beliefs; opens door for cosmetic restorative consults.",
    notes:
      "Modern materials / natural blend discussion at consult. No brand hype guarantees.",
    cta: "Book a consult to discuss your options",
    imageHints: [
      "soft smile detail, natural teeth appearance, clinic-adjacent lighting",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },

  // —— Financing / conversion across categories ——
  {
    id: "fin-beautifi-soft",
    categoryId: "smile-makeover",
    pillar: "conversion",
    funnel: "bof",
    angle: "financing-friendly",
    format: "static",
    hook: "Curious about cosmetic care but waiting on timing? Ask us what financing options may be available.",
    engagementWhy:
      "Removes money-friction objection without quoting rates in-feed.",
    notes:
      "Mention Beautifi may be available — no rates in the ad. Soft CTA. ODQ-aware tone.",
    cta: "Book a consult — we'll walk through options",
    imageHints: [
      "welcoming consult desk moment, warm clinic interior, no patients identifiable",
    ],
    subjectMode: "service",
    compliance: ["no-financing-rates", "no-guaranteed-results"],
  },
  {
    id: "inv-financing-soft",
    categoryId: "invisalign",
    pillar: "conversion",
    funnel: "bof",
    angle: "financing-friendly",
    format: "story",
    hook: "Want clear aligners but need a plan that fits your budget timeline?",
    engagementWhy:
      "Story CTA captures warm leads who stalled on price.",
    notes:
      "No rates. Invite consult conversation at LE 32.",
    cta: "DM PLAN or book a consult",
    imageHints: [
      "clear aligners and soft lifestyle desk scene, calm neutrals",
    ],
    subjectMode: "service",
    compliance: ["no-financing-rates", "no-timeline-promises"],
  },
  {
    id: "imp-replace-quietly",
    categoryId: "implants",
    pillar: "social-proof",
    funnel: "mof",
    angle: "social-proof",
    format: "static",
    hook: "Many adults replace a missing tooth quietly — then wonder why they waited to ask questions.",
    engagementWhy:
      "Normalises implant journeys; reduces shame barrier.",
    notes:
      "No invented testimonials. Soft local CTA.",
    cta: "Book an implant consult in Vaudreuil-Dorion",
    imageHints: [
      "confident social smile lifestyle, patio light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-invented-reviews", "no-guaranteed-results"],
  },
  {
    id: "ven-gap-close-q",
    categoryId: "veneers",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Small gap, worn edges, or uneven shape — which do you notice first in the mirror?",
    engagementWhy:
      "Micro-poll engagement → DMs from aesthetics-curious patients.",
    notes:
      "Not prescribing veneers as only path. Consult explores options.",
    cta: "Book a cosmetic consult",
    imageHints: [
      "soft mirror vanity aesthetic, bright clean light, no graphic dentistry",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "wht-maintenance-q",
    categoryId: "whitening",
    pillar: "education",
    funnel: "mof",
    angle: "education",
    format: "static",
    hook: "After whitening, what actually helps the brightness last longer?",
    engagementWhy:
      "Practical tips earn saves; positions clinic as the expert follow-through.",
    notes:
      "General education — habits vary. Invite professional guidance at LE 32.",
    cta: "Ask us in a whitening consult",
    imageHints: [
      "bright bathroom routine still, toothbrush and soft daylight, clean aesthetic",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "sm-new-patient-welcome",
    categoryId: "smile-makeover",
    pillar: "local",
    funnel: "tof",
    angle: "local-trust",
    format: "static",
    hook: "New to Vaudreuil or the West Island? Meet cosmetic care that feels personal — Dr. Elizabeth Peeling at LE 32.",
    engagementWhy:
      "New-mover / local discovery content builds top-of-funnel awareness.",
    notes:
      "Warm welcome. Soft list of services. No invented awards.",
    cta: "Book a get-to-know-you consult",
    imageHints: [
      "inviting clinic exterior or reception, community feel, daylight",
    ],
    subjectMode: "service",
    compliance: ["no-invented-reviews"],
  },
  {
    id: "btx-monday-reset",
    categoryId: "botox",
    pillar: "conversion",
    funnel: "bof",
    angle: "soft-cta",
    format: "static",
    hook: "If 'I look tired' keeps showing up in meeting feedback — a subtle consult might be worth a conversation.",
    engagementWhy:
      "Workplace-confidence soft CTA converts hesitant aesthetic patients.",
    notes:
      "Gentle. Natural look. No frozen-face promises.",
    cta: "Book a facial aesthetics consult at LE 32",
    imageHints: [
      "professional woman/man soft portrait, rested expression, office-adjacent light",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "inv-aligner-care-tips",
    categoryId: "invisalign",
    pillar: "education",
    funnel: "mof",
    angle: "education",
    format: "carousel",
    hook: "Clear aligner care basics patients wish they knew in week one.",
    engagementWhy:
      "Tips carousels get shared in local parent/professional groups.",
    notes:
      "General education only; individual plans differ. Soft CTA for new consults.",
    cta: "Starting aligners? Book with LE 32",
    imageHints: [
      "aligner case, soft cloth, clean flat-lay on neutral surface",
    ],
    subjectMode: "service",
    compliance: ["no-timeline-promises"],
  },
  {
    id: "crn-sensitivity-q",
    categoryId: "crowns",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "story",
    hook: "Sensitivity on a heavily filled tooth — curiosity or consult-soon?",
    engagementWhy:
      "Binary Story choice captures warm restorative leads.",
    notes:
      "Not a diagnosis. Encourage professional assessment.",
    cta: "Book a restorative check at LE 32",
    imageHints: [
      "calm clinical still, soft neutrals, no graphic tooth decay imagery",
    ],
    subjectMode: "service",
    compliance: ["no-diagnosis-claims"],
  },
  {
    id: "sm-holistic-paths",
    categoryId: "smile-makeover",
    pillar: "education",
    funnel: "tof",
    angle: "education",
    format: "static",
    hook: "Whitening alone vs aligners vs veneers — how we help you choose the lighter lift first.",
    engagementWhy:
      "Comparison education builds authority and longer dwell time.",
    notes:
      "Framework for consult thinking — not a menu of promises.",
    cta: "Map your options in a smile consult",
    imageHints: [
      "clean educational graphic-friendly still with soft clinic palette",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "imp-single-tooth",
    categoryId: "implants",
    pillar: "education",
    funnel: "tof",
    angle: "myth-bust",
    format: "static",
    hook: "Myth: implants are only for replacing a full arch.",
    engagementWhy:
      "Opens single-tooth implant awareness; expands lead pool.",
    notes:
      "Educational. Suitability after exam only.",
    cta: "Ask about single-tooth options at LE 32",
    imageHints: [
      "tasteful implant education still, clean clinical aesthetic, no surgery gore",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results", "no-timeline-promises"],
  },
  {
    id: "wht-before-aligners",
    categoryId: "whitening",
    pillar: "education",
    funnel: "mof",
    angle: "education",
    format: "static",
    hook: "Thinking aligners later? Why shade goals sometimes come up early in the conversation.",
    engagementWhy:
      "Cross-sell education between whitening and Invisalign journeys.",
    notes:
      "General sequencing chat — personalised at consult. No package hard-sell.",
    cta: "Plan your smile path at LE 32",
    imageHints: [
      "smile detail with soft aligner hint in background, bright clean light",
    ],
    subjectMode: "service",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "ven-photo-filter-fatigue",
    categoryId: "veneers",
    pillar: "transformations",
    funnel: "tof",
    angle: "confidence",
    format: "static",
    hook: "Tired of editing your smile in every group photo?",
    engagementWhy:
      "Social-media-native pain point; high share potential.",
    notes:
      "Empathy + consult. No guaranteed Hollywood outcome.",
    cta: "Book a cosmetic smile consult",
    imageHints: [
      "friends lifestyle gathering soft focus, natural smiles, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
  {
    id: "btx-preventive-curious",
    categoryId: "botox",
    pillar: "education",
    funnel: "tof",
    angle: "question-hook",
    format: "static",
    hook: "Curious about 'preventive' facial refresh — or only fixing what's already bothering you?",
    engagementWhy:
      "Two-path question increases comments and clarifies intent.",
    notes:
      "Educational framing only. Individual plans at consult.",
    cta: "Talk it through at LE 32",
    imageHints: [
      "soft skincare-adjacent portrait, natural light, non-identifiable",
    ],
    subjectMode: "people",
    compliance: ["no-guaranteed-results"],
  },
];

const MIN_DAYS_AHEAD = 35;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function torontoParts(date: Date): { iso: string; day: string } {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
  }).format(date);
  return { iso, day };
}

function addTorontoDays(fromIso: string, days: number): string {
  const [y, m, d] = fromIso.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d! + days, 12);
  return torontoParts(new Date(utc)).iso;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeightedCategory(
  rand: () => number,
  recent: StudioCategoryId[]
): StudioCategoryId {
  const banned = new Set(recent.slice(-2));
  const pool = CATEGORY_WEIGHTS.filter((c) => !banned.has(c.id));
  const use = pool.length ? pool : CATEGORY_WEIGHTS;
  const total = use.reduce((n, c) => n + c.weight, 0);
  let r = rand() * total;
  for (const c of use) {
    r -= c.weight;
    if (r <= 0) return c.id;
  }
  return use[use.length - 1]!.id;
}

function pickTemplate(
  rand: () => number,
  categoryId: StudioCategoryId,
  usedIds: Set<string>
): ThemeTemplate {
  const pool = THEME_BANK.filter(
    (t) => t.categoryId === categoryId && !usedIds.has(t.id)
  );
  const fallback = THEME_BANK.filter((t) => t.categoryId === categoryId);
  const list = pool.length ? pool : fallback;
  return list[Math.floor(rand() * list.length)]!;
}

function formatsForDay(day: string, rand: () => number): CalendarFormat[] {
  // Tue/Thu: Stories (+ often a feed static)
  if (day === "Tue" || day === "Thu") {
    return rand() < 0.55 ? ["static", "story"] : ["story"];
  }
  // Weekends: one lighter local/lifestyle static so the 30-day sheet stays full
  if (day === "Sat" || day === "Sun") {
    return ["static"];
  }
  // Mon/Wed/Fri — core feed days; occasional carousel
  if (day === "Wed" && rand() < 0.35) return ["carousel"];
  return ["static"];
}

function platformsFor(format: CalendarFormat): string[] {
  if (format === "story") return ["instagram"];
  return ["instagram", "facebook"];
}

function toUpcomingRow(
  date: string,
  day: string,
  weekBucket: number,
  template: ThemeTemplate,
  format: CalendarFormat
): UpcomingThemeRow {
  return {
    ...template,
    id: `${date}-${template.id}-${format}`,
    date,
    day,
    weekBucket,
    format,
    platforms: platformsFor(format),
    language: "both",
    channel: "organic",
    production: "ai-image",
  };
}

/** Recover a theme template from a dated upcoming-theme id or a bank id. */
export function findThemeTemplateByCalendarId(
  calendarPostId: string
): ThemeTemplate | undefined {
  const raw = calendarPostId.trim();
  if (!raw) return undefined;
  const baseId = raw
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/-(static|story|carousel)$/, "");
  return (
    THEME_BANK.find((t) => t.id === raw) ||
    THEME_BANK.find((t) => t.id === baseId)
  );
}

function formatFromCalendarId(calendarPostId: string): CalendarFormat | undefined {
  if (calendarPostId.endsWith("-story")) return "story";
  if (calendarPostId.endsWith("-carousel")) return "carousel";
  if (calendarPostId.endsWith("-static")) return "static";
  return undefined;
}

/** Rebuild the calendar brief for a past/future date from the theme bank. */
export function calendarPostFromThemeRef(
  date: string,
  calendarPostId: string,
  hook?: string
): CalendarPost | null {
  const template =
    findThemeTemplateByCalendarId(calendarPostId) ||
    (hook
      ? THEME_BANK.find(
          (t) => t.hook.trim().toLowerCase() === hook.trim().toLowerCase()
        )
      : undefined);
  if (!template) return null;
  const day = torontoParts(new Date(`${date}T12:00:00.000Z`)).day;
  const format = formatFromCalendarId(calendarPostId) || template.format;
  return upcomingThemeToCalendarPost(
    toUpcomingRow(date, day, 1, template, format)
  );
}
export function buildRollingUpcomingThemes(options?: {
  fromDate?: Date;
  minDaysAhead?: number;
  existing?: UpcomingThemeRow[];
}): UpcomingThemesFile {
  const minDays = options?.minDaysAhead ?? MIN_DAYS_AHEAD;
  const { iso: today } = torontoParts(new Date());
  const requested = options?.fromDate
    ? torontoParts(options.fromDate).iso
    : today;
  const extraDays =
    requested > today
      ? Math.max(
          0,
          Math.round(
            (Date.parse(`${requested}T12:00:00.000Z`) -
              Date.parse(`${today}T12:00:00.000Z`)) /
              86_400_000
          ) +
            1 -
            minDays
        )
      : 0;
  const fillDays = minDays + extraDays;

  const existing = options?.existing || [];
  const byDate = new Map<string, UpcomingThemeRow[]>();
  for (const t of existing) {
    const list = byDate.get(t.date) || [];
    list.push(t);
    byDate.set(t.date, list);
  }

  const recentCategories: StudioCategoryId[] = [];
  const usedTemplateIds = new Set<string>();
  for (const t of existing) {
    recentCategories.push(t.categoryId);
    const baseId = t.id.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-(static|story|carousel)$/, "");
    usedTemplateIds.add(baseId);
  }

  for (let offset = 0; offset < fillDays; offset++) {
    const date = addTorontoDays(today, offset);
    if (byDate.has(date) && (byDate.get(date)?.length || 0) > 0) {
      for (const t of byDate.get(date)!) {
        recentCategories.push(t.categoryId);
      }
      continue;
    }

    const day = torontoParts(new Date(`${date}T12:00:00.000Z`)).day;
    const weekBucket = (offset % 4) + 1;
    const rand = mulberry32(hashSeed(`le32-themes-${date}`));
    const formats = formatsForDay(day, rand);
    const dayThemes: UpcomingThemeRow[] = [];
    for (const format of formats) {
      const categoryId = pickWeightedCategory(rand, recentCategories);
      const template = pickTemplate(rand, categoryId, usedTemplateIds);
      usedTemplateIds.add(template.id);
      recentCategories.push(categoryId);
      dayThemes.push(
        toUpcomingRow(date, day, weekBucket, template, format)
      );
    }
    byDate.set(date, dayThemes);
  }

  // Guarantee every horizon day has ≥1 theme
  for (let offset = 0; offset < fillDays; offset++) {
    const date = addTorontoDays(today, offset);
    const day = torontoParts(new Date(`${date}T12:00:00.000Z`)).day;
    const list = byDate.get(date) || [];
    if (list.length === 0) {
      const rand = mulberry32(hashSeed(`le32-themes-fill-${date}`));
      const categoryId = pickWeightedCategory(rand, recentCategories);
      const template = pickTemplate(rand, categoryId, usedTemplateIds);
      usedTemplateIds.add(template.id);
      recentCategories.push(categoryId);
      byDate.set(date, [
        toUpcomingRow(date, day, (offset % 4) + 1, template, "static"),
      ]);
    }
  }

  const themes = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, rows]) => rows);

  const horizonEnd = addTorontoDays(today, fillDays - 1);

  return {
    meta: {
      practice: "LE 32 Clinique Dentaire",
      dentist: "Dr. Elizabeth Peeling",
      geo: "Vaudreuil-Dorion, West Island, greater Montreal",
      minDaysAhead: minDays,
      generatedAt: new Date().toISOString(),
      horizonStart: today,
      horizonEnd,
      note:
        "Rolling engagement themes for automation + studio review. English caption uses EN image; French caption uses FR twin. Language: both.",
    },
    themes,
  };
}

export function upcomingThemeToCalendarPost(
  theme: UpcomingThemeRow
): CalendarPost {
  return {
    id: theme.id,
    week: theme.weekBucket,
    date: theme.date,
    day: theme.day,
    platforms: theme.platforms,
    pillar: theme.pillar,
    format: theme.format,
    funnel: theme.funnel,
    categoryId: theme.categoryId,
    channel: theme.channel,
    language: theme.language,
    angle: theme.angle,
    hook: theme.hook,
    notes: [
      theme.notes,
      `Engagement goal: ${theme.engagementWhy}`,
      "BILINGUAL REQUIRED: EN caption + FR caption; EN on-image + FR on-image twin (same photo).",
    ].join(" "),
    cta: theme.cta,
    imageHints: theme.imageHints,
    subjectMode: theme.subjectMode,
    production: theme.production,
    compliance: theme.compliance,
  };
}

export function themesToCsv(themes: UpcomingThemeRow[]): string {
  const headers = [
    "Date",
    "Day",
    "Category",
    "Format",
    "Funnel",
    "Angle",
    "Hook",
    "Engagement why",
    "CTA",
    "Platforms",
    "Subject mode",
    "Image hints",
    "Compliance",
    "Theme id",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const t of themes) {
    lines.push(
      [
        t.date,
        t.day,
        t.categoryId,
        t.format,
        t.funnel,
        t.angle,
        t.hook,
        t.engagementWhy,
        t.cta,
        t.platforms.join("; "),
        t.subjectMode,
        t.imageHints.join("; "),
        t.compliance.join("; "),
        t.id,
      ]
        .map((c) => escape(String(c)))
        .join(",")
    );
  }
  return lines.join("\n");
}

export { MIN_DAYS_AHEAD, DAY_NAMES };
