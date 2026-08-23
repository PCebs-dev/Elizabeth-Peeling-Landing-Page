import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import type { MediaKind, MediaRecord } from "./media-types";
import { mediaFileUrl } from "./media-types";

const LOCAL_DIR = path.join(process.cwd(), "data", "studio-media");
const LOCAL_INDEX = path.join(LOCAL_DIR, "index.json");
const BLOB_PREFIX = "studio/media";
const INDEX_PATH = `${BLOB_PREFIX}/index.json`;

function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function readLocalIndex(): Promise<MediaRecord[]> {
  try {
    const raw = await readFile(LOCAL_INDEX, "utf8");
    return JSON.parse(raw) as MediaRecord[];
  } catch {
    return [];
  }
}

async function writeLocalIndex(items: MediaRecord[]): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_INDEX, JSON.stringify(items, null, 2), "utf8");
}

async function readBlobIndex(): Promise<MediaRecord[]> {
  const { blobs } = await list({ prefix: INDEX_PATH });
  const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
  if (!indexBlob) return [];
  const result = await get(indexBlob.url, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) return [];
  const text = await new Response(result.stream).text();
  try {
    return JSON.parse(text) as MediaRecord[];
  } catch {
    return [];
  }
}

async function writeBlobIndex(items: MediaRecord[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(items), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function readIndex(): Promise<MediaRecord[]> {
  if (hasBlobStorage()) return readBlobIndex();
  return readLocalIndex();
}

async function writeIndex(items: MediaRecord[]): Promise<void> {
  if (hasBlobStorage()) return writeBlobIndex(items);
  return writeLocalIndex(items);
}

export async function listStoredMedia(): Promise<MediaRecord[]> {
  return (await readIndex()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveStoredMedia(params: {
  id: string;
  name: string;
  kind: MediaKind;
  buffer: Buffer;
  contentType?: string;
  enhancementPrompt?: string;
  sourceId?: string;
  beforeId?: string;
  afterId?: string;
}): Promise<MediaRecord> {
  const now = Date.now();
  const contentType = params.contentType ?? "image/jpeg";
  const imagePath = `${BLOB_PREFIX}/${params.id}.jpg`;

  if (hasBlobStorage()) {
    await put(imagePath, params.buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
  } else {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, `${params.id}.jpg`), params.buffer);
  }

  const record: MediaRecord = {
    id: params.id,
    name: params.name,
    url: mediaFileUrl(params.id),
    createdAt: now,
    updatedAt: now,
    kind: params.kind,
    contentType,
    storage: hasBlobStorage() ? "blob" : "local",
    enhancementPrompt: params.enhancementPrompt,
    sourceId: params.sourceId,
    beforeId: params.beforeId,
    afterId: params.afterId,
  };

  const index = await readIndex();
  const existingIdx = index.findIndex((item) => item.id === params.id);
  if (existingIdx >= 0) index[existingIdx] = record;
  else index.unshift(record);
  await writeIndex(index);
  return record;
}

export async function readStoredMediaFile(
  id: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const index = await readIndex();
  const record = index.find((item) => item.id === id);
  const contentType = record?.contentType ?? "image/jpeg";

  if (hasBlobStorage()) {
    const imagePath = `${BLOB_PREFIX}/${id}.jpg`;
    const { blobs } = await list({ prefix: imagePath });
    const blob = blobs.find((b) => b.pathname === imagePath);
    if (!blob) return null;
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? contentType,
    };
  }

  try {
    const buffer = await readFile(path.join(LOCAL_DIR, `${id}.jpg`));
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function deleteStoredMedia(id: string): Promise<boolean> {
  const index = await readIndex();
  const next = index.filter((item) => item.id !== id);
  if (next.length === index.length) return false;

  if (hasBlobStorage()) {
    const imagePath = `${BLOB_PREFIX}/${id}.jpg`;
    const { blobs } = await list({ prefix: imagePath });
    const blob = blobs.find((b) => b.pathname === imagePath);
    if (blob) await del(blob.url);
  } else {
    await unlink(path.join(LOCAL_DIR, `${id}.jpg`)).catch(() => undefined);
  }

  await writeIndex(next);
  return true;
}

export function mediaStorageMode(): "blob" | "local" {
  return hasBlobStorage() ? "blob" : "local";
}
