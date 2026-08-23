import type { StudioPhoto } from "./types";
import { addPhoto, getPhoto } from "./photos";

async function blobForUpload(photo: StudioPhoto): Promise<Blob> {
  if (!photo.mimeType.startsWith("image/") || photo.blob.size < 3_400_000) {
    return photo.blob;
  }
  try {
    const bitmap = await createImageBitmap(photo.blob);
    const max = 1920;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return photo.blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    return compressed && compressed.size > 0 ? compressed : photo.blob;
  } catch {
    return photo.blob;
  }
}

async function photoToForm(photo: StudioPhoto): Promise<FormData> {
  const file = await blobForUpload(photo);
  const form = new FormData();
  form.append("id", photo.id);
  form.append("file", file, photo.name || "media");
  form.append("categoryId", photo.categoryId);
  form.append("name", photo.name);
  form.append("note", photo.note || "");
  form.append("createdAt", String(photo.createdAt));
  form.append("source", photo.source || "upload");
  if (photo.promptSummary) form.append("promptSummary", photo.promptSummary);
  if (photo.galleryHidden) form.append("galleryHidden", "true");
  if (photo.linkedFrPhotoId) form.append("linkedFrPhotoId", photo.linkedFrPhotoId);
  if (photo.pairOfPhotoId) form.append("pairOfPhotoId", photo.pairOfPhotoId);
  if (photo.hasOnImageText) form.append("hasOnImageText", "true");
  if (photo.enhancedFromId) form.append("enhancedFromId", photo.enhancedFromId);
  return form;
}

export async function persistPhotoToCloud(photo: StudioPhoto): Promise<void> {
  try {
    const res = await fetch("/api/studio/library", {
      method: "POST",
      body: await photoToForm(photo),
    });
    if (res.status === 503) return;
    if (!res.ok) {
      console.warn("[library] cloud save failed", await res.text());
    }
  } catch {
    /* offline — IndexedDB still has the file */
  }
}

export async function persistPhotoMetaToCloud(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/studio/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
  } catch {
    /* ignore */
  }
}

export async function removePhotoFromCloud(id: string): Promise<void> {
  try {
    await fetch(`/api/studio/library?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {
    /* ignore */
  }
}

export async function syncLocalPhotosToCloud(
  photos: StudioPhoto[]
): Promise<boolean> {
  try {
    const res = await fetch("/api/studio/library", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      enabled?: boolean;
      items?: { id: string }[];
    };
    if (!data.enabled) return false;
    const remote = new Set((data.items ?? []).map((item) => item.id));
    for (const photo of photos) {
      if (!remote.has(photo.id)) {
        await persistPhotoToCloud(photo);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function hydratePhotosFromCloud(): Promise<number> {
  try {
    const res = await fetch("/api/studio/library", { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      enabled?: boolean;
      items?: {
        id: string;
        categoryId: StudioPhoto["categoryId"];
        name: string;
        mimeType: string;
        note: string;
        createdAt: number;
        source: StudioPhoto["source"];
        promptSummary?: string;
        galleryHidden?: boolean;
        linkedFrPhotoId?: string;
        pairOfPhotoId?: string;
        hasOnImageText?: boolean;
        enhancedFromId?: string;
        fileUrl: string;
      }[];
    };
    if (!data.enabled || !data.items?.length) return 0;

    let added = 0;
    for (const item of data.items) {
      const existing = await getPhoto(item.id);
      if (existing) continue;
      const fileRes = await fetch(item.fileUrl, { cache: "no-store" });
      if (!fileRes.ok) continue;
      const blob = await fileRes.blob();
      await addPhoto({
        id: item.id,
        categoryId: item.categoryId,
        file: blob,
        name: item.name,
        note: item.note,
        source: item.source,
        promptSummary: item.promptSummary,
        galleryHidden: item.galleryHidden,
        linkedFrPhotoId: item.linkedFrPhotoId,
        pairOfPhotoId: item.pairOfPhotoId,
        hasOnImageText: item.hasOnImageText,
        enhancedFromId: item.enhancedFromId,
        createdAt: item.createdAt,
        skipCloud: true,
      });
      added += 1;
    }
    return added;
  } catch {
    return 0;
  }
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    /* Safari may deny */
  }
}
