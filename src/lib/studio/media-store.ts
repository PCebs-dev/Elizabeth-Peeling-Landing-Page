import type { MediaItem, MediaKind } from "./media-types";
import { compressImageFile, blobToDataUrl } from "./image-compress";

export type { MediaItem, MediaKind } from "./media-types";
export { getMediaDisplayUrl } from "./media-types";

const LEGACY_DB_NAME = "peeling-studio-media";
const LEGACY_STORE = "media";
const SYNC_FLAG = "peeling-studio-local-synced-v1";

interface LegacyMediaItem extends MediaItem {
  dataUrl: string;
}

function openLegacyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("Failed to open legacy media DB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.createObjectStore(LEGACY_STORE, { keyPath: "id" });
      }
    };
  });
}

async function listLegacyMedia(): Promise<LegacyMediaItem[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openLegacyDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(LEGACY_STORE, "readonly").objectStore(LEGACY_STORE).getAll();
      req.onsuccess = () => resolve((req.result as LegacyMediaItem[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("Failed to read legacy media"));
    });
  } catch {
    return [];
  }
}

export function newMediaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function uploadBlob(params: {
  blob: Blob;
  name: string;
  kind?: MediaKind;
  id?: string;
  enhancementPrompt?: string;
  sourceId?: string;
  beforeId?: string;
  afterId?: string;
}): Promise<MediaItem> {
  const form = new FormData();
  form.append("image", params.blob, `${params.name || "photo"}.jpg`);
  form.append("name", params.name);
  form.append("kind", params.kind ?? "photo");
  if (params.id) form.append("id", params.id);
  if (params.enhancementPrompt) form.append("enhancementPrompt", params.enhancementPrompt);
  if (params.sourceId) form.append("sourceId", params.sourceId);
  if (params.beforeId) form.append("beforeId", params.beforeId);
  if (params.afterId) form.append("afterId", params.afterId);

  const res = await fetch("/api/studio/media", { method: "POST", body: form });
  const data = (await res.json()) as { item?: MediaItem; error?: string };
  if (!res.ok || !data.item) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.item;
}

async function migrateLegacyMedia(): Promise<void> {
  if (typeof window === "undefined") return;

  const legacy = await listLegacyMedia();
  if (legacy.length === 0) {
    localStorage.setItem(SYNC_FLAG, "done");
    return;
  }

  const syncedRaw = localStorage.getItem(SYNC_FLAG);
  const syncedIds = new Set<string>();
  if (syncedRaw) {
    try {
      const parsed = JSON.parse(syncedRaw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (typeof id === "string") syncedIds.add(id);
        });
      }
    } catch {
      if (syncedRaw === "done") {
        legacy.forEach((item) => syncedIds.add(item.id));
      }
    }
  }

  let changed = false;
  for (const item of legacy) {
    if (!item.dataUrl || syncedIds.has(item.id)) continue;
    try {
      const blob = await fetch(item.dataUrl).then((r) => r.blob());
      await uploadBlob({
        blob,
        id: item.id,
        name: item.name,
        kind: item.kind,
        enhancementPrompt: item.enhancementPrompt,
        sourceId: item.sourceId,
        beforeId: item.beforeId,
        afterId: item.afterId,
      });
      syncedIds.add(item.id);
      changed = true;
    } catch {
      /* retry on next visit */
    }
  }

  if (changed || legacy.every((item) => syncedIds.has(item.id))) {
    localStorage.setItem(SYNC_FLAG, JSON.stringify([...syncedIds]));
  }
}

export async function listMedia(): Promise<MediaItem[]> {
  await migrateLegacyMedia();

  const res = await fetch("/api/studio/media", { cache: "no-store" });
  const data = (await res.json()) as {
    items?: MediaItem[];
    error?: string;
    storage?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Could not load media library");
  }

  return (data.items ?? []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createMediaFromFile(file: File, name?: string): Promise<MediaItem> {
  const { blob } = await compressImageFile(file);
  return uploadBlob({
    blob,
    name: name?.trim() || file.name.replace(/\.[^.]+$/, "") || "Photo",
    kind: "photo",
  });
}

export async function saveMedia(item: Omit<MediaItem, "url"> & { url?: string; dataUrl?: string }): Promise<MediaItem> {
  if (item.dataUrl) {
    const blob = await fetch(item.dataUrl).then((r) => r.blob());
    return uploadBlob({
      blob,
      id: item.id,
      name: item.name,
      kind: item.kind,
      enhancementPrompt: item.enhancementPrompt,
      sourceId: item.sourceId,
      beforeId: item.beforeId,
      afterId: item.afterId,
    });
  }

  throw new Error("saveMedia requires image data");
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`/api/studio/media/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Delete failed");
  }
}

/** Resolve image bytes for enhancement or publish flows. */
export async function resolveMediaDataUrl(item: MediaItem): Promise<string> {
  if (item.dataUrl) return item.dataUrl;
  const blob = await fetch(item.url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Could not load photo from library");
    return r.blob();
  });
  return blobToDataUrl(blob);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl, { credentials: "include" });
  if (!res.ok) throw new Error("Could not load image for publishing");
  return res.blob();
}

const HISTORY_KEY = "peeling-studio-history";

export interface LocalHistoryItem {
  id: string;
  title: string;
  caption: string;
  tags: string[];
  language: "en" | "fr";
  format: "post" | "story";
  cta?: string;
  imageDataUrl: string;
  createdAt: number;
  favorite?: boolean;
}

export function loadHistory(): LocalHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: LocalHistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 40)));
}

export async function saveDataUrlToLibrary(params: {
  dataUrl: string;
  name: string;
  kind?: MediaKind;
  beforeId?: string;
  afterId?: string;
  sourceId?: string;
  enhancementPrompt?: string;
}): Promise<MediaItem> {
  const blob = await dataUrlToBlob(params.dataUrl);
  return uploadBlob({
    blob,
    name: params.name,
    kind: params.kind ?? "photo",
    beforeId: params.beforeId,
    afterId: params.afterId,
    sourceId: params.sourceId,
    enhancementPrompt: params.enhancementPrompt,
  });
}
