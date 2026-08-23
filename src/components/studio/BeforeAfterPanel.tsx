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
  pickTarget?: "before" | "after" | null;
  onPickTargetChange?: (target: "before" | "after" | null) => void;
  beforeId?: string | null;
  afterId?: string | null;
  onBeforeIdChange?: (id: string | null) => void;
  onAfterIdChange?: (id: string | null) => void;
}

export function BeforeAfterPanel({
  items,
  onChange,
  onMerged,
  pickTarget = null,
  onPickTargetChange,
  beforeId: beforeIdProp = null,
  afterId: afterIdProp = null,
  onBeforeIdChange,
  onAfterIdChange,
}: BeforeAfterPanelProps) {
  const [open, setOpen] = useState(false);
  const photos = useMemo(
    () => items.filter((i) => i.kind === "photo" || i.kind === "before-after"),
    [items],
  );
  const [enhanceBefore, setEnhanceBefore] = useState(false);
  const [enhanceAfter, setEnhanceAfter] = useState(false);
  const [beforePrompt, setBeforePrompt] = useState("");
  const [afterPrompt, setAfterPrompt] = useState("");
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beforeId = beforeIdProp;
  const afterId = afterIdProp;
  const beforeItem = photos.find((p) => p.id === beforeId) ?? null;
  const afterItem = photos.find((p) => p.id === afterId) ?? null;
  const hasSelection = beforeId !== null || afterId !== null || previewBefore !== null;

  function setBeforeId(id: string | null) {
    onBeforeIdChange?.(id);
  }

  function setAfterId(id: string | null) {
    onAfterIdChange?.(id);
  }

  function setPickTarget(target: "before" | "after" | null) {
    onPickTargetChange?.(target);
  }

  function clearSide(side: "before" | "after") {
    if (side === "before") {
      setBeforeId(null);
      setEnhanceBefore(false);
      setBeforePrompt("");
    } else {
      setAfterId(null);
      setEnhanceAfter(false);
      setAfterPrompt("");
    }
    setPreviewBefore(null);
    setPreviewAfter(null);
    setError(null);
    if (pickTarget === side) setPickTarget(null);
  }

  function clearAll() {
    setBeforeId(null);
    setAfterId(null);
    setEnhanceBefore(false);
    setEnhanceAfter(false);
    setBeforePrompt("");
    setAfterPrompt("");
    setPreviewBefore(null);
    setPreviewAfter(null);
    setPickTarget(null);
    setError(null);
  }

  function handleSlotTap(side: "before" | "after") {
    setError(null);
    setPreviewBefore(null);
    setPreviewAfter(null);
    setPickTarget(pickTarget === side ? null : side);
  }

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
      clearAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save merge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--brand-200))] bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h2 className="font-serif text-lg text-[rgb(var(--brand-900))]">Before &amp; after</h2>
          <p className="mt-1 text-sm text-[rgb(var(--brand-600))]">
            Optional — merge two photos when you need a comparison creative.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => {
              if (v) {
                setPickTarget(null);
              }
              return !v;
            });
          }}
          className="shrink-0 rounded-lg border border-[rgb(var(--brand-200))] px-3 py-2 text-xs font-medium text-[rgb(var(--brand-800))]"
        >
          {open ? "Hide" : "Merge photos"}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-[rgb(var(--brand-100))] px-4 pb-4 pt-4">
          <p className="text-sm text-[rgb(var(--brand-600))]">
            Tap the Before or After box, then scroll up to your media library and choose a photo.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {(["before", "after"] as const).map((side) => {
              const selected = side === "before" ? beforeItem : afterItem;
              const selectedId = side === "before" ? beforeId : afterId;
              const enhanceOn = side === "before" ? enhanceBefore : enhanceAfter;
              const setEnhanceOn = side === "before" ? setEnhanceBefore : setEnhanceAfter;
              const prompt = side === "before" ? beforePrompt : afterPrompt;
              const setPrompt = side === "before" ? setBeforePrompt : setAfterPrompt;
              const isPickTarget = pickTarget === side;

              return (
                <div
                  key={side}
                  className={`rounded-xl border p-3 ${
                    isPickTarget
                      ? "border-[rgb(var(--brand-600))] bg-[rgb(var(--brand-50))] ring-2 ring-[rgb(var(--brand-200))]"
                      : "border-[rgb(var(--brand-100))]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-[rgb(var(--brand-800))]">
                      {side}
                    </p>
                    {selected ? (
                      <button
                        type="button"
                        onClick={() => clearSide(side)}
                        className="text-xs font-medium text-[rgb(var(--brand-600))] underline"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSlotTap(side)}
                    className="mt-2 block w-full overflow-hidden rounded-lg text-left"
                    aria-pressed={isPickTarget}
                    aria-label={
                      selected
                        ? `Change ${side} photo — tap then pick from library above`
                        : `Select ${side} photo — tap then pick from library above`
                    }
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-[rgb(var(--brand-100))]">
                      {selected ? (
                        <img
                          src={getMediaDisplayUrl(selected)}
                          alt={`${side} selected`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                          <span className="text-xs font-medium text-[rgb(var(--brand-700))]">
                            Tap to choose
                          </span>
                          <span className="text-[11px] text-[rgb(var(--brand-500))]">
                            then pick from library above
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {isPickTarget ? (
                    <p className="mt-2 text-[11px] font-medium text-[rgb(var(--brand-700))]">
                      Scroll up to the media library and tap a photo.
                    </p>
                  ) : null}

                  <div className="mt-2">
                    <label className="cursor-pointer rounded-lg border border-[rgb(var(--brand-200))] px-2 py-1 text-xs font-medium">
                      Upload new
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(side, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {selected ? (
                    <>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-[rgb(var(--brand-800))]">
                        <input
                          type="checkbox"
                          checked={enhanceOn}
                          onChange={(e) => setEnhanceOn(e.target.checked)}
                          className="h-4 w-4 rounded border-[rgb(var(--brand-300))]"
                        />
                        Enhance {side} photo
                      </label>
                      {enhanceOn ? (
                        <textarea
                          rows={2}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={`Describe how to enhance the ${side} photo. Leave blank for auto-enhance.`}
                          className="mt-2 w-full rounded-lg border border-[rgb(var(--brand-200))] bg-[rgb(var(--brand-50))] px-2 py-1.5 text-xs"
                        />
                      ) : null}
                    </>
                  ) : null}

                  {selectedId && !isPickTarget ? (
                    <p className="mt-2 truncate text-[11px] text-[rgb(var(--brand-500))]">
                      Selected: {selected?.name}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {previewBefore && previewAfter ? (
            <div>
              <ImageCompareSlider beforeSrc={previewBefore} afterSrc={previewAfter} />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
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
              Save merge to library
            </button>
            {hasSelection || pickTarget ? (
              <button
                type="button"
                disabled={busy}
                onClick={clearAll}
                className="min-h-10 rounded-lg px-4 py-2 text-sm font-medium text-[rgb(var(--brand-600))] underline disabled:opacity-60"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
