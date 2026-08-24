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
