import { getCategory } from "./categories";
import type { StudioCategoryId, SubjectMode } from "./ad-types";

export const VISUAL_ANGLES = [
  "confidence-portrait",
  "lifestyle-outdoors",
  "soft-clinic",
  "product-focus",
  "warm-home",
  "celebration-moment",
] as const;

export type VisualAngle = (typeof VISUAL_ANGLES)[number];

const AGE_BANDS = [
  "mid-20s",
  "early 30s",
  "late 30s",
  "mid-40s",
  "early 50s",
] as const;

const GENDER_PRESENTATIONS = [
  "woman",
  "man",
  "non-binary adult presenting femininely",
  "non-binary adult presenting masculinely",
] as const;

const DEMOGRAPHICS = [
  "East Asian appearance",
  "South Asian appearance",
  "Black / African diaspora appearance",
  "White / European / Caucasian appearance",
  "Middle Eastern appearance",
  "Latino / Hispanic appearance",
  "mixed heritage appearance",
  "Indigenous North American appearance",
] as const;

const SKIN_TONES_CAUCASIAN = [
  "fair skin",
  "light skin",
  "light olive skin",
  "porcelain-fair skin with natural flush",
] as const;

const SKIN_TONES_OTHER = [
  "light olive skin",
  "medium brown skin",
  "deep brown skin",
  "rich dark skin",
  "golden medium skin",
] as const;

const NON_CAUCASIAN_DEMOS = DEMOGRAPHICS.filter(
  (d) => !d.toLowerCase().includes("white") && !d.toLowerCase().includes("caucasian")
);

const CATEGORY_PEOPLE_CUES: Record<StudioCategoryId, string[]> = {
  invisalign: [
    "holding clear aligners casually near a natural smile",
    "subtle smile with barely-visible clear aligners",
    "confident smile suggesting discreet orthodontic care",
  ],
  crowns: [
    "warm confident smile highlighting restored front teeth aesthetics",
    "close friendly portrait with a polished natural-looking smile",
  ],
  botox: [
    "relaxed, refreshed facial expression in soft daylight",
    "calm self-care lifestyle portrait, subtle and natural",
  ],
  implants: [
    "joyful full smile conveying restored confidence",
    "lifestyle portrait of someone smiling freely at a cafe",
  ],
  whitening: [
    "bright but natural-looking white smile in soft light",
    "fresh morning lifestyle smile outdoors",
  ],
  veneers: [
    "polished cinematic smile portrait, tasteful cosmetic dentistry vibe",
    "elegant evening lifestyle smile",
  ],
  "smile-makeover": [
    "transformative confidence smile in golden-hour light",
    "joyful social moment with a radiant natural smile",
  ],
};

const CATEGORY_SERVICE_CUES: Record<StudioCategoryId, string[]> = {
  invisalign: [
    "macro of clear Invisalign-style aligners on a clean linen surface",
    "hand holding clear aligners, no identifiable face",
    "soft-focus dental tray with clear aligners, modern clinic aesthetic",
  ],
  crowns: [
    "tasteful dental model smile close-up without identifiable person",
    "modern dental suite with warm lighting, empty chair, premium feel",
  ],
  botox: [
    "serene spa-like treatment room with soft towels and calm lighting",
    "abstract close-up of skincare textures suggesting facial aesthetics",
  ],
  implants: [
    "premium dental implant model on slate, editorial product photo",
    "modern clinic detail shot suggesting restorative dentistry",
  ],
  whitening: [
    "professional whitening tray and shade guide, clean product still life",
    "sparkling water glass and white flowers suggesting bright smile lifestyle",
  ],
  veneers: [
    "editorial smile crop from nose down only, polished teeth, no identity",
    "luxury vanity mirror scene implying smile aesthetics",
  ],
  "smile-makeover": [
    "mood board style flat-lay of smile care props, soft neutrals",
    "bright window-lit empty consult room, welcoming and modern",
  ],
};

