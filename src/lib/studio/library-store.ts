import { del, list, put } from "@vercel/blob";
import type { PhotoSource, StudioCategoryId, StudioMediaKind } from "./types";

const INDEX_PATH = "studio/library/index.json";
const FILE_PREFIX = "studio/library/files/";

export type CloudPhotoMeta = {
  id: string;
  categoryId: StudioCategoryId;
  name: string;
  mimeType: string;
  mediaKind: StudioMediaKind;
  note: string;
  createdAt: number;
  source: PhotoSource;
  promptSummary?: string;
  galleryHidden?: boolean;
  linkedFrPhotoId?: string;
  pairOfPhotoId?: string;
  hasOnImageText?: boolean;
  enhancedFromId?: string;
  fileUrl: string;
};

export function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function readIndex(): Promise<CloudPhotoMeta[]> {
  if (!hasBlobStorage()) return [];
  const { blobs } = await list({ prefix: INDEX_PATH, limit: 20 });
  const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
  if (!indexBlob) return [];
  const res = await fetch(indexBlob.url, { cache: "no-store" });
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as CloudPhotoMeta[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeIndex(items: CloudPhotoMeta[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(items), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function listCloudPhotos(): Promise<CloudPhotoMeta[]> {
  if (!hasBlobStorage()) return [];
  return (await readIndex()).sort((a, b) => b.createdAt - a.createdAt);
}

function filePath(id: string, mimeType: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = mimeType.includes("video")
    ? "mp4"
    : mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
        ? "webp"
        : "jpg";
  return `${FILE_PREFIX}${safe}.${ext}`;
}

export async function saveCloudPhoto(params: {
  meta: Omit<CloudPhotoMeta, "fileUrl">;
  bytes: Uint8Array;
}): Promise<CloudPhotoMeta> {
  if (!hasBlobStorage()) {
    throw new Error("Cloud storage is not configured");
  }
  const pathname = filePath(params.meta.id, params.meta.mimeType);
  const uploaded = await put(pathname, Buffer.from(params.bytes), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: params.meta.mimeType || "application/octet-stream",
  });
  const record: CloudPhotoMeta = { ...params.meta, fileUrl: uploaded.url };
  const index = await readIndex();
  const i = index.findIndex((p) => p.id === record.id);
  if (i >= 0) index[i] = record;
  else index.unshift(record);
  await writeIndex(index);
  return record;
}

export async function patchCloudPhotoMeta(
  id: string,
  patch: Partial<CloudPhotoMeta>
): Promise<CloudPhotoMeta | null> {
  if (!hasBlobStorage()) return null;
  const index = await readIndex();
  const i = index.findIndex((p) => p.id === id);
  if (i < 0) return null;
  index[i] = { ...index[i], ...patch, id: index[i].id, fileUrl: index[i].fileUrl };
  await writeIndex(index);
  return index[i];
}

export async function deleteCloudPhoto(id: string): Promise<boolean> {
  if (!hasBlobStorage()) return false;
  const index = await readIndex();
  const existing = index.find((p) => p.id === id);
  const next = index.filter((p) => p.id !== id && p.pairOfPhotoId !== id);
  const twins = index.filter((p) => p.pairOfPhotoId === id || p.linkedFrPhotoId === id);
  if (!existing && twins.length === 0) return false;

  const toRemove = [existing, ...twins].filter(Boolean);
  for (const item of toRemove) {
    if (!item) continue;
    try {
      await del(item.fileUrl);
    } catch {
      /* already gone */
    }
  }
  await writeIndex(next.filter((p) => p.id !== id));
  return true;
}
