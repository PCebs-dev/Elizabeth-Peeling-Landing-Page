import fs from "fs";
import path from "path";
import type { SavedStudioAd } from "./saved-types";

const DIR = () => {
  // Vercel serverless FS is read-only except /tmp (ephemeral).
  if (process.env.VERCEL) {
    return path.join("/tmp", "studio", "saved-ads");
  }
  return path.join(process.cwd(), "data", "studio", "saved-ads");
};

function ensureDir(): void {
  const dir = DIR();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    /* read-only or unavailable — callers must tolerate empty lists */
  }
}

function adPath(id: string): string {
  return path.join(DIR(), `${id}.json`);
}

export function listSavedAds(): SavedStudioAd[] {
  try {
    ensureDir();
    if (!fs.existsSync(DIR())) return [];
    const files = fs
      .readdirSync(DIR())
      .filter((f) => f.endsWith(".json") && f !== "index.json");
    const ads: SavedStudioAd[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(DIR(), file), "utf8");
        const ad = JSON.parse(raw) as SavedStudioAd;
        if (ad?.id && ad.status !== "discarded") ads.push(ad);
      } catch {
        /* skip corrupt */
      }
    }
    return ads.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function getSavedAd(id: string): SavedStudioAd | null {
  const file = adPath(id);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as SavedStudioAd;
  } catch {
    return null;
  }
}

export function saveAd(ad: SavedStudioAd): SavedStudioAd {
  try {
    ensureDir();
    fs.writeFileSync(adPath(ad.id), JSON.stringify(ad, null, 2), "utf8");
  } catch (err) {
    // On Vercel, /tmp write can still fail under disk pressure — client IndexedDB
    // persists the ad from the calendar API response.
    console.warn(
      "[saved-ads] persist failed:",
      err instanceof Error ? err.message : err
    );
  }
  void import("./saved-ads-cloud").then((mod) =>
    mod.persistSavedAdCloud(ad).catch(() => undefined)
  );
  return ad;
}

export function updateSavedAd(
  id: string,
  patch: Partial<SavedStudioAd>
): SavedStudioAd | null {
  const existing = getSavedAd(id);
  if (!existing) return null;
  const next = { ...existing, ...patch, id: existing.id };
  return saveAd(next);
}

export function discardSavedAd(id: string): boolean {
  const existing = getSavedAd(id);
  if (existing) {
    try {
      ensureDir();
      fs.writeFileSync(
        adPath(existing.id),
        JSON.stringify({ ...existing, status: "discarded" }, null, 2),
        "utf8"
      );
    } catch {
      /* /tmp may be unavailable — cloud delete still removes the proposal */
    }
  }
  void import("./saved-ads-cloud").then((mod) =>
    mod.deleteSavedAdCloud(id).catch(() => undefined)
  );
  return true;
}

export function findSavedByCalendarPost(
  calendarPostId: string,
  scheduledDate: string
): SavedStudioAd | null {
  return (
    findSavedAdsByCalendarPost(calendarPostId, scheduledDate)[0] ?? null
  );
}

export function findSavedAdsByCalendarPost(
  calendarPostId: string,
  scheduledDate: string
): SavedStudioAd[] {
  return listSavedAds().filter(
    (a) =>
      a.calendarPostId === calendarPostId && a.scheduledDate === scheduledDate
  );
}

/** Public list payload without huge base64 (use image URL instead) */
export function toSavedAdSummary(ad: SavedStudioAd) {
  const { imageBase64: _omit, imageFrBase64: _omitFr, ...rest } = ad;
  return {
    ...rest,
    hasImage: Boolean(ad.imageBase64),
    hasImageFr: Boolean(ad.imageFrBase64),
    imageUrl: `/api/studio/saved-ads/${ad.id}/image`,
    imageFrUrl: ad.imageFrBase64
      ? `/api/studio/saved-ads/${ad.id}/image?lang=fr`
      : undefined,
  };
}
