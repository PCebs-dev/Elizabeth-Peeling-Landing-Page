import { getCategory } from "./categories";
import type { StudioCategoryId } from "./types";

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

const TONES = [
  "Warm and conversational, like a clinic Instagram post — not a brochure.",
  "Educational first, then a soft consult invite.",
  "Local Vaudreuil-Dorion / West Island, neighbourly tone.",
  "Confidence and everyday smiling — no drama, no scare tactics.",
  "Short hook, then 2-3 clear lines, then a calm CTA.",
];

const MUST_INCLUDE = [
  "Invite an in-office exam rather than selling a treatment online.",
  "Name Dr. Elizabeth Peeling at Clinique LE 32 naturally once.",
  "Keep English and French equally cautious if both are generated.",
];

const CATEGORY_HOOKS: Record<StudioCategoryId, string[]> = {
  invisalign: [
    "Clear aligners curiosity — who it might help, without promising a timeline.",
    "SmileView / consult as the next step, not 'order Invisalign today'.",
    "Myth-bust: aligners are not only for teens — still no guaranteed outcome.",
  ],
  whitening: [
    "Professional whitening vs store kits — shade results vary.",
    "Occasion smile (photos, wedding season) without a permanence claim.",
    "Sensitivity and suitability belong in an exam, not in the ad promise.",
  ],
  veneers: [
    "Veneers as one option after an exam, not a one-size makeover.",
    "Focus on planning and fit, not 'Hollywood teeth overnight'.",
  ],
  implants: [
    "Missing tooth / chewing comfort — candidacy only after examination.",
    "Replace a missing tooth conversation, no 'implants for everyone'.",
  ],
  crowns: [
    "Restore shape and strength of a damaged tooth — case-by-case.",
    "Comfort and function, not a cosmetic guarantee.",
  ],
  botox: [
    "Offered per clinic protocols and ODQ-aligned training — no miracle aging claims.",
    "Therapeutic or aesthetic intent without guaranteed smoothness.",
  ],
  "smile-makeover": [
    "A planned smile conversation — photos, exam, options. No fixed result.",
    "Collaborative design; do not present a specific after look as typical.",
  ],
};

/** Gray placeholder in Caption prompt — not sent unless the dentist types over it. */
export const DEFAULT_CAPTION_PROMPT_PLACEHOLDER = `How to advertise a price legally in Studio.
Put labeled facts in the caption prompt, for example:

Regular price: $X
Special price: $Y
Expiry date: YYYY-MM-DD
Nature of the service: …
Materials: …
Lab / other services included: yes/no
Additional services not included: …

Until those labels are all present, regen will not republish $4,000 / $2,500 / Beautifi.`;

function isUnfilledPriceTemplate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const looksLikeHint =
    /how to advertise a price legally/i.test(t) ||
    /put labeled facts in the caption prompt/i.test(t);
  const stillHasPlaceholders =
    /regular\s+price:\s*\$x\b/i.test(t) &&
    /(exceptional|special)\s+price:\s*\$y\b/i.test(t);
  return looksLikeHint && stillHasPlaceholders;
}

/**
 * Empty or unmodified legal-price hint → random category brief (Invisalign, implants, …).
 * Filled facts (including real prices) are passed through for the model + ODQ gate.
 */
export function effectiveCaptionPrompt(
  raw: string,
  categoryId: StudioCategoryId
): string {
  if (isUnfilledPriceTemplate(raw)) {
    return randomCaptionPrompt(categoryId);
  }
  return raw.trim();
}

