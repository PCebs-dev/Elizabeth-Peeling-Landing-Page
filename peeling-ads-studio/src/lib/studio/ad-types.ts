export type StudioCategoryId =
  | "invisalign"
  | "crowns"
  | "botox"
  | "implants"
  | "whitening"
  | "veneers"
  | "smile-makeover";

export type StudioLanguage = "en" | "fr" | "both";
export type StudioChannel = "organic" | "paid";
export type PhotoSource = "upload" | "ai";
export type SubjectMode = "random" | "people" | "service";
export type StudioMediaKind = "image" | "video";

/** Video-only creative tone (never applied to still image generation) */
export type StudioVideoTone =
  | "warm"
  | "humorous"
  | "random_funny"
  | "random_edgy"
  | "serious"
  | "inspirational"
  | "educational"
  | "soft_cta";

export const STUDIO_VIDEO_TONES: {
  id: StudioVideoTone;
  label: string;
}[] = [
  { id: "warm", label: "Warm" },
  { id: "humorous", label: "Humorous" },
  { id: "random_funny", label: "Random Funny" },
  { id: "random_edgy", label: "Random Edgy" },
  { id: "serious", label: "Serious" },
  { id: "inspirational", label: "Inspirational" },
  { id: "educational", label: "Educational" },
  { id: "soft_cta", label: "Soft CTA" },
];

export function isStudioVideoTone(v: unknown): v is StudioVideoTone {
  return (
    typeof v === "string" &&
    STUDIO_VIDEO_TONES.some((t) => t.id === v)
  );
}

/**
 * Viral comedy tones — no clinic/doctor branding in script or motion brief.
 * (Random Funny + Random Edgy)
 */
export function isUnbrandedViralVideoTone(tone: StudioVideoTone): boolean {
  return tone === "random_funny" || tone === "random_edgy";
}

/** @deprecated Prefer isUnbrandedViralVideoTone */
export function isRandomFunnyVideoTone(tone: StudioVideoTone): boolean {
  return isUnbrandedViralVideoTone(tone);
}

/**
 * Clip lengths Higgsfield DoP `/higgsfield-ai/dop/standard` accepts.
 */
export type StudioVideoDuration = 5 | 10;
export type HiggsfieldVideoDuration = 5 | 10;

export const STUDIO_VIDEO_DURATIONS: {
  id: StudioVideoDuration;
  label: string;
  hint: string;
}[] = [
  { id: 5, label: "5 seconds", hint: "Stories / quick hook" },
  { id: 10, label: "10 seconds", hint: "Reels / short clip" },
];

export function isStudioVideoDuration(v: unknown): v is StudioVideoDuration {
  return (
    typeof v === "number" && STUDIO_VIDEO_DURATIONS.some((d) => d.id === v)
  );
}

export function parseStudioVideoDuration(raw: unknown): StudioVideoDuration {
  const n = typeof raw === "number" ? raw : Number(raw);
  return isStudioVideoDuration(n) ? n : 5;
}

/** Higgsfield DoP duration (same as the studio picker: 5 or 10). */
export function mapStudioVideoDurationToApi(
  duration: StudioVideoDuration
): HiggsfieldVideoDuration {
  return duration;
}

export function studioVideoDurationLabel(
  duration: StudioVideoDuration
): string {
  return (
    STUDIO_VIDEO_DURATIONS.find((d) => d.id === duration)?.label ||
    `${duration}s`
  );
}

/**
 * Video audio mode for AI clip generation.
 * - silent: motion-only MP4 from Higgsfield (default, cheapest)
 * - v1_voiceover: OpenAI TTS muxed over the silent clip (mouth won’t match)
 * - v2_talking_head: Sync Labs lip-sync talking head (Higgsfield + OpenAI TTS)
 */
export type StudioVideoVoiceMode =
  | "silent"
  | "v1_voiceover"
  | "v2_talking_head";