const ANGLE_SETTINGS: Record<VisualAngle, string> = {
  "confidence-portrait":
    "shallow depth of field portrait, soft key light, Instagram-ready crop",
  "lifestyle-outdoors":
    "natural outdoor lifestyle setting, West Island / suburban Quebec summer vibe without landmarks",
  "soft-clinic":
    "modern dental clinic atmosphere, warm neutrals, clean and inviting",
  "product-focus":
    "product-led composition, editorial still life, soft shadows",
  "warm-home":
    "cozy home interior lifestyle, morning light through curtains",
  "celebration-moment":
    "subtle celebration / social moment energy, candid feel, not party chaos",
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** ~80% Caucasian / White European; ~20% other appearances */
function pickAppearance(): { demo: string; skin: string } {
  if (Math.random() < 0.8) {
    return {
      demo: "White / European / Caucasian appearance",
      skin: pick(SKIN_TONES_CAUCASIAN),
    };
  }
  return {
    demo: pick(NON_CAUCASIAN_DEMOS),
    skin: pick(SKIN_TONES_OTHER),
  };
}

function resolveSubjectKind(
  mode: SubjectMode
): "people" | "service" {
  if (mode === "people") return "people";
  if (mode === "service") return "service";
  return Math.random() < 0.55 ? "people" : "service";
}

export interface BuiltImagePrompt {
  prompt: string;
  summary: string;
  subjectKind: "people" | "service";
  visualAngle: VisualAngle;
  categoryId: StudioCategoryId;
}

export type OnImageText = {
  language: "en" | "fr";
  /** Short marketing line burned into the creative (headline-length) */
  text: string;
};

/** Instagram dental ads stay punchy — one short line, not a paragraph. */
export const ON_IMAGE_OVERLAY_MAX_CHARS = 44;

export function clipOnImageOverlay(
  text: string,
  maxChars = ON_IMAGE_OVERLAY_MAX_CHARS
): string {
  const cleaned = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["“”']+|["“”']+$/g, "");
  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const sp = cut.lastIndexOf(" ");
  return (sp > 16 ? cut.slice(0, sp) : cut)
    .replace(/[,:;.–—-]+$/g, "")
    .trim();
}

function onImageLanguageLabel(language: "en" | "fr"): string {
  return language === "fr" ? "French (Québec Canadian)" : "English";
}

/**
 * Refined cosmetic-dentist Instagram style: photo-first, one headline,
 * no infographic chrome (cards, CTAs, checklists, POV badges).
 */
export function refinedOnImageTypographyPrompt(input: {
  language: "en" | "fr";
  text: string;
  mode: "generate" | "replace" | "translate";
}): string {
  const langLabel = onImageLanguageLabel(input.language);
  const text = clipOnImageOverlay(input.text);
  const frenchRule =
    input.language === "fr"
      ? "Spelling and accents must be correct French. Do not leave English marketing words. Spell the myth-bust label as Mythe (never Myth)."
      : "Use English only for on-image words — do not mix in French.";

  const action =
    input.mode === "translate"
      ? `Translate the existing headline into ${langLabel}. Keep the same placement, size, and type style. If a target line is provided, use it exactly: ${text ? `"${text}"` : "(faithful translation of the source headline)"}.`
      : `The only readable marketing words must be this exact ${langLabel} headline: "${text}".`;

  return [
    "REFINED DENTAL INSTAGRAM STILL — like premium cosmetic-dentist feed posts (Invisalign / smile studios): lifestyle photograph first, typography second.",
    action,
    "At most ONE short headline (about 3–8 words). It may wrap onto two lines of the SAME phrase. Nothing else.",
    "Placement: lower third or a quiet upper corner. Generous negative space. Never cover the face, eyes, or smile.",
    "Type: clean editorial sans-serif or refined serif, high contrast, no fake UI chrome, no drop-shadow stickers.",
    "FORBIDDEN: extra text boxes, white cards, blue buttons, checklists, checkmarks, icons, camera badges, POV labels, CTAs, clinic addresses, disclaimers, hashtags, logos, captions, bullet lists, or stacked panels.",
    "If the source already has boxes, buttons, or extra copy, REMOVE them. Keep the photograph and a single headline.",
    `The output MUST include clearly readable ${langLabel} words — a text-free photo is incorrect.`,
    frenchRule,
  ].join(" ");
}

const SHORT_ON_IMAGE_HEADLINES: Record<StudioCategoryId, readonly string[]> = {
  invisalign: [
    "Clear aligners. Confident smile.",
    "Straighten without metal braces.",
    "Discreet. Removable. Effective.",
  ],
  crowns: [
    "Natural-looking crowns.",
    "Restore your smile strength.",
    "Built to blend in.",
  ],
  botox: [
    "Refreshed. Still you.",
    "Subtle soft-focus results.",
    "A rested, natural look.",
  ],
  implants: [
    "Smile like yourself again.",
    "Secure. Natural. Lasting.",
    "Replace missing teeth with confidence.",
  ],
  whitening: [
    "Brighter smile, naturally you.",
    "Professional whitening results.",
    "Lift stains. Keep it real.",
  ],
  veneers: [
    "A smile designed for you.",
    "Natural veneer aesthetics.",
    "Refine your smile confidently.",
  ],
  "smile-makeover": [
    "Your smile, elevated.",
    "A full-smile refresh.",
    "Confidence starts here.",
  ],
};

const SHORT_ON_IMAGE_HEADLINES_FR: Record<StudioCategoryId, readonly string[]> = {
  invisalign: [
    "Aligneurs clairs. Sourire confiant.",
    "Redressez sans broches métalliques.",
    "Discret. Amovible. Efficace.",
  ],
  crowns: [
    "Couronnes au look naturel.",
    "Retrouvez la force du sourire.",
    "Conçues pour se fondre.",
  ],
  botox: [
    "Rafraîchi. Encore vous.",
    "Un résultat subtil, naturel.",
    "Un air reposé, tout simplement.",
  ],
  implants: [
    "Sourire comme vous-même.",
    "Solide. Naturel. Durable.",
    "Remplacez une dent en confiance.",
  ],
  whitening: [
    "Un sourire plus éclatant.",
    "Blanchiment professionnel.",
    "Moins de taches, toujours vous.",
  ],
  veneers: [
    "Un sourire conçu pour vous.",
    "Esthétique naturelle des facettes.",
    "Affinez votre sourire.",
  ],
  "smile-makeover": [
    "Votre sourire, sublimé.",
    "Un rafraîchissement complet.",
    "La confiance commence ici.",
  ],
};

/** Short English line for optional on-image typography (image-only path). */
export function pickShortOnImageHeadline(
  categoryId: StudioCategoryId
): string {
  return pick(SHORT_ON_IMAGE_HEADLINES[categoryId]);
}

export function pickShortOnImageHeadlineFr(
  categoryId: StudioCategoryId
): string {
  return pick(SHORT_ON_IMAGE_HEADLINES_FR[categoryId]);
}

/** Append intentional on-image typography to an existing built prompt (same scene, new language). */
export function withOnImageText(
  built: BuiltImagePrompt,
  overlay: OnImageText
): BuiltImagePrompt {
  const text = clipOnImageOverlay(overlay.text);
  if (!text) return built;

  const cleaned = built.prompt
    .replace(
      /No logos, watermarks, brand names, or readable text in the image\.?/gi,
      ""
    )
    .replace(
      /do not render as visible text in the image/gi,
      "use for scene direction only; do not paint the brief itself as a paragraph"
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  const prompt = [
    cleaned,
    refinedOnImageTypographyPrompt({
      language: overlay.language,
      text,
      mode: "generate",
    }),
  ].join(" ");

  return {
    ...built,
    prompt,
    summary: `${built.summary} · ${overlay.language.toUpperCase()} text`,
  };
}

export function buildImagePrompt(input: {
  categoryId: StudioCategoryId;
  subjectMode: SubjectMode;
  /** Editable dentist guidance / random context fed into the image prompt */
  notes?: string;
  /** Feed posts are square; Stories are vertical 9:16 */
  aspect?: "square" | "story";
  /** When set, image includes this headline typography in the given language */
  onImageText?: OnImageText;
}): BuiltImagePrompt {
  const category = getCategory(input.categoryId);
  const subjectKind = resolveSubjectKind(input.subjectMode);
  const visualAngle = pick(VISUAL_ANGLES);
  const setting = ANGLE_SETTINGS[visualAngle];
  const context = input.notes?.trim().slice(0, 1200);
  const contextBlock = context
    ? `Primary creative direction from dentist (scene, subject, and mood only — NEVER paint this brief as readable text, cards, buttons, checklists, POV labels, or UI overlays): ${context}`
    : "";

  const composition =
    input.aspect === "story"
      ? "Photorealistic marketing photograph, vertical 9:16 Instagram/Facebook Stories composition (portrait phone frame), keep key subject in the safe center third."
      : "Photorealistic marketing photograph, square 1:1 Instagram composition.";

  const textRule = input.onImageText?.text?.trim()
    ? "Logos and watermarks are not allowed (on-image headline typography is added separately)."
    : "No logos, watermarks, brand names, or readable text in the image.";

  const safety = [
    composition,
    textRule,
    "Photo-first cosmetic dentistry Instagram still — refined, uncluttered, lots of breathing room.",
    "Do not add text boxes, caption cards, checklists, buttons, icons, stickers, POV labels, hashtags, or infographic layouts.",
    "No celebrity lookalikes, no identifiable real people.",
    "No medical gore, blood, surgery, needles in focus, or graphic clinical procedures.",
    "No before/after split images. Tasteful cosmetic dentistry advertising style.",
    "Do not depict any specific real dentist.",
  ].join(" ");

  if (subjectKind === "people") {
    const age = pick(AGE_BANDS);
    const gender = pick(GENDER_PRESENTATIONS);
    const { demo, skin } = pickAppearance();
    const cue = pick(CATEGORY_PEOPLE_CUES[input.categoryId]);

    const prompt = [
      `Create a photorealistic social-media ad image for ${category.label} cosmetic dentistry marketing.`,
      contextBlock ||
        `Subject: adult ${gender}, ${age}, ${demo}, ${skin}, looking approachable and confident. Scene cue: ${cue}.`,
      contextBlock
        ? `If demographics are not specified above, use: adult ${gender}, ${age}, ${demo}, ${skin}.`
        : "",
      `Visual style: ${setting}.`,
      safety,
      "Natural teeth appearance; avoid overly fake CGI teeth. Authentic lighting.",
    ]
      .filter(Boolean)
      .join(" ");

    const base: BuiltImagePrompt = {
      prompt,
      summary: context
        ? `AI · guided · ${category.label} · ${visualAngle}`
        : `AI person · ${age} · ${demo} · ${category.label} · ${visualAngle}`,
      subjectKind,
      visualAngle,
      categoryId: input.categoryId,
    };
    return input.onImageText
      ? withOnImageText(base, input.onImageText)
      : base;
  }

  const cue = pick(CATEGORY_SERVICE_CUES[input.categoryId]);
  const prompt = [
    `Create a photorealistic social-media ad image for ${category.label} cosmetic dentistry marketing.`,
    contextBlock || `Subject: service / lifestyle still — ${cue}.`,
    `No identifiable full face of a person (crop or omit) unless the creative direction above requires a person.`,
    `Visual style: ${setting}.`,
    safety,
  ]
    .filter(Boolean)
    .join(" ");

  const base: BuiltImagePrompt = {
    prompt,
    summary: context
      ? `AI · guided service · ${category.label} · ${visualAngle}`
      : `AI service visual · ${category.label} · ${visualAngle}`,
    subjectKind,
    visualAngle,
    categoryId: input.categoryId,
  };
  return input.onImageText ? withOnImageText(base, input.onImageText) : base;
}
