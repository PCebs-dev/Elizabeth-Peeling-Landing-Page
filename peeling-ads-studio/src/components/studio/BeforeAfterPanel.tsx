"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/studio/media-store";
import {
  createMediaFromFile,
  getMediaDisplayUrl,
  resolveMediaDataUrl,
  saveDataUrlToLibrary,
} from "@/lib/studio/media-store";
import { enhanceImageDataUrl, mergeBeforeAfterSideBySide } from "@/lib/studio/enhance";
import { ImageCompareSlider } from "./ImageCompareSlider";

interface BeforeAfterPanelProps {
  items: MediaItem[];
  onChange: () => void;
  onMerged?: (item: MediaItem) => void;
}

export function BeforeAfterPanel({ items, onChange, onMerged }: BeforeAfterPanelProps) {
  const photos = useMemo(
    () => items.filter((i) => i.kind === "photo" || i.kind === "before-after"),
    [items],
  );
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [enhanceBefore, setEnhanceBefore] = useState(false);
  const [enhanceAfter, setEnhanceAfter] = useState(false);
  const [beforePrompt, setBeforePrompt] = useState("");
  const [afterPrompt, setAfterPrompt] = useState("");
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickTarget, setPickTarget] = useState<"before" | "after" | null>(null);

  const beforeItem = photos.find((p) => p.id === beforeId) ?? null;
  const afterItem = photos.find((p) => p.id === afterId) ?? null;

  async function handleUpload(target: "before" | "after", file: File) {
    setError(null);
    setPreviewBefore(null);
    setPreviewAfter(null);
    setPickTarget(null);
    const item = await createMediaFromFile(file);
    onChange();
    if (target === "before") setBeforeId(item.id);
    else setAfterId(item.id);
  }

  function selectFromLibrary(id: string) {
    if (pickTarget === "before") setBeforeId(id);
    if (pickTarget === "after") setAfterId(id);
    setPickTarget(null);
    setPreviewBefore(null);
    setPreviewAfter(null);
  }

  async function buildPreview(): Promise<{ before: string; after: string } | null> {
    if (!beforeItem || !afterItem) {
      setError("Choose both a before and an after photo.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      let beforeUrl = await resolveMediaDataUrl(beforeItem);
      let afterUrl = await resolveMediaDataUrl(afterItem);
      if (enhanceBefore) {
        beforeUrl = await enhanceImageDataUrl(beforeUrl, {
          prompt: beforePrompt,
          auto: !beforePrompt.trim(),
        });
      }
      if (enhanceAfter) {
        afterUrl = await enhanceImageDataUrl(afterUrl, {
          prompt: afterPrompt,
          auto: !afterPrompt.trim(),
        });
      }
      setPreviewBefore(beforeUrl);
      setPreviewAfter(afterUrl);
      return { before: beforeUrl, after: afterUrl };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveMerged() {
    setBusy(true);
    setError(null);
    try {
      const preview =
        previewBefore && previewAfter
          ? { before: previewBefore, after: previewAfter }
          : await buildPreview();
      if (!preview) return;

      const mergedUrl = await mergeBeforeAfterSideBySide(preview.before, preview.after);
      const item = await saveDataUrlToLibrary({
        name: "Before / After",
        dataUrl: mergedUrl,
        kind: "before-after",
        beforeId: beforeId ?? undefined,
        afterId: afterId ?? undefined,
      });
      onChange();
      onMerged?.(item);
      setBeforeId(null);
      setAfterId(null);
      setEnhanceBefore(false);
      setEnhanceAfter(false);
      setBeforePrompt("");
      setAfterPrompt("");
      setPreviewBefore(null);
      setPreviewAfter(null);
      setPickTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save merge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white p-4 shadow-sm">
      <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">Before &amp; after</h2>
      <p className="mt-1 text-sm text-[rgb(var(--brand-600))]">
        Select from your library or upload new photos, optionally enhance each side, then preview
        and save.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["before", "after"] as const).map((side) => {
          const selected = side === "before" ? beforeItem : afterItem;
          const enhanceOn = side === "before" ? enhanceBefore : enhanceAfter;
          const setEnhanceOn = side === "before" ? setEnhanceBefore : setEnhanceAfter;
          const prompt = side === "before" ? beforePrompt : afterPrompt;
          const setPrompt = side === "before" ? setBeforePrompt : setAfterPrompt;
          return (
            <div
              key={side}
              className="rounded-xl border border-[rgb(var(--brand-100))] p-3"
            >
              <p className="text-sm font-semibold capitalize text-[rgb(var(--brand-800))]">
                {side}
              </p>
              <div className="mt-2 aspect-square overflow-hidden rounded-lg bg-[rgb(var(--brand-100))]">
                {selected ? (
                  <img
                    src={getMediaDisplayUrl(selected)}
                    alt={`${side} selected`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[rgb(var(--brand-500))]">
                    No photo selected
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[rgb(var(--brand-200))] px-2 py-1 text-xs font-medium"
                  onClick={() => setPickTarget(side)}
                >
                  From library
                </button>
                <label className="cursor-pointer rounded-lg border border-[rgb(var(--brand-200))] px-2 py-1 text-xs font-medium">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(side, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-[rgb(var(--brand-800))]">
                <input
                  type="checkbox"
                  checked={enhanceOn}
                  onChange={(e) => setEnhanceOn(e.target.checked)}
                  className="h-4 w-4 rounded border-[rgb(var(--brand-300))]"
                />
                Digitally enhance {side} photo
              </label>
              {enhanceOn ? (
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe ${side} enhancement…`}
                  className="mt-2 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-xs"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {pickTarget ? (
        <div className="mt-4 rounded-xl border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Pick {pickTarget} photo</p>
            <button type="button" className="text-xs underline" onClick={() => setPickTarget(null)}>
              Cancel
            </button>
          </div>
          {photos.length === 0 ? (
            <p className="mt-2 text-sm text-[rgb(var(--brand-600))]">
              Upload photos to your library first.
            </p>
          ) : (
            <ul className="mt-2 grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => selectFromLibrary(p.id)}>
                    <img
                      src={getMediaDisplayUrl(p)}
                      alt={p.name}
                      className="aspect-square w-full rounded object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {previewBefore && previewAfter ? (
        <div className="mt-4">
          <ImageCompareSlider beforeSrc={previewBefore} afterSrc={previewAfter} />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !beforeItem || !afterItem}
          onClick={() => void buildPreview()}
          className="min-h-10 rounded-lg border border-[rgb(var(--brand-300))] px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Working…" : "Preview comparison"}
        </button>
        <button
          type="button"
          disabled={busy || !beforeItem || !afterItem}
          onClick={() => void saveMerged()}
          className="min-h-10 rounded-lg bg-[rgb(var(--brand-800))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Save to library
        </button>
      </div>
    </section>
  );
}
