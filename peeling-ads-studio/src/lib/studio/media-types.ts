export type MediaKind = "photo" | "before-after";

export interface MediaItem {
  id: string;
  name: string;
  /** Public or API URL for the stored image */
  url: string;
  /** Legacy on-device data URL (local cache / migration) */
  dataUrl?: string;
  createdAt: number;
  updatedAt: number;
  kind: MediaKind;
  enhancementPrompt?: string;
  sourceId?: string;
  beforeId?: string;
  afterId?: string;
}

export interface MediaRecord extends MediaItem {
  contentType: string;
  storage: "blob" | "local";
}

export function mediaFileUrl(id: string): string {
  return `/api/studio/media/${id}`;
}

export function getMediaDisplayUrl(item: MediaItem): string {
  return item.url || item.dataUrl || "";
}
