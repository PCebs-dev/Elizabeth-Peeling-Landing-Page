"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaItem } from "@/lib/studio/media-store";
import { listMedia } from "@/lib/studio/media-store";
import { MediaLibrary } from "./MediaLibrary";
import { BeforeAfterPanel } from "./BeforeAfterPanel";
import { PublishPanel } from "./PublishPanel";
import { HistoryPanel } from "./HistoryPanel";

export function StudioApp() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeCreative, setActiveCreative] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const refreshMedia = useCallback(async () => {
    const next = await listMedia();
    setItems(next);
    if (!activeCreative && next[0]) setActiveCreative(next[0].dataUrl);
  }, [activeCreative]);

  useEffect(() => {
    void refreshMedia();
  }, [refreshMedia]);

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
        <MediaLibrary
          items={items}
          onChange={() => void refreshMedia()}
          selectionMode
          selectedIds={
            activeCreative
              ? items.filter((i) => i.dataUrl === activeCreative).map((i) => i.id)
              : []
          }
          onToggleSelect={(id) => {
            const item = items.find((i) => i.id === id);
            if (item) setActiveCreative(item.dataUrl);
          }}
        />

        <BeforeAfterPanel
          items={items}
          onChange={() => void refreshMedia()}
          onMerged={(item) => setActiveCreative(item.dataUrl)}
        />

        <PublishPanel
          imageDataUrl={activeCreative}
          onPublished={() => setHistoryKey((k) => k + 1)}
        />

        <HistoryPanel
          refreshKey={historyKey}
          onSelect={(item) => setActiveCreative(item.imageDataUrl)}
        />
      </div>
    </div>
  );
}
