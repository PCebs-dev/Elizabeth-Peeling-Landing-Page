export type MediaKind = "photo" | "before-after";

export interface MediaItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  updatedAt: number;
  kind: MediaKind;
  enhancementPrompt?: string;
  sourceId?: string;
  beforeId?: string;
  afterId?: string;
}

const DB_NAME = "peeling-studio-media";
const STORE = "media";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("Failed to open media DB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

export async function listMedia(): Promise<MediaItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => {
      resolve((req.result as MediaItem[]).sort((a, b) => b.createdAt - a.createdAt));
    };
    req.onerror = () => reject(req.error ?? new Error("Failed to list media"));
  });
}

export async function saveMedia(item: MediaItem): Promise<MediaItem> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save media"));
  });
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete media"));
  });
}

export function newMediaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export async function createMediaFromFile(file: File, name?: string): Promise<MediaItem> {
  const dataUrl = await fileToDataUrl(file);
  const now = Date.now();
  return saveMedia({
    id: newMediaId(),
    name: name?.trim() || file.name.replace(/\.[^.]+$/, "") || "Photo",
    dataUrl,
    createdAt: now,
    updatedAt: now,
    kind: "photo",
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
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
