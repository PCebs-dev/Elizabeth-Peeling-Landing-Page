"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaItem } from "@/lib/studio/media-store";
import { getMediaDisplayUrl, listMedia } from "@/lib/studio/media-store";
import { MediaLibrary } from "./MediaLibrary";
import { BeforeAfterPanel } from "./BeforeAfterPanel";
import { PublishPanel } from "./PublishPanel";
import { HistoryPanel } from "./HistoryPanel";

export function StudioApp() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeCreativeId, setActiveCreativeId] = useState<string | null>(null);
  const [activeCreativeOverride, setActiveCreativeOverride] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [adSession, setAdSession] = useState(0);

  const refreshMedia = useCallback(async () => {
    setLoadingMedia(true);
    setMediaError(null);
    try {
      const next = await listMedia();
      setItems(next);
      setActiveCreativeId((current) => {
        if (current && !next.some((item) => item.id === current)) return next[0]?.id ?? null;
        if (!current && next[0]) return next[0].id;
        return current;
      });
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Could not load media library");
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    void refreshMedia();
  }, [refreshMedia]);

  const activeItem = items.find((item) => item.id === activeCreativeId);
  const activeCreative =
    activeCreativeOverride ?? (activeItem ? getMediaDisplayUrl(activeItem) : null);

  function selectCreative(id: string | null) {
    setActiveCreativeId(id);
    setActiveCreativeOverride(null);
  }

  function startAgain() {
    setActiveCreativeId(items[0]?.id ?? null);
    setActiveCreativeOverride(null);
    setAdSession((session) => session + 1);
  }

  async function signOut() {
    await fetch("/api/studio/auth", { method: "DELETE" });
    router.replace("/studio/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgb(var(--brand-600))]">
            Private
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-[rgb(var(--brand-900))]">
            Ads Studio
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-[rgb(var(--brand-600))] underline"
        >
          Sign out
        </button>
      </header>

      {activeCreative ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-[rgb(var(--brand-200))] bg-white shadow-sm">
          <img
            src={activeCreative}
            alt="Selected creative"
            className="max-h-80 w-full object-cover"
          />
          <p className="px-3 py-2 text-xs text-[rgb(var(--brand-600))]">
            Active creative for publishing — tap a library photo to change.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {mediaError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {mediaError}
          </p>
        ) : null}
        {loadingMedia ? (
          <p className="text-sm text-[rgb(var(--brand-600))]">Loading your media library…</p>
        ) : null}

        <MediaLibrary
          items={items}
          onChange={() => void refreshMedia()}
          selectionMode
          selectedId={activeCreativeId}
          onSelect={selectCreative}
        />

        <BeforeAfterPanel
          items={items}
          onChange={() => void refreshMedia()}
          onMerged={(item) => selectCreative(item.id)}
        />

        <PublishPanel
          key={adSession}
          imageDataUrl={activeCreative}
          onPublished={() => setHistoryKey((k) => k + 1)}
          onStartAgain={startAgain}
        />

        <HistoryPanel
          refreshKey={historyKey}
          onSelect={(item) => {
            const match = items.find(
              (i) =>
                i.dataUrl === item.imageDataUrl ||
                getMediaDisplayUrl(i) === item.imageDataUrl,
            );
            if (match) selectCreative(match.id);
            else {
              setActiveCreativeId(null);
              setActiveCreativeOverride(item.imageDataUrl);
            }
          }}
        />
      </div>
    </div>
  );
}
