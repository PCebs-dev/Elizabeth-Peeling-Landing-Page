import type {
  GeneratedAdCopy,
  StudioCategoryId,
  StudioChannel,
  StudioLanguage,
  SubjectMode,
} from "./types";

export type SavedAdStatus = "ready" | "discarded";

export type CalendarFormat = "static" | "carousel" | "story";

export interface CalendarPost {
  id: string;
  week: number;
  date: string;
  day: string;
  platforms: string[];
  pillar: string;
  format: CalendarFormat | string;
  funnel: string;
  categoryId: StudioCategoryId;
  channel: StudioChannel;
  language: StudioLanguage;
  angle: string;
  hook: string;
  notes: string;
  cta: string;
  imageHints: string[];
  subjectMode: SubjectMode;
  production: string;
  compliance: string[];
}

export interface CalendarFile {
  meta: Record<string, unknown>;
  posts: CalendarPost[];
}

/** Durable ad created by calendar automation or manual save */
export interface SavedStudioAd {
  id: string;
  source: "calendar" | "manual";
  status: SavedAdStatus;
  calendarPostId?: string;
  scheduledDate?: string;
  /** Snapshot of the calendar brief used to generate this ad (for reruns). */
  calendarPost?: CalendarPost;
  platforms: string[];
  format: string;
  pillar?: string;
  funnel?: string;
  hook?: string;
  categoryId: StudioCategoryId;
  channel: StudioChannel;
  language: StudioLanguage;
  angle: string;
  headline: string;
  caption: string;
  shortCaption: string;
  hashtags: string[];
  cta: string;
  disclaimer: string;
  paid?: GeneratedAdCopy["paid"];
  fr?: GeneratedAdCopy["fr"];
  imageMimeType: string;
  /** PNG/JPEG as base64 (no data: prefix) */
  imageBase64: string;
  /** Optional French on-image wording twin */
  imageFrMimeType?: string;
  imageFrBase64?: string;
  promptSummary?: string;
  promptSummaryFr?: string;
  compliance?: string[];
  createdAt: number;
  favorite?: boolean;
  /** Auto / manual Meta publish audit trail */
  publish?: {
    storiesPublishedAt?: number;
    results?: {
      platform: string;
      postId: string;
      kind: "story" | "feed";
      at: number;
    }[];
    errors?: { platform: string; error: string; at: number }[];
  };
}

export function savedAdToGeneratedCopy(ad: SavedStudioAd): GeneratedAdCopy & {
  id: string;
  categoryId: StudioCategoryId;
  channel: StudioChannel;
  language: StudioLanguage;
  photoIds: string[];
  createdAt: number;
  favorite?: boolean;
  aiImage: boolean;
  promptSummary?: string;
} {
  return {
    id: ad.id,
    categoryId: ad.categoryId,
    channel: ad.channel,
    language: ad.language,
    photoIds: [],
    createdAt: ad.createdAt,
    favorite: ad.favorite,
    aiImage: true,
    promptSummary: ad.promptSummary,
    headline: ad.headline,
    caption: ad.caption,
    shortCaption: ad.shortCaption,
    hashtags: ad.hashtags,
    cta: ad.cta,
    disclaimer: ad.disclaimer,
    angle: ad.angle,
    paid: ad.paid,
    fr: ad.fr,
  };
}
