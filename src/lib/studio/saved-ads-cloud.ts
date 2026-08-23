import { del, list, put } from "@vercel/blob";
import type { SavedStudioAd } from "./saved-types";
import { hasBlobStorage } from "./library-store";

const PREFIX = "studio/ads/";

function adPath(id: string): string {
  return `${PREFIX}${id.replace(/[^a-zA-Z0-9_-]/g, "")}.json`;
}

export async function persistSavedAdCloud(ad: SavedStudioAd): Promise<void> {
  if (!hasBlobStorage()) return;
  await put(adPath(ad.id), JSON.stringify(ad), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deleteSavedAdCloud(id: string): Promise<void> {
  if (!hasBlobStorage()) return;
  try {
    await del(adPath(id));
  } catch {
    /* already gone */
  }
}

export async function fetchSavedAdCloud(
  id: string
): Promise<SavedStudioAd | null> {
  if (!hasBlobStorage()) return null;
  const { blobs } = await list({ prefix: adPath(id), limit: 5 });
  const blob = blobs.find((b) => b.pathname === adPath(id));
  if (!blob) return null;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as SavedStudioAd;
  } catch {
    return null;
  }
}

export async function fetchSavedAdsCloud(): Promise<SavedStudioAd[]> {
  if (!hasBlobStorage()) return [];
  const { blobs } = await list({ prefix: PREFIX, limit: 500 });
  const ads: SavedStudioAd[] = [];
  for (const blob of blobs) {
    if (!blob.pathname.endsWith(".json")) continue;
    try {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) continue;
      const ad = (await res.json()) as SavedStudioAd;
      if (ad?.id && ad.status !== "discarded") ads.push(ad);
    } catch {
      /* skip */
    }
  }
  return ads;
}

export function mergeSavedAds(
  local: SavedStudioAd[],
  remote: SavedStudioAd[]
): SavedStudioAd[] {
  const byId = new Map<string, SavedStudioAd>();
  for (const ad of remote) byId.set(ad.id, ad);
  for (const ad of local) {
    const existing = byId.get(ad.id);
    if (!existing || ad.createdAt >= existing.createdAt) byId.set(ad.id, ad);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
