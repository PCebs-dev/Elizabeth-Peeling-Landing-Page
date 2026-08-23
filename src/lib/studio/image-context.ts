import { getCategory } from "./categories";
import { clipOnImageOverlay } from "./image-prompt";
import type { StudioCategoryId } from "./types";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const PATIENT_AGES = [
  "mid-20s professional",
  "early-30s parent",
  "late-30s professional",
  "mid-40s professional",
  "early-50s professional",
  "college-age young adult",
] as const;

const PATIENT_PRESENTATIONS = [
  "woman",
  "man",
  "person with a soft feminine presentation",
  "person with a soft masculine presentation",
] as const;

const PATIENT_LOOKS = [
  "East Asian appearance",
  "South Asian appearance",
  "Black / African diaspora appearance",
  "White / European / Caucasian appearance",
  "Middle Eastern appearance",
  "Latino / Hispanic appearance",
  "mixed heritage appearance",
] as const;

const PATIENT_LOOKS_OTHER = PATIENT_LOOKS.filter(
  (d) => !d.toLowerCase().includes("white") && !d.toLowerCase().includes("caucasian")
);

/** ~80% Caucasian / White European for patient concepts */
function pickPatientLook(): string {
  if (Math.random() < 0.8) {
    return "White / European / Caucasian appearance";
  }
  return pick(PATIENT_LOOKS_OTHER);
}

const SETTINGS = [
  "soft morning light at home",
  "sunny patio lifestyle moment",
  "modern LE 32-style clinic waiting area vibe (no logos)",
  "cafe window light, candid smile",
  "golden-hour outdoor portrait",
  "clean bright bathroom vanity / getting-ready moment",
  "professional headshot energy with warm lighting",
] as const;

const MOODS = [
  "confident and approachable",
  "quietly proud of their smile",
  "relaxed and natural",
  "warm and friendly",
  "camera-ready but authentic",
] as const;

const THEME_HOOKS: Record<StudioCategoryId, string[]> = {
  invisalign: [
    "discreet clear aligners for an adult smile refresh",
    "busy professional wanting straighten teeth without metal braces",
    "holding clear aligners near a natural smile",
    "subtle Invisalign journey for mild crowding",
    "adult orthodontics that fits a work-from-home lifestyle",
  ],
  crowns: [
    "restored front tooth aesthetics with a natural crown look",
    "rebuilding confidence after a chipped tooth",
    "polished smile after restorative crown work",
  ],
  botox: [
    "refreshed, natural facial aesthetics with subtle soft focus",
    "self-care moment after a dental aesthetics consult",
    "calm, rested expression — not overdone",
  ],
  implants: [
    "joyful smile after tooth replacement confidence returns",
    "lifestyle moment showing comfort chewing / smiling freely",
    "restored smile energy for social photos",
  ],
  whitening: [
    "bright but natural whitening result for a wedding season smile",
    "fresh morning smile after professional whitening",
    "subtle brighter smile for job interviews / photos",
  ],
  veneers: [
    "elegant veneer smile makeover without looking fake",
    "camera-ready smile for events and portraits",
    "harmonious front-tooth aesthetics",
  ],
  "smile-makeover": [
    "full smile transformation confidence moment",
    "before-the-big-event smile glow-up energy",
    "complete cosmetic smile refresh lifestyle portrait",
  ],
};

const SERVICE_THEMES: Record<StudioCategoryId, string[]> = {
  invisalign: [
    "clear aligners on linen, editorial product still life",
    "hand holding Invisalign-style trays, no identifiable face",
    "minimal clinic tray with clear aligners, soft neutrals",
  ],
  crowns: [
    "premium dental crown model on slate, soft studio light",
    "modern empty dental suite with warm inviting lighting",
  ],
  botox: [
    "spa-like treatment room mood, towels and soft daylight",
    "abstract self-care textures suggesting facial refresh",
  ],
  implants: [
    "implant education model, clean editorial product photo",
    "modern restorative dentistry clinic detail shot",
  ],
  whitening: [
    "whitening shade guide and tray, bright clean still life",
    "sparkling glass and white florals suggesting bright smile lifestyle",
  ],
  veneers: [
    "smile crop from nose down only, polished natural teeth",
    "vanity mirror lifestyle flat-lay implying smile aesthetics",
  ],
  "smile-makeover": [
    "mood-board flat-lay of smile-care props in warm neutrals",
    "bright consult-room window light, welcoming empty chair",
  ],
};

