/**
 * Client-side persistence for calendar ads on Vercel (server FS is ephemeral).
 */

import type { SavedStudioAd } from "./saved-types";

const DB_NAME = "elizabeth-ads-studio-saved";
const DB_VERSION = 1;
const STORE = "saved-ads";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("scheduledDate", "scheduledDate", { unique: false });
      }
    };
  });
}

export async function putLocalSavedAds(ads: SavedStudioAd[]): Promise<void> {
  if (!ads.length || typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (const ad of ads) {
      if (ad.status === "discarded") {
        tx.objectStore(STORE).delete(ad.id);
      } else {
        tx.objectStore(STORE).put(ad);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("put saved ads failed"));
  });
}

export async function listLocalSavedAds(): Promise<SavedStudioAd[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onerror = () => reject(req.error ?? new Error("list saved ads failed"));
    req.onsuccess = () => {
      const rows = (req.result as SavedStudioAd[]).filter(
        (a) => a?.id && a.status !== "discarded"
      );
      resolve(rows.sort((a, b) => b.createdAt - a.createdAt));
    };
  });
}

export async function getLocalSavedAd(
  id: string
): Promise<SavedStudioAd | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onerror = () => reject(req.error ?? new Error("get saved ad failed"));
    req.onsuccess = () => {
      const ad = req.result as SavedStudioAd | undefined;
      resolve(ad && ad.status !== "discarded" ? ad : null);
    };
  });
}

export async function discardLocalSavedAd(id: string): Promise<void> {
  const existing = await getLocalSavedAd(id);
  if (!existing) return;
  await putLocalSavedAds([{ ...existing, status: "discarded" }]);
}

export async function updateLocalSavedFavorite(
  id: string,
  favorite: boolean
): Promise<void> {
  const existing = await getLocalSavedAd(id);
  if (!existing) return;
  await putLocalSavedAds([{ ...existing, favorite }]);
}

export function localSavedAdToListItem(ad: SavedStudioAd) {
  const enUrl = ad.imageBase64
    ? `data:${ad.imageMimeType || "image/png"};base64,${ad.imageBase64}`
    : undefined;
  const frUrl = ad.imageFrBase64
    ? `data:${ad.imageFrMimeType || "image/png"};base64,${ad.imageFrBase64}`
    : undefined;
  return {
    id: ad.id,
    source: ad.source,
    status: ad.status,
    calendarPostId: ad.calendarPostId,
    scheduledDate: ad.scheduledDate,
    platforms: ad.platforms,
    format: ad.format,
    pillar: ad.pillar,
    categoryId: ad.categoryId,
    channel: ad.channel,
    language: ad.language,
    angle: ad.angle,
    headline: ad.headline,
    createdAt: ad.createdAt,
    favorite: ad.favorite,
    hasImage: Boolean(ad.imageBase64),
    hasImageFr: Boolean(ad.imageFrBase64),
    imageUrl: enUrl,
    imageFrUrl: frUrl,
    publish: ad.publish,
  };
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "image/png" });
}
