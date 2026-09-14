export type StudioLanguage = "en" | "fr";
export type StudioFormat = "post" | "story";
export type PublishPlatform = "instagram" | "facebook";

export interface StudioHistoryItem {
  id: string;
  title: string;
  caption: string;
  tags: string[];
  language: StudioLanguage;
  format: StudioFormat;
  cta?: string;
  imageDataUrl: string;
  createdAt: number;
  favorite?: boolean;
  publishedTo?: PublishPlatform[];
}

export interface CaptionGenerateRequest {
  language: StudioLanguage;
  format: StudioFormat;
  topic?: string;
  cta?: string;
  imageHint?: string;
}

export interface CaptionGenerateResponse {
  title: string;
  caption: string;
  tags: string[];
}

export interface PublishResult {
  platform: PublishPlatform;
  ok: boolean;
  message: string;
  postId?: string;
}
