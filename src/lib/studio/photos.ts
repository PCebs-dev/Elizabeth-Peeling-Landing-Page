import type {
  PhotoSource,
  StudioCategoryId,
  StudioMediaKind,
  StudioPhoto,
} from "./types";
import { mediaKindFromMime } from "./types";

const DB_NAME = "elizabeth-ads-studio";
const DB_VERSION = 4;
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("categoryId", "categoryId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

interface StoredPhoto {
  id: string;
  categoryId: StudioCategoryId;
  name: string;
  mimeType: string;
  mediaKind?: StudioMediaKind;
  blob: Blob;
  note: string;
  createdAt: number;
  source?: PhotoSource;
  promptSummary?: string;
  galleryHidden?: boolean;
  linkedFrPhotoId?: string;
  pairOfPhotoId?: string;
  hasOnImageText?: boolean;
}

function toStudioPhoto(stored: StoredPhoto): StudioPhoto {
  const mimeType = stored.mimeType || "image/png";
  return {
    id: stored.id,
    categoryId: stored.categoryId,
    name: stored.name,
    mimeType,
    mediaKind: stored.mediaKind || mediaKindFromMime(mimeType),
    blob: stored.blob,
    note: stored.note,
    createdAt: stored.createdAt,
    source: stored.source ?? "upload",
    promptSummary: stored.promptSummary,
    galleryHidden: stored.galleryHidden,
    linkedFrPhotoId: stored.linkedFrPhotoId,
    pairOfPhotoId: stored.pairOfPhotoId,
    hasOnImageText: stored.hasOnImageText,
    previewUrl: URL.createObjectURL(stored.blob),
  };
}

export async function listPhotos(): Promise<StudioPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onerror = () => reject(req.error ?? new Error("list failed"));
    req.onsuccess = () => {
      const rows = (req.result as StoredPhoto[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(rows.map(toStudioPhoto));
    };
  });
}

/** Photos shown in the library (excludes hidden FR twins). */
export async function listGalleryPhotos(): Promise<StudioPhoto[]> {
  const all = await listPhotos();
  return all.filter((p) => !p.galleryHidden);
}

export async function getPhoto(id: string): Promise<StudioPhoto | null> {
  const db = await openDb();
  const stored = await new Promise<StoredPhoto | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onerror = () => reject(req.error ?? new Error("get failed"));
    req.onsuccess = () => resolve(req.result as StoredPhoto | undefined);
  });
  return stored ? toStudioPhoto(stored) : null;
}

export async function addPhoto(input: {
  categoryId: StudioCategoryId;
  file: File | Blob;
  name?: string;
  note?: string;
  source?: PhotoSource;
  promptSummary?: string;
  galleryHidden?: boolean;
  linkedFrPhotoId?: string;
  pairOfPhotoId?: string;
  hasOnImageText?: boolean;
  id?: string;
}): Promise<StudioPhoto> {
  const mimeType =
    input.file instanceof File
      ? input.file.type || "image/jpeg"
      : input.file.type || "image/png";
  const name =
    input.name ||
    (input.file instanceof File ? input.file.name : `ai-${Date.now()}.png`);

  const stored: StoredPhoto = {
    id: input.id || crypto.randomUUID(),
    categoryId: input.categoryId,
    name,
    mimeType,
    mediaKind: mediaKindFromMime(mimeType),
    blob: input.file,
    note: input.note?.trim() ?? "",
    createdAt: Date.now(),
    source: input.source ?? "upload",
    promptSummary: input.promptSummary,
    galleryHidden: input.galleryHidden,
    linkedFrPhotoId: input.linkedFrPhotoId,
    pairOfPhotoId: input.pairOfPhotoId,
    hasOnImageText: input.hasOnImageText,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("add failed"));
  });
  return toStudioPhoto(stored);
}

export async function addPhotoFromBase64(input: {
  categoryId: StudioCategoryId;
  base64: string;
  mimeType?: string;
  name?: string;
  note?: string;
  promptSummary?: string;
  galleryHidden?: boolean;
  linkedFrPhotoId?: string;
  pairOfPhotoId?: string;
  hasOnImageText?: boolean;
  id?: string;
}): Promise<StudioPhoto> {
  const mimeType = input.mimeType || "image/png";
  const binary = atob(input.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return addPhoto({
    categoryId: input.categoryId,
    file: blob,
    name: input.name ?? `ai-${input.categoryId}-${Date.now()}.png`,
    note: input.note,
    source: "ai",
    promptSummary: input.promptSummary,
    galleryHidden: input.galleryHidden,
    linkedFrPhotoId: input.linkedFrPhotoId,
    pairOfPhotoId: input.pairOfPhotoId,
    hasOnImageText: input.hasOnImageText,
    id: input.id,
  });
}

async function patchPhoto(
  id: string,
  patch: Partial<StoredPhoto>
): Promise<void> {
  const db = await openDb();
  const existing = await new Promise<StoredPhoto | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onerror = () => reject(req.error ?? new Error("get failed"));
      req.onsuccess = () => resolve(req.result as StoredPhoto | undefined);
    }
  );
  if (!existing) return;
  Object.assign(existing, patch);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(existing);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("update failed"));
  });
}

export async function linkFrTwin(
  enPhotoId: string,
  frPhotoId: string
): Promise<void> {
  await patchPhoto(enPhotoId, { linkedFrPhotoId: frPhotoId });
  await patchPhoto(frPhotoId, {
    galleryHidden: true,
    pairOfPhotoId: enPhotoId,
  });
}

export async function updatePhotoNote(
  id: string,
  note: string
): Promise<void> {
  await patchPhoto(id, { note });
}

export async function updatePhotoCategory(
  id: string,
  categoryId: StudioCategoryId
): Promise<void> {
  await patchPhoto(id, { categoryId });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  const existing = await new Promise<StoredPhoto | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onerror = () => reject(req.error ?? new Error("get failed"));
      req.onsuccess = () => resolve(req.result as StoredPhoto | undefined);
    }
  );

  const toDelete = new Set<string>([id]);
  if (existing?.linkedFrPhotoId) {
    toDelete.add(existing.linkedFrPhotoId);
  }

  if (existing?.pairOfPhotoId) {
    await patchPhoto(existing.pairOfPhotoId, { linkedFrPhotoId: undefined });
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const photoId of toDelete) {
      tx.objectStore(STORE).delete(photoId);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("delete failed"));
  });
}

export function revokePreviewUrls(photos: StudioPhoto[]): void {
  for (const p of photos) {
    if (p.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(p.previewUrl);
    }
  }
}