function formatCad(amount: number): string {
  return `$${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function randomExpiryDate(): string {
  const days = pick([14, 21, 30, 45]);
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type OdqPricePackage = {
  regular: number;
  exceptional: number;
  service: string;
  materials: string;
  laboratory: string;
  additional: string;
};

/** Typical private-practice promo ranges in CAD (draft only — confirm before publish). */
const ODQ_PRICE_PACKAGES: Record<StudioCategoryId, OdqPricePackage[]> = {
  invisalign: [
    {
      regular: 6500,
      exceptional: 5495,
      service: "Invisalign clear aligner service (comprehensive case)",
      materials: "medical-grade thermoplastic Invisalign aligners",
      laboratory: "included (Invisalign fabrication)",
      additional:
        "retainers, refinement aligners beyond the plan, attachments replacement, and any restorative work not included",
    },
    {
      regular: 5500,
      exceptional: 4495,
      service: "Invisalign clear aligner service (moderate crowding)",
      materials: "clear thermoplastic aligners",
      laboratory: "included (aligner fabrication)",
      additional:
        "Vivera or other retainers, IPR beyond the plan, and adjunctive procedures not included",
    },
    {
      regular: 7500,
      exceptional: 6495,
      service: "Invisalign clear aligner service with digital scan",
      materials: "Invisalign aligners and SmartTrack material",
      laboratory: "included (digital setup and aligner lab)",
      additional:
        "final retainers, whitening, and any required fillings or crowns not included",
    },
  ],
  whitening: [
    {
      regular: 599,
      exceptional: 449,
      service: "in-office professional teeth whitening service",
      materials: "chairside bleaching gel (peroxide-based, dentist-supervised)",
      laboratory: "not applicable (no lab fabrication)",
      additional:
        "take-home trays, gum treatment, and sensitivity care not included",
    },
    {
      regular: 449,
      exceptional: 349,
      service: "professional whitening service (single in-office session)",
      materials: "in-office whitening gel",
      laboratory: "not applicable",
      additional: "custom take-home kit and follow-up shade visit not included",
    },
  ],
  veneers: [
    {
      regular: 1400,
      exceptional: 1195,
      service: "porcelain veneer service (fee per tooth)",
      materials: "laboratory-fabricated porcelain or lithium disilicate",
      laboratory: "included (veneer fabrication for the quoted tooth)",
      additional:
        "temporary veneers if billed separately, extra teeth, whitening, and gum contouring not included",
    },
    {
      regular: 9995,
      exceptional: 8495,
      service: "porcelain veneer service (6 anterior teeth)",
      materials: "ceramic veneers",
      laboratory: "included (lab-fabricated ceramics for 6 teeth)",
      additional:
        "additional teeth, night guard, and any required root canal or crown not included",
    },
  ],
  implants: [
    {
      regular: 4200,
      exceptional: 3495,
      service: "single dental implant placement service (fixture only)",
      materials: "titanium dental implant",
      laboratory: "not included (crown and abutment billed separately)",
      additional:
        "abutment, implant crown, extraction, bone graft, and sinus lift not included",
    },
    {
      regular: 6200,
      exceptional: 5295,
      service: "single-tooth implant service (implant, abutment, and crown)",
      materials: "titanium implant with ceramic or zirconia crown",
      laboratory: "included (custom abutment and crown fabrication)",
      additional:
        "extraction, bone graft, temporary prosthesis, and extra implants not included",
    },
  ],
  crowns: [
    {
      regular: 1450,
      exceptional: 1195,
      service: "dental crown service (one tooth)",
      materials: "zirconia or porcelain crown",
      laboratory: "included (crown fabrication)",
      additional:
        "core buildup, root canal, temporary crown if extra, and neighbouring teeth not included",
    },
    {
      regular: 1650,
      exceptional: 1395,
      service: "all-ceramic dental crown service (one tooth)",
      materials: "lithium disilicate or zirconia ceramic",
      laboratory: "included (ceramic lab work)",
      additional: "post and core, extraction, and implant options not included",
    },
  ],
  botox: [
    {
      regular: 450,
      exceptional: 349,
      service: "botulinum toxin aesthetic service (one facial area)",
      materials: "botulinum toxin type A (units as determined at exam)",
      laboratory: "not applicable (no lab fabrication)",
      additional:
        "additional facial areas, dermal fillers, and follow-up touch-up not included",
    },
    {
      regular: 14,
      exceptional: 12,
      service: "botulinum toxin service (fee per unit, area confirmed at exam)",
      materials: "botulinum toxin type A",
      laboratory: "not applicable",
      additional:
        "assessment visit if billed separately, extra units, and filler not included",
    },
  ],
  "smile-makeover": [
    {
      regular: 12500,
      exceptional: 9995,
      service: "cosmetic smile design service (up to 8 porcelain veneers)",
      materials: "laboratory-fabricated porcelain veneers",
      laboratory: "included (ceramic fabrication for up to 8 veneers)",
      additional:
        "whitening, orthodontics, implants, gum surgery, and extra veneers not included",
    },
    {
      regular: 250,
      exceptional: 0,
      service: "cosmetic smile consultation service (exam and digital photos)",
      materials: "intraoral photos and exam materials",
      laboratory: "not applicable",
      additional:
        "treatment itself (veneers, aligners, whitening) not included",
    },
  ],
};

/**
 * Fills every 3.09.07 label with a realistic draft promo for the selected theme.
 * Dentist must confirm amounts before publishing (advertised regular fee binds 90 days).
 */
export function randomOdqPricePrompt(categoryId: StudioCategoryId): string {
  const category = getCategory(categoryId);
  const pkg = pick(ODQ_PRICE_PACKAGES[categoryId]);
  const expiry = randomExpiryDate();
  const regular = formatCad(pkg.regular);
  const exceptional =
    pkg.exceptional > 0 && pkg.exceptional < pkg.regular
      ? formatCad(pkg.exceptional)
      : "";

  const lines = [
    `Theme: ${category.label}. Draft ODQ price facts for the caption (edit before you publish).`,
    `Nature of the service: ${pkg.service}`,
    `Regular price: ${regular}`,
  ];
  if (exceptional) {
    lines.push(`Exceptional price: ${exceptional}`);
    lines.push(`Expiry date: ${expiry}`);
  }
  lines.push(`Materials: ${pkg.materials}`);
  lines.push(`Laboratory: ${pkg.laboratory}`);
  lines.push(`Additional services: ${pkg.additional}`);
  lines.push(
    "Use these labels as written. Do not add extra dollar amounts, down payments, or financing. Results vary; an exam is required."
  );
  return lines.join("\n");
}

/**
 * Auto-fills an editable caption brief (same idea as Random on the image prompt).
 * The dentist can then add promo pricing or other facts before Generate caption.
 */
export function randomCaptionPrompt(categoryId: StudioCategoryId): string {
  const category = getCategory(categoryId);
  const hook = pick(CATEGORY_HOOKS[categoryId]);
  return [
    `Theme: ${category.label}.`,
    `Angle: ${hook}`,
    `Tone: ${pick(TONES)}`,
    `Must include: ${pick(MUST_INCLUDE)}`,
    "Optional: add promo pricing or a specific offer here (dollar amount, what is included, end date if you have one). ODQ rules still apply — no guaranteed results.",
  ].join("\n");
}