export const STUDIO_VIDEO_VOICE_MODES: {
  id: StudioVideoVoiceMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "silent",
    label: "Silent (motion only)",
    hint: "Current default — no TTS cost",
  },
  {
    id: "v1_voiceover",
    label: "V1 · Voiceover",
    hint: "Spoken script as voiceover over the clip (mouth won’t match)",
  },
  {
    id: "v2_talking_head",
    label: "V2 · Talking head",
    hint: "Lip-sync via Sync Labs (mouth matches speech) — higher cost",
  },
];

export function isStudioVideoVoiceMode(v: unknown): v is StudioVideoVoiceMode {
  return (
    typeof v === "string" &&
    STUDIO_VIDEO_VOICE_MODES.some((m) => m.id === v)
  );
}

export function parseStudioVideoVoiceMode(
  raw: unknown
): StudioVideoVoiceMode {
  return isStudioVideoVoiceMode(raw) ? raw : "silent";
}

export function studioVideoVoiceModeLabel(
  mode: StudioVideoVoiceMode
): string {
  return (
    STUDIO_VIDEO_VOICE_MODES.find((m) => m.id === mode)?.label || mode
  );
}

/** True when the selected voice mode can confirm video generation. */
export function isStudioVideoVoiceModeReady(
  _mode: StudioVideoVoiceMode
): boolean {
  return true;
}

export interface StudioPhoto {
  id: string;
  categoryId: StudioCategoryId;
  name: string;
  mimeType: string;
  /** image | video — inferred from mimeType when omitted (legacy rows) */
  mediaKind?: StudioMediaKind;
  /** Object URL or data URL for preview */
  previewUrl: string;
  /** Raw blob stored in IndexedDB */
  blob: Blob;
  note: string;
  createdAt: number;
  source: PhotoSource;
  /** Short summary of AI prompt when source is ai */
  promptSummary?: string;
  /** Hidden FR twin — not shown in gallery */
  galleryHidden?: boolean;
  /** Linked French-wording twin photo id (on the EN gallery photo) */
  linkedFrPhotoId?: string;
  /** EN photo this FR twin belongs to */
  pairOfPhotoId?: string;
  /** True when the creative has intentional on-image marketing typography */
  hasOnImageText?: boolean;
}

export function mediaKindFromMime(mimeType: string): StudioMediaKind {
  return mimeType.toLowerCase().startsWith("video/") ? "video" : "image";
}

export interface GenerateRequest {
  categoryId: StudioCategoryId;
  notes: string;
  language: StudioLanguage;
  channel: StudioChannel;
  /** Optional short descriptions of selected images (filenames + notes) */
  imageHints: string[];
  /** Prior headlines to avoid repeating when regenerating */
  avoidHeadlines?: string[];
  /** Prior creative angles to avoid when regenerating */
  avoidAngles?: string[];
}

export interface GenerateImageRequest {
  categoryId: StudioCategoryId;
  notes: string;
  language: StudioLanguage;
  channel: StudioChannel;
  subjectMode: SubjectMode;
  avoidHeadlines?: string[];
  avoidAngles?: string[];
}

export interface GeneratedAdCopy {
  headline: string;
  caption: string;
  shortCaption: string;
  hashtags: string[];
  cta: string;
  disclaimer: string;
  angle: string;
  paid?: {
    primaryText: string;
    headline: string;
    description: string;
    audienceSuggestion: string;
    budgetNote: string;
  };
  fr?: {
    headline: string;
    caption: string;
    shortCaption: string;
    hashtags: string[];
    cta: string;
    disclaimer: string;
    paid?: {
      primaryText: string;
      headline: string;
      description: string;
    };
  };
}

export interface GeneratedAd extends GeneratedAdCopy {
  id: string;
  categoryId: StudioCategoryId;
  channel: StudioChannel;
  language: StudioLanguage;
  photoIds: string[];
  /** AI twin with French on-image wording (when language is both/fr) */
  photoIdFr?: string;
  createdAt: number;
  favorite?: boolean;
  /** True when paired with an AI-generated image */
  aiImage?: boolean;
  promptSummary?: string;
}

export interface MetaTargetingBrief {
  radiusKm: number;
  ageMin: number;
  ageMax: number;
  primaryCities: string[];
  secondaryCities: string[];
  interests: string[];
  placements: string[];
  checklist: string[];
}