export type ImageContextKind = "patient" | "theme" | "mixed";

/**
 * Builds a random editable context string for the image generator.
 * The dentist can tweak this before clicking Generate AI image.
 */
export function randomImageContext(
  categoryId: StudioCategoryId,
  kind: ImageContextKind = "mixed"
): string {
  const category = getCategory(categoryId);
  const mode =
    kind === "mixed"
      ? Math.random() < 0.65
        ? "patient"
        : "theme"
      : kind;

  if (mode === "theme") {
    const theme = pick(SERVICE_THEMES[categoryId]);
    const setting = pick(SETTINGS);
    return [
      `Category focus: ${category.label}.`,
      `Theme: ${theme}.`,
      `Setting: ${setting}.`,
      `Style: photorealistic Instagram ad still, tasteful cosmetic dentistry.`,
    ].join(" ");
  }

  const age = pick(PATIENT_AGES);
  const presentation = pick(PATIENT_PRESENTATIONS);
  const look = pickPatientLook();
  const hook = pick(THEME_HOOKS[categoryId]);
  const setting = pick(SETTINGS);
  const mood = pick(MOODS);

  return [
    `Dental patient concept for ${category.label}:`,
    `${age} ${presentation}, ${look}, ${mood}.`,
    `Story: ${hook}.`,
    `Setting: ${setting}.`,
    `Guidance: natural smile, photorealistic marketing photo, no logos, not a real identifiable patient.`,
  ].join(" ");
}

/** ~30% of random rolls include on-image marketing text. */
export function rollIncludeOnImageText(): boolean {
  return Math.random() < 0.3;
}

/** Line baked into Image prompt context (editable in the textarea). */
export const ON_IMAGE_TEXT_LINE_PREFIX = "On-image text:";

const ON_IMAGE_TEXT_LINE_RE =
  /^On-image text:\s*(.+)\s*$/im;

function isNoneOnImageValue(value: string): boolean {
  const v = value.trim().toLowerCase().replace(/\.$/, "");
  return !v || v === "none" || v === "no" || v === "n/a" || v === "not included";
}

/** Remove any existing On-image text line from the context body. */
export function stripOnImageTextLine(context: string): string {
  return context
    .split(/\r?\n/)
    .filter((line) => !/^On-image text:\s*/i.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Append or replace the dedicated On-image text line.
 * Pass null/empty headline for photo-only (`On-image text: none.`).
 */
export function withOnImageTextLine(
  context: string,
  headline: string | null | undefined
): string {
  const body = stripOnImageTextLine(context);
  const trimmed = clipOnImageOverlay(headline?.trim() || "");
  const line =
    trimmed && !isNoneOnImageValue(trimmed)
      ? `${ON_IMAGE_TEXT_LINE_PREFIX} ${trimmed}`
      : `${ON_IMAGE_TEXT_LINE_PREFIX} none.`;
  return body ? `${body}\n${line}` : line;
}

/** Parse the On-image text line from the prompt context textarea. */
export function parseOnImageTextLine(context: string): {
  notes: string;
  include: boolean;
  headline: string;
} {
  const notes = stripOnImageTextLine(context);
  const match = context.match(ON_IMAGE_TEXT_LINE_RE);
  if (!match) {
    return { notes, include: false, headline: "" };
  }
  const raw = match[1]?.trim() || "";
  if (isNoneOnImageValue(raw)) {
    return { notes, include: false, headline: "" };
  }
  return { notes, include: true, headline: clipOnImageOverlay(raw) };
}
