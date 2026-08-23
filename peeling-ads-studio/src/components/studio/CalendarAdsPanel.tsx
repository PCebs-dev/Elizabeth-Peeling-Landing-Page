"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SavedAdsRail,
  type SavedAdListItem,
} from "@/components/studio/SavedAdsRail";
import {
  discardLocalSavedAd,
  getLocalSavedAd,
  listLocalSavedAds,
  localSavedAdToListItem,
  putLocalSavedAds,
  updateLocalSavedFavorite,
} from "@/lib/studio/saved-ads-local";
import type { SavedStudioAd } from "@/lib/studio/saved-types";

interface CalendarAdsPanelProps {
  onSelectImage: (dataUrl: string, caption?: string) => void;
}

export function CalendarAdsPanel({ onSelectImage }: CalendarAdsPanelProps) {
  const [ads, setAds] = useState<SavedAdListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    let serverAds: SavedAdListItem[] = [];
    try {
      const res = await fetch("/api/studio/saved-ads");
      if (res.ok) {
        const data = (await res.json()) as { ads?: SavedAdListItem[] };
        serverAds = data.ads ?? [];
      }
    } catch {
      /* server FS is ephemeral on Vercel */
    }
    let localAds: SavedAdListItem[] = [];
    try {
      localAds = (await listLocalSavedAds()).map(localSavedAdToListItem);
    } catch {
      /* IndexedDB optional */
    }
    const byId = new Map<string, SavedAdListItem>();
    for (const ad of serverAds) byId.set(ad.id, ad);
    for (const ad of localAds) byId.set(ad.id, { ...byId.get(ad.id), ...ad });
    setAds([...byId.values()].sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runCalendar(options?: {
    force?: boolean;
    calendarPostId?: string;
    replaceAdId?: string;
  }) {
    setRunning(true);
    if (options?.replaceAdId) setRerunningId(options.replaceAdId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/studio/calendar/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force: options?.force === true,
          calendarPostId: options?.calendarPostId,
          savedAdId: options?.replaceAdId,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        generatedCount?: number;
        skippedCount?: number;
        generated?: { id: string }[];
        generatedFull?: SavedStudioAd[];
      };
      if (!res.ok) {
        setError(data.error || "Calendar run failed");
        return;
      }
      if (data.generatedFull?.length) {
        await putLocalSavedAds(data.generatedFull).catch(() => undefined);
      }
      setMessage(
        data.message ||
          `Generated ${data.generatedCount ?? 0} ad(s); skipped ${data.skippedCount ?? 0}. Nothing was posted.`
      );
      await refresh();
      const nextId = data.generated?.[0]?.id || data.generatedFull?.[0]?.id;
      if (nextId) await selectAd(nextId);
    } catch {
      setError("Calendar run failed — network error");
    } finally {
      setRunning(false);
      setRerunningId(null);
    }
  }

  async function selectAd(id: string) {
    setActiveId(id);
    const local = await getLocalSavedAd(id).catch(() => null);
    if (local?.imageBase64) {
      onSelectImage(
        `data:${local.imageMimeType || "image/png"};base64,${local.imageBase64}`,
        local.caption
      );
      return;
    }
    const listed = ads.find((a) => a.id === id);
    if (listed?.imageUrl?.startsWith("data:")) {
      onSelectImage(listed.imageUrl);
      return;
    }
    const imgRes = await fetch(`/api/studio/saved-ads/${id}/image`);
    if (!imgRes.ok) {
      setError("Could not load saved ad image");
      return;
    }
    const blob = await imgRes.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    onSelectImage(dataUrl);
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-[rgb(var(--brand-50))] px-4 py-3 text-sm text-[rgb(var(--brand-800))]">
          {message}
        </p>
      ) : null}
      <SavedAdsRail
        ads={ads}
        activeId={activeId}
        running={running}
        rerunningId={rerunningId}
        onSelect={(id) => void selectAd(id)}
        onFavorite={(id) => {
          const current = ads.find((a) => a.id === id);
          const nextFav = !current?.favorite;
          setAds((prev) =>
            prev.map((a) => (a.id === id ? { ...a, favorite: nextFav } : a))
          );
          void updateLocalSavedFavorite(id, nextFav);
          void fetch("/api/studio/saved-ads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, favorite: nextFav }),
          });
        }}
        onDiscard={(id) => {
          void discardLocalSavedAd(id);
          void fetch(`/api/studio/saved-ads?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          setAds((prev) => prev.filter((a) => a.id !== id));
          if (activeId === id) setActiveId(null);
        }}
        onRunToday={() => void runCalendar()}
        onRerunToday={() => void runCalendar({ force: true })}
        onRerunAd={(ad) =>
          void runCalendar({
            force: true,
            calendarPostId: ad.calendarPostId,
            replaceAdId: ad.id,
          })
        }
      />
    </div>
  );
}
